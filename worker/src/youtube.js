// /api for YouTube: connect a YouTube channel with Google sign-in, and create a live
// stream on it for a scoreboard. YouTube then gives a server address and stream key,
// which the app streams to. The broadcast starts by itself when the video arrives.
//
// Needs the secrets GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and TOKEN_KEY. The Google
// sign-in asks only for the "youtube" permission (manage the user's YouTube account).

import { ApiError, json, requireUser } from "./auth.js";
import { decryptText, encryptText, randomToken } from "./crypto.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/youtube/v3";
const SCOPE = "https://www.googleapis.com/auth/youtube";
const STATE_COOKIE = "sc_youtube_state";
const PRIVACY = ["public", "unlisted", "private"];
const MAX_TITLE = 100; // YouTube's limit

const configured = (env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_KEY);

function requireConfigured(env) {
  if (!configured(env)) throw new ApiError(503, "youtube_not_configured");
}

const callbackUrl = (request) => `${new URL(request.url).origin}/api/youtube/callback`;

const redirect = (location, headers = {}) => new Response(null, { status: 302, headers: { Location: location, ...headers } });

// Where to send the browser back to after Google: the scoreboard page it came from.
const backTo = (boardId, result) =>
  `${boardId ? `/scoreboards/${encodeURIComponent(boardId)}` : "/scoreboards"}?youtube=${encodeURIComponent(result)}`;

// --- Google tokens ------------------------------------------------------------

async function tokenRequest(env, params) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // invalid_grant: the user removed our access in their Google account, or (while the
    // Google app is in testing mode) the sign-in is older than 7 days.
    if (data.error === "invalid_grant") throw new ApiError(401, "youtube_reconnect");
    console.error("Google token error", res.status, data.error);
    throw new ApiError(502, "youtube_error");
  }
  return data;
}

async function accountRow(env, userId) {
  return env.DB.prepare("SELECT * FROM youtube_accounts WHERE user_id = ?").bind(userId).first();
}

// A working access token for the user's channel, refreshed when it is about to expire.
async function accessToken(env, userId) {
  const row = await accountRow(env, userId);
  if (!row) throw new ApiError(400, "youtube_not_connected");
  if (row.access_token && row.access_expires_at > Date.now() + 60_000) return decryptText(env, row.access_token);
  let data;
  try {
    data = await tokenRequest(env, { grant_type: "refresh_token", refresh_token: await decryptText(env, row.refresh_token) });
  } catch (err) {
    if (err.message === "youtube_reconnect") await env.DB.prepare("DELETE FROM youtube_accounts WHERE user_id = ?").bind(userId).run();
    throw err;
  }
  await env.DB.prepare("UPDATE youtube_accounts SET access_token = ?, access_expires_at = ?, updated_at = ? WHERE user_id = ?")
    .bind(await encryptText(env, data.access_token), Date.now() + data.expires_in * 1000, Date.now(), userId)
    .run();
  return data.access_token;
}

// Calls the YouTube Data API and turns its errors into our error codes.
async function youtube(token, method, path, body) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason || "";
    console.error("YouTube API error", res.status, reason, data.error?.message);
    if (reason === "liveStreamingNotEnabled") throw new ApiError(400, "youtube_live_not_enabled");
    if (res.status === 401) throw new ApiError(401, "youtube_reconnect");
    if (reason === "quotaExceeded" || reason === "rateLimitExceeded") throw new ApiError(429, "youtube_quota");
    throw new ApiError(502, "youtube_error");
  }
  return data;
}

// --- Connecting a channel -----------------------------------------------------

async function status(request, env, user) {
  if (!configured(env)) return json({ configured: false, connected: false });
  const row = await accountRow(env, user.id);
  return json({ configured: true, connected: Boolean(row), channelTitle: row?.channel_title || "" });
}

// The "Connect YouTube" button links here. Sends the browser to Google's sign-in, with
// a random state that is checked when Google sends the browser back.
async function connect(request, env) {
  const boardId = new URL(request.url).searchParams.get("board") || "";
  let user;
  try {
    user = await requireUser(request, env);
  } catch {
    return redirect("/login");
  }
  if (!configured(env)) return redirect(backTo(boardId, "not_configured"));
  const state = `${randomToken(16)}.${boardId.replace(/[^\w-]/g, "")}`;
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // gives a refresh token, so streams can be made later without signing in again
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    login_hint: user.email,
  });
  return redirect(url.toString(), {
    "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/api/youtube; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  });
}

async function callback(request, env) {
  const params = new URL(request.url).searchParams;
  const state = params.get("state") || "";
  const boardId = state.split(".")[1] || "";
  const cookies = request.headers.get("Cookie") || "";
  const expected = cookies.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]+)`))?.[1];
  const clearState = { "Set-Cookie": `${STATE_COOKIE}=; Path=/api/youtube; HttpOnly; Secure; SameSite=Lax; Max-Age=0` };

  let user;
  try {
    user = await requireUser(request, env);
  } catch {
    return redirect("/login", clearState);
  }
  if (!configured(env)) return redirect(backTo(boardId, "not_configured"), clearState);
  if (!expected || expected !== state) return redirect(backTo(boardId, "error"), clearState);
  if (params.get("error")) return redirect(backTo(boardId, "cancelled"), clearState);

  try {
    const tokens = await tokenRequest(env, { grant_type: "authorization_code", code: params.get("code") || "", redirect_uri: callbackUrl(request) });
    if (!tokens.refresh_token || !String(tokens.scope || "").includes(SCOPE)) return redirect(backTo(boardId, "missing_permission"), clearState);
    const channels = await youtube(tokens.access_token, "GET", "channels?part=snippet&mine=true");
    const channel = channels.items?.[0];
    if (!channel) return redirect(backTo(boardId, "no_channel"), clearState);

    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO youtube_accounts (user_id, channel_id, channel_title, refresh_token, access_token, access_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET channel_id = excluded.channel_id, channel_title = excluded.channel_title,
         refresh_token = excluded.refresh_token, access_token = excluded.access_token,
         access_expires_at = excluded.access_expires_at, updated_at = excluded.updated_at`
    )
      .bind(user.id, channel.id, channel.snippet?.title || "", await encryptText(env, tokens.refresh_token),
        await encryptText(env, tokens.access_token), now + tokens.expires_in * 1000, now, now)
      .run();
    return redirect(backTo(boardId, "connected"), clearState);
  } catch (err) {
    console.error("YouTube connect failed", err.message);
    return redirect(backTo(boardId, "error"), clearState);
  }
}

// Removes our access from the user's Google account too, not only from our database.
export async function disconnectUser(env, userId) {
  const row = await accountRow(env, userId);
  if (!row) return;
  try {
    const token = await decryptText(env, row.refresh_token);
    await fetch(REVOKE_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) });
  } catch (err) {
    console.error("YouTube revoke failed", err.message);
  }
  await env.DB.prepare("DELETE FROM youtube_accounts WHERE user_id = ?").bind(userId).run();
}

async function disconnect(request, env, user) {
  await disconnectUser(env, user.id);
  return json({ ok: true });
}

// --- A scoreboard's YouTube stream ---------------------------------------------

async function ownBoard(env, user, id) {
  const row = await env.DB.prepare("SELECT id, title FROM scoreboards WHERE id = ? AND owner_id = ?").bind(id, user.id).first();
  if (!row) throw new ApiError(404, "board_not_found");
  return row;
}

async function publicStream(env, row) {
  if (!row) return null;
  return {
    title: row.title,
    scheduledAt: row.scheduled_at,
    privacy: row.privacy,
    serverUrl: row.ingest_url,
    streamKey: await decryptText(env, row.stream_key),
    watchUrl: `https://www.youtube.com/watch?v=${row.broadcast_id}`,
    studioUrl: `https://studio.youtube.com/video/${row.broadcast_id}/livestreaming`,
  };
}

async function getStream(request, env, user, body, id) {
  await ownBoard(env, user, id);
  const row = await env.DB.prepare("SELECT * FROM board_streams WHERE board_id = ?").bind(id).first();
  return json({ stream: configured(env) ? await publicStream(env, row) : null });
}

// Creates the YouTube broadcast (what viewers see) and a stream (where the video goes
// in), and connects them. Auto start/stop: it goes live when the phone starts streaming.
async function createStream(request, env, user, body, id) {
  requireConfigured(env);
  const board = await ownBoard(env, user, id);
  const existing = await env.DB.prepare("SELECT board_id FROM board_streams WHERE board_id = ?").bind(id).first();
  if (existing) throw new ApiError(409, "youtube_stream_exists");

  const title = String(body.title || board.title).trim().slice(0, MAX_TITLE);
  if (!title) throw new ApiError(400, "title_missing");
  const privacy = PRIVACY.includes(body.privacy) ? body.privacy : "public";
  const wanted = Date.parse(body.startAt || "");
  // YouTube wants a start time in the future.
  const startAt = Math.max(Number.isNaN(wanted) ? 0 : wanted, Date.now() + 60_000);

  const token = await accessToken(env, user.id);
  const broadcast = await youtube(token, "POST", "liveBroadcasts?part=snippet,status,contentDetails", {
    snippet: { title, scheduledStartTime: new Date(startAt).toISOString() },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
    contentDetails: { enableAutoStart: true, enableAutoStop: true },
  });
  let stream;
  try {
    stream = await youtube(token, "POST", "liveStreams?part=snippet,cdn,contentDetails", {
      snippet: { title: `SportsCast: ${title}` },
      cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" },
      contentDetails: { isReusable: false },
    });
    await youtube(token, "POST", `liveBroadcasts/bind?id=${broadcast.id}&part=id&streamId=${stream.id}`);
  } catch (err) {
    // Don't leave a half made broadcast on the user's channel.
    await youtube(token, "DELETE", `liveBroadcasts?id=${broadcast.id}`).catch(() => {});
    if (stream) await youtube(token, "DELETE", `liveStreams?id=${stream.id}`).catch(() => {});
    throw err;
  }

  const ingest = stream.cdn?.ingestionInfo || {};
  const row = {
    board_id: id,
    broadcast_id: broadcast.id,
    stream_id: stream.id,
    title,
    scheduled_at: startAt,
    privacy,
    ingest_url: ingest.rtmpsIngestionAddress || ingest.ingestionAddress || "",
    stream_key: await encryptText(env, ingest.streamName || ""),
  };
  await env.DB.prepare(
    "INSERT INTO board_streams (board_id, broadcast_id, stream_id, title, scheduled_at, privacy, ingest_url, stream_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(row.board_id, row.broadcast_id, row.stream_id, row.title, row.scheduled_at, row.privacy, row.ingest_url, row.stream_key, Date.now())
    .run();
  return json({ stream: await publicStream(env, row) });
}

// Removes the stream from the scoreboard and deletes it on YouTube. A broadcast that has
// already been live is kept on YouTube as a video; YouTube refuses to delete it here and
// we ignore that.
export async function deleteBoardStream(env, userId, boardId) {
  const row = await env.DB.prepare("SELECT * FROM board_streams WHERE board_id = ?").bind(boardId).first();
  if (!row) return;
  if (configured(env)) {
    try {
      const token = await accessToken(env, userId);
      await youtube(token, "DELETE", `liveBroadcasts?id=${row.broadcast_id}`).catch(() => {});
      await youtube(token, "DELETE", `liveStreams?id=${row.stream_id}`).catch(() => {});
    } catch (err) {
      console.error("YouTube delete failed", err.message);
    }
  }
  await env.DB.prepare("DELETE FROM board_streams WHERE board_id = ?").bind(boardId).run();
}

async function deleteStream(request, env, user, body, id) {
  await ownBoard(env, user, id);
  await deleteBoardStream(env, user.id, id);
  return json({ ok: true });
}

// Same format as BOARD_ROUTES: method, pattern, handler, needs a logged in user.
export const YOUTUBE_ROUTES = [
  ["GET", /^\/api\/youtube$/, status, true],
  ["GET", /^\/api\/youtube\/connect$/, connect, false],
  ["GET", /^\/api\/youtube\/callback$/, callback, false],
  ["POST", /^\/api\/youtube\/disconnect$/, disconnect, true],
  ["GET", /^\/api\/boards\/([\w-]+)\/youtube$/, getStream, true],
  ["POST", /^\/api\/boards\/([\w-]+)\/youtube$/, createStream, true],
  ["POST", /^\/api\/boards\/([\w-]+)\/youtube\/delete$/, deleteStream, true],
];
