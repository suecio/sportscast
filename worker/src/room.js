// SportsCast WebSocket relay, one Durable Object per room.
//
// Devices connect to wss://<worker>/<ROOM>. Every message is sent to all other
// devices in the same room (see docs/PROTOCOL.md).
//
// The old version kept rooms in a global Map. Cloudflare runs a Worker in many
// separate copies, so the website and the phone often landed in different copies
// and never heard each other. Now each room is one Durable Object, which is a
// single place that every connection for that room goes to.

import { DurableObject } from "cloudflare:workers";

// Longest message we keep as the room's latest state.
const MAX_STORED = 64 * 1024;

export class Room extends DurableObject {
  async fetch(request) {
    // Called by the Worker when a scoreboard is deleted.
    if (request.method === "POST" && new URL(request.url).pathname === "/reset") {
      for (const socket of this.ctx.getWebSockets()) {
        try { socket.close(1000, "Scoreboard deleted"); } catch {}
      }
      await this.ctx.storage.deleteAll();
      return new Response("ok");
    }

    const [client, server] = Object.values(new WebSocketPair());
    // Hibernation API: the object can sleep between messages without dropping sockets.
    // The tag remembers whether this device may change the score (set by the Worker).
    const access = request.headers.get("X-SportsCast-Access") === "read" ? "read" : "write";
    this.ctx.acceptWebSocket(server, [access]);

    // Give a device that joins the latest score right away, even when no other
    // device is connected to answer its "hello".
    const latest = await this.ctx.storage.get("latest");
    if (latest) server.send(latest);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(sender, message) {
    // A read-only device (display link) may only ask for the state with "hello".
    if (this.ctx.getTags(sender).includes("read") && !isHello(message)) return;

    for (const socket of this.ctx.getWebSockets()) {
      if (socket === sender) continue;
      try {
        socket.send(message);
      } catch {
        // The socket is closing; the runtime removes it.
      }
    }

    if (typeof message !== "string" || message.length > MAX_STORED) return;
    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    if (!msg || typeof msg !== "object" || !(msg.v >= 2)) return;
    // Keep the newest state. A stored state is only shared, never a button press.
    const stored = await this.ctx.storage.get("latest");
    const storedRev = stored ? (JSON.parse(stored).rev ?? 0) : -1;
    if (msg.kind === "change" || (msg.rev ?? 0) > storedRev) {
      await this.ctx.storage.put("latest", JSON.stringify({ ...msg, kind: "sync" }));
    }
  }

  async webSocketClose(socket, code, reason) {
    try { socket.close(code, reason); } catch {}
  }
}

function isHello(message) {
  if (typeof message !== "string" || message.length > 1000) return false;
  try { return JSON.parse(message).type === "hello"; } catch { return false; }
}
