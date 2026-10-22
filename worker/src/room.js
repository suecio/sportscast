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
    const [client, server] = Object.values(new WebSocketPair());
    // Hibernation API: the object can sleep between messages without dropping sockets.
    this.ctx.acceptWebSocket(server);

    // Give a device that joins the latest score right away, even when no other
    // device is connected to answer its "hello".
    const latest = await this.ctx.storage.get("latest");
    if (latest) server.send(latest);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(sender, message) {
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
