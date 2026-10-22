// SportsCast Worker: the website, the accounts /api, and the live score rooms.
//
// Websocket requests to /<CODE> go to a room's Durable Object (room.js), the way the
// app and the controller already connect. /api/* is accounts (auth.js).
// Everything else is the website, built into dist/.

import { handleApi } from "./auth.js";
import { findByCode, roomName } from "./boards.js";
import { ensureSchema } from "./db.js";

export { Room } from "./room.js";

export default {
  async fetch(request, env) {
    if (request.headers.get("Upgrade") === "websocket") return connectRoom(request, env);
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};

// A scoreboard's scorer code opens its room with permission to change the score, and
// its display code opens it read-only. Any other code is an open room without an
// account, as before, so the current app and the "try without an account" page keep
// working. Open rooms can't use names with ":", so they can never reach a scoreboard.
async function connectRoom(request, env) {
  const parts = new URL(request.url).pathname.split("/");
  const code = decodeURIComponent(parts[parts.length - 1] || "DEFAULT");

  let room = code;
  let access = "write";
  if (env.DB) {
    await ensureSchema(env.DB);
    const found = await findByCode(env, code);
    if (found?.access === "private") return new Response("This scoreboard is private", { status: 403 });
    if (found) {
      room = roomName(found.row.id);
      access = found.access;
    }
  }
  if (room === code && !/^[A-Za-z0-9_-]{1,40}$/.test(code)) {
    return new Response("Unknown room", { status: 404 });
  }

  // The access header is always set here, never taken from the caller.
  const headers = new Headers(request.headers);
  headers.set("X-SportsCast-Access", access);
  return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(new Request(request, { headers }));
}
