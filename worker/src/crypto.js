// Passwords and tokens.
//
// Passwords are hashed with PBKDF2 (SHA-256). 100,000 rounds is the most the Workers
// runtime allows. Tokens sent in emails and session cookies are random, and only their
// SHA-256 hash is stored, so a copy of the database gives no working links or logins.

const ROUNDS = 100_000;
const encoder = new TextEncoder();

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function randomToken(bytes = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function newId() {
  return crypto.randomUUID();
}

export async function sha256(text) {
  return toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

async function pbkdf2(password, salt, rounds) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: rounds }, key, 256);
}

// Stored as "pbkdf2$<rounds>$<salt>$<hash>" so the rounds can be raised later.
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ROUNDS);
  return `pbkdf2$${ROUNDS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, rounds, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const actual = new Uint8Array(await pbkdf2(password, fromBase64Url(salt), Number(rounds)));
  const expected = fromBase64Url(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

// Secrets we must use again later (YouTube sign-in tokens, stream keys) are stored
// encrypted with AES-GCM. The key comes from the TOKEN_KEY secret, so a copy of the
// database alone does not give access to anyone's YouTube channel.
async function tokenKey(env) {
  if (!env.TOKEN_KEY) throw new Error("TOKEN_KEY secret is missing");
  const raw = await crypto.subtle.digest("SHA-256", encoder.encode(env.TOKEN_KEY));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptText(env, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await tokenKey(env), encoder.encode(text));
  return `v1.${toBase64Url(iv)}.${toBase64Url(data)}`;
}

export async function decryptText(env, stored) {
  const [version, iv, data] = String(stored || "").split(".");
  if (version !== "v1") throw new Error("Unknown encrypted value");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, await tokenKey(env), fromBase64Url(data));
  return new TextDecoder().decode(plain);
}
