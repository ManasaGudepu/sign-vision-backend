// backend/server.js
const WebSocket = require("ws");

const PORT = process.env.PORT || 5001;
const wss = new WebSocket.Server({ port: PORT });

// Room structure: Map<roomName, Set<ws>>
const rooms = new Map();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const roomName = url.searchParams.get("room");

  ws.roomName = roomName;

  if (!roomName) {
    ws.close();
    return;
  }

  // Create room if not exists
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }

  const room = rooms.get(roomName);
  room.add(ws);

  console.log(
    `✅ Client connected | Room: ${roomName} | Users: ${room.size}`
  );

  // Assign role
  if (room.size === 1) {
    ws.send(JSON.stringify({ type: "role", role: "caller" }));
  } else {
    ws.send(JSON.stringify({ type: "role", role: "callee" }));
  }

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("❌ Invalid JSON:", msg.toString());
      return;
    }

    // Relay to other clients in same room
    room.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    console.log(`❌ Client disconnected | Room: ${roomName}`);
    room.delete(ws);

    if (room.size === 0) {
      rooms.delete(roomName);
      console.log(`🗑 Room deleted: ${roomName}`);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });
});

console.log("🚀 WebSocket signaling server running on port:", PORT);
