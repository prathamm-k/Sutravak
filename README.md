# Sutravak

*Voice that weaves stories.*

Sutravak is a locally-hosted, privacy-focused full-stack web application designed for content creators, historians, and educators to generate production-grade AI voiceovers for history narration and documentary-style videos. It runs entirely on your local machine—no data ever leaves your device, and no internet connection is required after setup.

---

## Project Motivation
Sutravak was built to provide storytellers and content creators with a fast, private, and offline alternative to cloud-hosted text-to-speech services. By designing a pipeline that runs locally on consumer hardware, the project ensures complete security for proprietary narration scripts while demonstrating how professional voice cloning and long-form speech synthesis can be optimized for local deployment.

This project explores the full lifecycle of local AI engineering—from script boundary sentence tokenization and advanced audio crossfade stitching to text-to-speech voice cloning using ResembleAI Chatterbox and premium, immersive user experience design.

**Future Roadmap:**
- Expanded voice library categories (e.g., historical personalities, narrator types).
- Multi-speaker dialog scripts with automated conversational narration.
- Database persistence (SQLite/PostgreSQL) for saving narration histories, transcript revisions, and generated audio assets.
- Fine-grained phoneme-level controls (pitch, speed, emotion sliders per sentence).

---

## Project Features & Architecture

### Pipeline & Synthesis Optimizations
The backend pipeline (located in [backend/tts_engine.py](file:///Users/prathamkairamkonda/Developer/Projects/History-Narration-TTS/backend/tts_engine.py) and [backend/audio_utils.py](file:///Users/prathamkairamkonda/Developer/Projects/History-Narration-TTS/backend/audio_utils.py)) is optimized for long-form audio generation:

*   **Hardware Auto-Detection & Apple Silicon Acceleration:** On initialization, the backend checks the host environment. If running on Apple Silicon macOS with MPS support, it automatically configures a Metal-accelerated device (`mps`). On other platforms, it defaults to CPU execution.
*   **Model Caching & Warmup:** The Chatterbox TTS model is loaded once as a singleton (`TTSEngine.get_model()`) at startup. Subsequent generations reuse the loaded model, eliminating model loading overheads on API calls.
*   **Smart Sentence Chunking & Stitching:** Large scripts are split at natural punctuation and sentence boundaries. Each chunk is generated sequentially and stitched together with a configured crossfade (default `4ms`) using `pydub` to prevent audible clicks or abrupt audio jumps.
*   **Waveform Peak Pre-computation:** Following generation, the backend downsamples the audio and saves a peak amplitude data file (`{job_id}_peaks.txt`) containing 1,000 points. This enables the frontend custom audio player to render visual waveforms instantly without client-side decoding.
*   **Robust Dynamic Routing:** The backend automatically detects its environment to serve frontend static assets. It resolves paths dynamically so it doesn't crash when running without a pre-built static directory.

### Immersive Manuscript Design System
The frontend (located in [frontend/](file:///Users/prathamkairamkonda/Developer/Projects/History-Narration-TTS/frontend)) features an elegant, warm, and responsive interface inspired by ancient Indian manuscripts and vintage historical assets:
*   **Color Palette:** A rich, calibrated theme using saffron-gold highlights (`#D4A843`), deep aged parchment charcoal backgrounds, and soft amber text hues.
*   **Typography:** Merges clean editorial layout defaults (Inter) with classical serif headers (Cinzel) for an premium literary feel.
*   **Custom Audio Player:** A fully-customized HTML5 audio controller utilizing pre-computed waveform peak bars, interactive playback speed adjustments, volume toggling, and clean seek states.
*   **Session Sidebar:** A left-docked history panel keeping track of generations, letting users switch between generated audio sessions or delete old runs with ease.

---

## Tech Stack
*   **Backend:**
    *   **Python 3.11**
    *   **FastAPI:** High-performance, async API routing.
    *   **Chatterbox TTS (`chatterbox-tts`):** High-quality voice cloning and speech generation.
    *   **PyTorch & Torchaudio:** Deep learning inference engine with MPS support.
    *   **Pydub & NumPy:** High-performance audio concatenation and file exporting.
*   **Frontend:**
    *   **React + Vite:** Modern, ultra-fast web UI running on port `2001`.
    *   **Axios:** Configured API client with relative proxy routing.
    *   **Tailwind CSS v3:** Custom themes, aged parchment gradients, and transitions.

---

## Setup & Installation

First, clone the repository to your local machine:
```bash
git clone https://github.com/prathamm-k/Sutravak.git
cd Sutravak
```

You can run Sutravak using either **Docker Compose** (recommended for quick development) or via a **Traditional Local Setup**.

### Option A: Docker Compose Setup (Recommended)
The easiest way to run the application is using Docker Compose. This starts both the React frontend and FastAPI backend containers with volume mounting to persist audio files.

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.
2. In the root of the project, run:
```bash
docker compose up --build
```
3. Open [http://localhost:2001](http://localhost:2001) in your browser.

*Note: The generated audio outputs and custom uploaded voices are persisted directly to your local `backend/outputs/` and `backend/voices/` folders via bind mounts.*

> [!WARNING]
> **Apple Silicon (Mac) Users:** Docker on macOS runs inside a Linux Virtual Machine, which does **not** have access to the Apple Silicon GPU (Metal/MPS). Therefore, running speech generation via Docker on a Mac will force it to use the CPU (slower). If you want maximum performance with Metal GPU acceleration on your Mac, please use **Option B: Traditional Local Setup**.

---

### Option B: Traditional Local Setup

If you prefer to run the services manually in your terminal for GPU/MPS acceleration:

**1. Backend Setup (FastAPI)**
Activate the virtual environment, install dependencies, and run the backend server:
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export PYTORCH_ENABLE_MPS_FALLBACK=1
uvicorn main:app --reload --host 0.0.0.0 --port 9001
```
*The FastAPI backend will run at `http://localhost:9001`.*

**2. Frontend Setup (React + Vite)**
Open a **second terminal window**, install dependencies, and spin up the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
*The frontend development server will launch at [http://localhost:2001](http://localhost:2001) and proxy `/api` calls to `http://localhost:9001`.*

---

### Option C: Pull Pre-built Image (No Code Required)

If you just want to run the application without downloading any source code or building containers, you can pull the pre-built monolith image directly from Docker Hub.

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.
2. Open a terminal and run the single Docker command. 

**For Windows Users:**
```bash
docker run -p 9001:9001 -v C:\Sutravak\outputs:/app/outputs -v C:\Sutravak\voices:/app/voices -v C:\Sutravak\huggingface_cache:/app/huggingface_cache prathammk01/sutravak
```

**For Mac / Linux Users:**
```bash
docker run -p 9001:9001 -v ~/Sutravak/outputs:/app/outputs -v ~/Sutravak/voices:/app/voices -v ~/Sutravak/huggingface_cache:/app/huggingface_cache prathammk01/sutravak
```

3. Docker will download the image and boot the server. On the first run, the Chatterbox model weights (approx. 4.1GB) will be downloaded and saved directly into your local `huggingface_cache` directory on your PC. Subsequent runs will boot instantly.
4. Open [http://localhost:9001](http://localhost:9001) in your browser!

---

## Project Structure
```
Sutravak/
├── backend/
│   ├── main.py                  # FastAPI app entry point (endpoints, uploads, static routes)
│   ├── tts_engine.py            # Chatterbox model loader & background task queue
│   ├── audio_utils.py           # Script sentence chunking, crossfade stitching, peak normalization
│   ├── config.py                # Storage paths, thresholds, and default inference parameters
│   ├── models.py                # Pydantic schemas for requests and responses
│   ├── requirements.txt         # Backend Python dependencies
│   ├── assets/
│   │   └── audio_prompt.mp3     # Default fallback voice prompt file
│   ├── voices/                  # Directory for user custom voice models (gitignored)
│   └── outputs/                 # Directory for synthesized audios and peaks (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TextInput.jsx          # Script text entry with statistics
│   │   │   ├── GenerationControls.jsx # Synthesis tuning parameters
│   │   │   ├── VoiceSelector.jsx      # Voice library previewer and file uploader
│   │   │   ├── GenerationProgress.jsx # Queued sentence status matrix
│   │   │   ├── AudioPlayer.jsx        # Waveform peak audio player
│   │   │   └── SessionHistory.jsx     # Sidebar listing generated sessions
│   │   ├── hooks/
│   │   │   ├── useGeneration.js       # Generation polling hook
│   │   │   └── useVoiceLibrary.js     # Voice upload and delete operations hook
│   │   ├── api/
│   │   │   └── client.js              # Axios configuration
│   │   ├── App.jsx                    # Layout and state controller
│   │   ├── main.jsx                   # React application mount
│   │   └── index.css                  # Typography and custom styling tokens
│   ├── package.json                   # Frontend npm package configuration
│   ├── vite.config.js                 # Vite server configuration (port 2001 & dynamic proxy)
│   └── tailwind.config.js             # Theme color styles and typography rules
├── Dockerfile                   # Monolith multi-stage Docker build
├── docker-compose.yml           # Multi-container Compose profile for development
├── .gitignore                   # Workspace global git ignore files
├── .dockerignore                # Container build context ignores
└── README.md                    # Project-level documentation (this file)
```

---

## API Endpoints Reference

### FastAPI Backend (`main.py` on port `9001`)

#### Speech Generation
*   **`POST /api/generate`** - Submits a script and configuration. Returns a unique `job_id`.
*   **`GET /api/status/{job_id}`** - Polls chunk completion matrix, elapsed timings, and ETA.
*   **`GET /api/audio/{job_id}`** - Streams/downloads final stitched lossless WAV audio.
*   **`GET /api/audio/{job_id}/mp3`** - Streams/downloads stitched MP3 audio.
*   **`GET /api/waveform/{job_id}`** - Retrieves the array of downsampled peak amplitudes.
*   **`DELETE /api/job/{job_id}`** - Deletes WAV, MP3, and peak data from the server disk.

#### Voice Library
*   **`POST /api/voices/upload`** - Uploads custom reference audio (`.mp3`/`.wav`) for voice cloning.
*   **`GET /api/voices`** - Retrieves listing of cloned voices and the default narrator voice.
*   **`GET /api/voices/{voice_id}/audio`** - Streams preview audio clip for reference.
*   **`DELETE /api/voices/{voice_id}`** - Deletes a custom cloned voice file from the library.

#### Health Checks
*   **`GET /api/health`** - Verifies server status, model loading, and active processor device.

---

## Troubleshooting & FAQ

*   **Port Collision on Start:** If you receive a port conflict error when launching uvicorn locally, terminate existing processes on that port:
    ```bash
    lsof -ti :9001 | xargs kill -9
    ```
*   **MPS GPU Failures:** Ensure you have configured the PyTorch fallback environment variable before starting uvicorn:
    ```bash
    export PYTORCH_ENABLE_MPS_FALLBACK=1
    ```
*   **Backend Unreachable (CORS/Proxy):** Ensure the frontend configuration points to the correct backend host. If using Docker Compose, the Vite server will automatically proxy requests to the container name via `VITE_BACKEND_TARGET=http://backend:9001`.

---

## Contributing
Contributions are welcome! Please open issues or submit pull requests for speech optimizations, interface enhancements, or model customization features.

## License
Distributed under the MIT License.

---

## Repository & Author
*   **GitHub Repository:** [prathamm-k/Sutravak](https://github.com/prathamm-k/Sutravak)
*   **Developer:** [Pratham Kairamkonda](https://github.com/prathamm-k)
