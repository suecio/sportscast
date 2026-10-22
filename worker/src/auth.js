// /api for accounts: sign up, log in (password or emailed link), log out, account settings.
//
// A session is a random token in an HttpOnly cookie (website) or an
// "Authorization: Bearer" header (the iPhone app, later). Every answer is JSON, and an
// error is { "error": "<code>" } that the website translates.

import { ensureSchema } from "./db.js";
import { hashPassword, newId, randomToken, sha256, verifyPassword } from "./crypto.js";
import { sendLinkEmail } from "./email.js";

const MINUTE = 60_000;
const LINK_LIFETIME = 15 * MINUTE;
const SESSION_LIFETIME = 30 * 24 * 60 * MINUTE;
const LANGS = ["en", "sv", "es"];
const COOKIE = "sc_session";
// Limits on emailed links, against spam and typing mistakes.
const LINK_WAIT = MINUTE;
const LINKS_PER_EMAIL_PER_HOUR = 5;
const LINKS_PER_IP_PER_HOUR = 20;
// Too many wrong passwords lock password login (not emailed links) for a while.
const MAX_FAILED_LOGINS = 10;
const LOCK_TIME = 15 * MINUTE;

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

const cleanEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "bad_email");
  return email;
};

const checkPassword = (value) => {
  const password = String(value || "");
  if (password.length < 8) throw new ApiError(400, "password_too_short");
  if (password.length > 200) throw new ApiError(400, "password_too_long");
  return password;
};

const cleanLang = (value) => (LANGS.includes(value) ? value : "en");

function sessionCookie(token, maxAgeSeconds) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function readSessionToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

async function createSession(env, userId, device = "web") {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, device, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), userId, device, now + SESSION_LIFETIME, now)
    .run();
  return token;
}

// The website gets the session as a cookie; the app gets the token in the body.
async function loggedIn(env, user, device) {
  const token = await createSession(env, user.id, device);
  if (device === "app") return json({ ok: true, token, user: publicUser(user) });
  return json({ ok: true, user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(token, SESSION_LIFETIME / 1000) });
}

const publicUser = (user) => ({
  email: user.email,
  lang: user.lang,
  hasPassword: Boolean(user.password_hash),
  createdAt: user.created_at,
});

async function currentUser(request, env) {
  const token = readSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT users.*, sessions.token_hash AS session_hash FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"
  )
    .bind(tokenHash, Date.now())
    .first();
  return row || null;
}

async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) throw new ApiError(401, "not_logged_in");
  return user;
}

// --- Handlers -------------------------------------------------------------------

// Sends a link by email. A new email address gets a "choose your password" link, which
// is how signing up works. Always answers ok, so the page can't be used to find out
// which addresses have an account.
async function emailLink(request, env, body) {
  const email = cleanEmail(body.email);
  const lang = cleanLang(body.lang);
  const wanted = body.purpose === "reset" ? "reset" : "login";
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const now = Date.now();

  const ipCount = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE ip = ? AND created_at > ?")
    .bind(ip, now - 60 * MINUTE)
    .first("n");
  if (ipCount >= LINKS_PER_IP_PER_HOUR) throw new ApiError(429, "too_many_emails");

  let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    user = { id: newId(), email, lang, password_hash: null };
    await env.DB.prepare("INSERT INTO users (id, email, lang, created_at) VALUES (?, ?, ?, ?)")
      .bind(user.id, email, lang, now)
      .run();
  }

  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n, MAX(created_at) AS last FROM login_tokens WHERE user_id = ? AND created_at > ?"
  )
    .bind(user.id, now - 60 * MINUTE)
    .first();
  if (recent.last && now - recent.last < LINK_WAIT) throw new ApiError(429, "wait_a_minute");
  if (recent.n >= LINKS_PER_EMAIL_PER_HOUR) throw new ApiError(429, "too_many_emails");

  const purpose = user.password_hash ? wanted : "signup";
  const token = randomToken();
  await env.DB.batch([
    // Old unused links stop working when a new one is sent.
    env.DB.prepare("UPDATE login_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, user.id),
    env.DB.prepare(
      "INSERT INTO login_tokens (token_hash, user_id, purpose, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(await sha256(token), user.id, purpose, ip, now + LINK_LIFETIME, now),
  ]);

  const origin = env.APP_URL || new URL(request.url).origin;
  await sendLinkEmail(env, {
    to: email,
    lang: user.password_hash ? user.lang : lang,
    purpose,
    link: `${origin}/auth?token=${encodeURIComponent(token)}`,
  });
  return json({ ok: true });
}

// The page behind the emailed link. A login link logs in at once. A signup or reset
// link first answers { needPassword: true }, and logs in once a password is sent with it.
async function useLink(request, env, body) {
  const tokenHash = await sha256(String(body.token || ""));
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT login_tokens.purpose, users.* FROM login_tokens JOIN users ON users.id = login_tokens.user_id WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?"
  )
    .bind(tokenHash, now)
    .first();
  if (!row) throw new ApiError(400, "link_expired");

  const updates = [];
  if (row.purpose === "signup" || row.purpose === "reset") {
    if (body.password === undefined) return json({ needPassword: true, purpose: row.purpose, email: row.email });
    row.password_hash = await hashPassword(checkPassword(body.password));
    updates.push(env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(row.password_hash, row.id));
    // A new password logs out every other device.
    updates.push(env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.id));
  }
  updates.push(
    env.DB.prepare("UPDATE login_tokens SET used_at = ? WHERE token_hash = ?").bind(now, tokenHash),
    env.DB.prepare(
      "UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), failed_logins = 0, locked_until = NULL WHERE id = ?"
    ).bind(now, row.id)
  );
  await env.DB.batch(updates);
  return loggedIn(env, row, body.device === "app" ? "app" : "web");
}

async function passwordLogin(request, env, body) {
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const now = Date.now();
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (user && user.locked_until && user.locked_until > now) throw new ApiError(429, "locked");
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    if (user) {
      const failed = user.failed_logins + 1;
      await env.DB.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?")
        .bind(failed >= MAX_FAILED_LOGINS ? 0 : failed, failed >= MAX_FAILED_LOGINS ? now + LOCK_TIME : null, user.id)
        .run();
    }
    throw new ApiError(401, "wrong_login");
  }
  if (user.failed_logins) await env.DB.prepare("UPDATE users SET failed_logins = 0 WHERE id = ?").bind(user.id).run();
  return loggedIn(env, user, body.device === "app" ? "app" : "web");
}

async function logout(request, env) {
  const token = readSessionToken(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function me(request, env) {
  return json({ user: publicUser(await requireUser(request, env)) });
}

async function changePassword(request, env, body) {
  const user = await requireUser(request, env);
  if (!(await verifyPassword(String(body.current || ""), user.password_hash))) throw new ApiError(400, "wrong_password");
  const hash = await hashPassword(checkPassword(body.password));
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, user.id),
    // Keep this device logged in, log out the others.
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, user.session_hash),
  ]);
  return json({ ok: true });
}

async function setLanguage(request, env, body) {
  const user = await requireUser(request, env);
  await env.DB.prepare("UPDATE users SET lang = ? WHERE id = ?").bind(cleanLang(body.lang), user.id).run();
  return json({ ok: true });
}

async function logoutOthers(request, env) {
  const user = await requireUser(request, env);
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, user.session_hash).run();
  return json({ ok: true });
}

async function deleteAccount(request, env, body) {
  const user = await requireUser(request, env);
  if (!(await verifyPassword(String(body.password || ""), user.password_hash))) throw new ApiError(400, "wrong_password");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM login_tokens WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

const ROUTES = {
  "POST /api/auth/email-link": emailLink,
  "POST /api/auth/link": useLink,
  "POST /api/auth/login": passwordLogin,
  "POST /api/auth/logout": logout,
  "GET /api/me": me,
  "POST /api/account/password": changePassword,
  "POST /api/account/language": setLanguage,
  "POST /api/account/logout-others": logoutOthers,
  "POST /api/account/delete": deleteAccount,
};

export async function handleApi(request, env) {
  const { pathname } = new URL(request.url);
  const handler = ROUTES[`${request.method} ${pathname}`];
  if (!handler) return json({ error: "not_found" }, 404);
  // JSON only: a form on another site can't send this content type without the
  // browser asking first, which stops cross-site requests riding on the cookie.
  if (request.method === "POST" && !(request.headers.get("Content-Type") || "").startsWith("application/json")) {
    return json({ error: "bad_request" }, 415);
  }
  try {
    await ensureSchema(env.DB);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    return await handler(request, env, body || {});
  } catch (err) {
    if (err instanceof ApiError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "server_error" }, 500);
  }
}
