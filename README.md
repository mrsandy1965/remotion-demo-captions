# STT + Remotion Caption Demo

A simple Speech-to-Text pipeline with:
- **Backend**: Node/Express server that uploads media to AssemblyAI and returns `{ text, words[] }`.
- **Frontend**: Remotion project to preview and render captions over a video.

Key paths:
- Backend: `backend/`
- Frontend: `frontend/`

---

## Prerequisites
- Node.js 18+
- An AssemblyAI API key: https://www.assemblyai.com/

---

## Backend Setup (`backend/`)

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure API key (recommended)**
   - Open `backend/server.js` and ensure it uses the env variable:
     ```js
     // const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY; // use this
     // const ASSEMBLY_API_KEY = "..."; // avoid hardcoding
     ```

3. **Start the server**
   ```bash
   node server.js
   # or, if you prefer auto-reload:
   npx nodemon server.js
   ```
   The server runs at `http://localhost:3001`.


## Frontend Setup (`frontend/remotion-caption-demo/`)

1. **Install dependencies**
   ```bash
   cd frontend/
   npm install
   ```

2. **Start Remotion Studio (dev)**
   ```bash
   npm run dev
   ```
   This opens Remotion Studio. You should see a composition named `CaptionDemo`.

---

## How to Preview Captions

- **A) Using the upload UI (`PlayerApp.jsx`)**
  - `src/PlayerApp.jsx` is a convenience UI component that:
    - Lets you upload an `.mp4`,
    - Sends it to `POST http://localhost:3001/transcribe`,
    - Stores `{ text, words }`,
    - Renders a `<Player>` for `CaptionDemo` with `{ words, preset, videoSrc }`.
  - You can mount it inside a small sandbox page if desired, or continue using Studio input props.

> Captions rendering is implemented in `src/components/Captions.jsx`.
> Font used: `Noto Sans Devanagari, Noto Sans, sans-serif`. Include webfonts if not installed.

---

## Render an MP4 using Remotion CLI

You can render `CaptionDemo` headlessly using `npx remotion render`.

1. From the frontend folder:
   ```bash
   cd frontend/
   ```

2. Prepare props (either inline JSON or a JSON file). Example `props.json`:
   ```json
   {
     "videoSrc": "https://example.com/video.mp4",
     "preset": "karaoke",
     "words": [
       { "start": 0, "end": 500, "text": "Hello" },
       { "start": 500, "end": 1000, "text": "world" }
     ]
   }
   ```

3. Render:
   ```bash
   npx remotion render \
     CaptionDemo \
     out.mp4 \
     --props=props.json
   ```

- To pass props inline without a file:
  ```bash
  npx remotion render \
    CaptionDemo \
    out.mp4 \
    --props='{"videoSrc":"https://example.com/video.mp4","preset":"bottom","words":[{"start":0,"end":500,"text":"Hello"}]}'
  ```

> Duration is computed dynamically from `videoSrc` metadata at render time; if metadata isn’t accessible, it falls back to 60s.

---

## Troubleshooting
- **CORS**: If calling the backend from the browser, you may need to enable CORS on `backend/server.js` or run both on the same origin/proxy.
- **Large uploads**: AssemblyAI upload may take time. Watch the backend logs for progress and polling.
- **Fonts**: Ensure `Noto Sans Devanagari` and `Noto Sans` are available or included via CSS/webfonts for best caption appearance.
- **Composition ID**: Ensure you are using `CaptionDemo` (registered in `src/index.jsx`).
