import 'dotenv/config';
import express from "express";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const app = express();
const upload = multer({ dest: "uploads/" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal CORS for local dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Upload + Transcribe route
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Upload to AssemblyAI
    const uploadResp = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      fs.createReadStream(filePath),
      {
        headers: {
          "authorization": process.env.ASSEMBLYAI_API_KEY,
          "transfer-encoding": "chunked",
        },
      }
    );

    const audioUrl = uploadResp.data.upload_url;

    // Force transcription in English
    const transcribeResp = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: audioUrl,
        language: "en", // ✅ Force English output
        punctuate: true,
        format_text: true,
      },
      {
        headers: {
          "authorization": process.env.ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    const transcriptId = transcribeResp.data.id;

    // Poll for completion
    let transcript;
    while (true) {
      const checkResp = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { authorization: process.env.ASSEMBLYAI_API_KEY } }
      );
      transcript = checkResp.data;
      if (transcript.status === "completed" || transcript.status === "error") break;
      await new Promise(r => setTimeout(r, 3000));
    }

    if (transcript.status === "error") {
      throw new Error(transcript.error);
    }

    // Save props JSON for Remotion
    const props = { captions: transcript.text };
    const propsFilePath = path.join(
      __dirname,
      "../frontend/remotion-caption-demo",
      `props-${Date.now()}.json`
    );

    // ✅ Ensure folder exists before writing
    const propsDir = path.dirname(propsFilePath);
    if (!fs.existsSync(propsDir)) {
      fs.mkdirSync(propsDir, { recursive: true });
    }

    fs.writeFileSync(propsFilePath, JSON.stringify(props, null, 2));

    // Return the props file path
    res.json({ propsFile: propsFilePath });

    // Cleanup temp upload
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
