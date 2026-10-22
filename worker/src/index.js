// SportsCast Worker: the website, the accounts /api, and the live score rooms.
//
// Websocket requests to /<ROOM> go to that room's Durable Object (room.js), the way
// the app and the old website already connect. /api/* is accounts (auth.js).
// Everything else is the website, built into dist/.

import { handleApi } from "./auth.js";

export { Room } from "./room.js";

export default {
  async fetch(request, env) {
    if (request.headers.get("Upgrade") === "websocket") {
      const parts = new URL(request.url).pathname.split("/");
      const room = parts[parts.length - 1] || "DEFAULT";
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
    }
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
