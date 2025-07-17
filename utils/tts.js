// utils/tts.js
import axios from "axios";

export default async function getAudioFromText(text) {
  try {
    const response = await axios.post(
      "https://api.openrouter.ai/tts", // or your chosen TTS endpoint
      {
        text,
        voice: "nova", // Or any available voice
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
      }
    );

    return response.data.audio_base64;
  } catch (error) {
    console.error("TTS Error:", error.message);
    return null;
  }
}
