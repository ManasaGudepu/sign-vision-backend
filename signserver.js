const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = 8080;

// Start HTTP server
app.get("/", (req, res) => {
  res.send("✅ Sign Vision backend is running!");
});

const server = app.listen(PORT, () => {
  console.log(`Sign Vision backend running on http://localhost:${PORT}`);
});

// WebSocket server for signaling
const wss = new WebSocketServer({ server });

const rooms = {}; // roomId -> array of ws clients

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "join") {
        const roomId = data.room;
        ws.roomId = roomId;
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(ws);
        console.log(`User joined room: ${roomId}`);
      } else if (["offer", "answer", "ice"].includes(data.type)) {
        const room = rooms[ws.roomId] || [];
        room.forEach((client) => {
          if (client !== ws && client.readyState === client.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (err) {
      console.error("Error parsing message", err);
    }
  });

  ws.on("close", () => {
    if (ws.roomId && rooms[ws.roomId]) {
      rooms[ws.roomId] = rooms[ws.roomId].filter((c) => c !== ws);
      console.log(`User disconnected from room: ${ws.roomId}`);
    }
  });
});
