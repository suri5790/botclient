// botClient.js
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { config } from "dotenv";
import cors from "cors";
import axios from "axios";

config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

let activeRooms = new Set();

app.post("/invite-bot", async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: "Room ID required" });

  if (activeRooms.has(roomId)) {
    return res.status(200).json({ message: "Bot already joined" });
  }

  console.log(`🔗 Bot joining room: ${roomId}`);
  activeRooms.add(roomId);

  const socket = io.connect(process.env.FRONTEND_SOCKET_URL, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    socket.emit("join-room", roomId, "ai-bot");
    console.log(`✅ Bot joined room: ${roomId}`);
  });

  socket.on("user-message", async ({ message, sender }) => {
    console.log(`📥 ${sender}: ${message}`);

    try {
      const aiResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "meta-llama/llama-3-8b-instruct:nitro",
        messages: [
          { role: "system", content: "You are an AI participant in a GD" },
          { role: "user", content: message }
        ],
      }, {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const botReply = aiResponse.data.choices[0].message.content;
      console.log(`🤖 Reply: ${botReply}`);

      const audioRes = await axios.post("https://api.openai.com/v1/audio/speech", {
        model: "tts-1",
        voice: "nova",
        input: botReply,
      }, {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      });

      const audioBase64 = Buffer.from(audioRes.data).toString("base64");

      socket.emit("bot-audio", {
        text: botReply,
        audio: audioBase64,
      });
    } catch (err) {
      console.error("AI or TTS error", err.message);
    }
  });

  res.status(200).json({ message: "Bot invited successfully" });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`🤖 Bot server running on ${PORT}`);
});
