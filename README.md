# Sutravak

> Voice that weaves stories.

A locally-hosted full-stack web application designed for content creators to generate production-grade AI voiceovers for Sutravak and documentary-style videos. The UI is minimal, aesthetic, and carries an Indian/ancient manuscript visual identity (saffron/turmeric aged gold and dark parchment).

The application uses **ResembleAI Chatterbox TTS** for speech synthesis and voice cloning, allowing users to upload short reference audio clips (MP3/WAV) to clone voices for long-form scripts.

---

## Technical Stack

- **Backend:** Python 3.11, FastAPI, `chatterbox-tts`, PyTorch, torchaudio, `pydub`, `numpy`
- **Frontend:** React 18, Vite, Tailwind CSS v3, Axios, Lucide React
- **Audio Processing:** `pydub` (for chunk stitching, crossfades, and normalization), `ffmpeg`
- **Hardware Acceleration:** Native Metal Performance Shaders (MPS) on macOS (Apple Silicon), fallback to CPU on other machines.

---

## Folder Structure

```
Sutravak/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── tts_engine.py            # Chatterbox model singleton loader + background generation queue
│   ├── audio_utils.py           # Script sentence chunking, crossfade stitching, peak normalization
│   ├── config.py                # Storage paths, thresholds, and default inference parameter configurations
│   ├── models.py                # Pydantic schema request/response definitions
│   ├── voices/                  # Directory for uploaded user-cloned reference audio files
│   ├── assets/
│   │   └── audio_prompt.mp3     # Default fallback reference voice clip
│   └── outputs/                 # Directory for synthesized output audios & pre-computed waveform peak files
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React page layout & hooks orchestration
│   │   ├── main.jsx             # React mount point
│   │   ├── api/
│   │   │   └── client.js        # Axios instance with proxy configurations
│   │   ├── hooks/
│   │   │   ├── useGeneration.js # Custom hook for polling speech generation status
│   │   │   └── useVoiceLibrary.js # Custom hook for listing, uploading, and deleting voices
│   │   └── components/
│   │       ├── TextInput.jsx    # Text script input panel with live statistics
│   │       ├── GenerationControls.jsx # Parameter tuning sliders (collapsible advanced settings)
│   │       ├── VoiceSelector.jsx # Voice selector dropdown + drag-and-drop upload zone + preview
│   │       ├── GenerationProgress.jsx # Queued chunk status matrix grid + ETA timers
│   │       ├── AudioPlayer.jsx  # Premium custom HTML5 audio player with waveform peak bars
│   │       └── SessionHistory.jsx # Session logging sidebar for loading and deleting items
│   ├── index.html
│   ├── tailwind.config.js       # Custom typography (Cinzel/Inter) and manuscript theme colors
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## Setup & Running Instructions

### Prerequisites

1. **Python 3.11**
2. **Node.js 18+**
3. **ffmpeg** (Required by `pydub` for audio stitching and MP3 export)
   - On macOS: `brew install ffmpeg`
   - On Ubuntu/Debian: `sudo apt-get install ffmpeg`

---

### 1. Run the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```
3. (Optional) Set the recommended environment variable for MPS fallbacks on Apple Silicon:
   ```bash
   export PYTORCH_ENABLE_MPS_FALLBACK=1
   ```
4. Start the FastAPI server using `uvicorn`:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Note: On startup, the server will pre-load the Chatterbox TTS model onto your GPU/CPU (indicated by `model_loaded: true` in `/api/health`).*

---

### 2. Run the Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## API Specification Reference

### Generation and Status Flow
- `POST /api/generate` — Submit narration script text and synthesis parameters. Returns a `job_id`.
- `GET /api/status/{job_id}` — Get progress status, per-chunk completion details, elapsed time, and ETA.
- `GET /api/audio/{job_id}` — Streams/downloads the stitched lossless WAV audio.
- `GET /api/audio/{job_id}/mp3` — Streams/downloads the stitched MP3 audio.
- `GET /api/waveform/{job_id}` — Returns 1000 downsampled peak amplitude points.

### Voice Library Management
- `POST /api/voices/upload` — Upload files (`.mp3` or `.wav`) to clone new voices.
- `GET /api/voices` — Retrieve the listing of cloned voices, sorted newest first.
- `GET /api/voices/{voice_id}/audio` — Streams preview audio for the selected voice.
- `DELETE /api/voices/{voice_id}` — Delete a cloned voice from the library.

### Cleanups and Health Checks
- `DELETE /api/job/{job_id}` — Delete generated job WAV, MP3, and peak files from disk.
- `GET /api/health` — Verifies server health, model pre-load status, and the computation device in use.

---

## Author & Repository

- **Developer:** [Pratham Kairamkonda](https://github.com/prathamm-k)
- **GitHub Repository:** [prathamm-k/Sutravak](https://github.com/prathamm-k/Sutravak)

