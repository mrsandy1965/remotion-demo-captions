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

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const uploadResponsee = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      fs.createReadStream(filePath),
      {
        headers: {
          "authorization": process.env.ASSEMBLYAI_API_KEY,
          "transfer-encoding": "chunked",
        },
      }
    );
    const audioUrl = uploadResponsee.data.upload_url;
    const transcribe_Response = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {audio_url: audioUrl,
        language: "en", 
        punctuate: true,
        format_text: true,
      },{headers: {
          "authorization": process.env.ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },});
    const transcript_Id = transcribe_Response.data.id;
    let transcript;
    while (true) {
      const check_Response = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcript_Id}`,
        { headers: { authorization: process.env.ASSEMBLYAI_API_KEY } }
      );
      transcript = check_Response.data;
      if (transcript.status === "completed" || transcript.status === "error"){ 
        break};
      await new Promise((r) => {setTimeout(r, 3000)});
    }if (transcript.status == "error") {
      throw new Error(transcript.error);}
    const props = {captions: transcript.text };
    const propsFilePath =path.join(
      __dirname,
      "../frontend/remotion-caption-demo",
      `props-${Date.now()}.json`);
    const propsDir = path.dirname(propsFilePath);
    if(!fs.existsSync(propsDir)){
      fs.mkdirSync(propsDir, { recursive: true });}
    fs.writeFileSync(propsFilePath, JSON.stringify(props, null, 2));
    res.json({ propsFile: propsFilePath });
    fs.unlinkSync(filePath); 
  }catch(err){
    console.error("Error:", err);
    res.status(500).json({ error: err.message });}
});





const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
