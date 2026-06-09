import os
import time
import uuid
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydub import AudioSegment

import config
from models import (
    GenerateRequest,
    GenerateResponse,
    JobStatusResponse,
    WaveformResponse,
    VoiceInfo,
    VoicesResponse,
    UploadedVoiceInfo,
    VoiceUploadResponse,
    HealthResponse,
)
from audio_utils import split_script_into_chunks
from tts_engine import (
    TTSEngine,
    jobs,
    submit_generation_job,
    get_job_status,
    delete_job_data,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title="Sutravak API",
    description="FastAPI backend for Chatterbox TTS speech generation",
    version="1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper: Load default voice duration on startup
DEFAULT_VOICE_DURATION = 8.2  # fallback default

# Resolve frontend build directory dynamically
# - Inside Docker: /app/dist/
# - Running locally from backend/: ../frontend/dist/
# - Running locally from root: frontend/dist/
frontend_dist_dir = None
for path in [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist"),
    "dist"
]:
    if os.path.exists(path):
        frontend_dist_dir = path
        break

if frontend_dist_dir and os.path.exists(os.path.join(frontend_dist_dir, "assets")):
    logger.info(f"Serving static frontend files from: {frontend_dist_dir}")
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_dir, "assets")), name="assets")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
else:
    logger.warning("Frontend build directory ('dist') not found. Static files and root route serving disabled.")


@app.on_event("startup")
def startup_event():
    global DEFAULT_VOICE_DURATION
    # Create required folders
    os.makedirs(config.ASSETS_DIR, exist_ok=True)
    os.makedirs(config.OUTPUTS_DIR, exist_ok=True)
    os.makedirs(config.VOICES_DIR, exist_ok=True)
    
    # Calculate default voice duration
    if os.path.exists(config.DEFAULT_REFERENCE_AUDIO):
        try:
            audio = AudioSegment.from_file(config.DEFAULT_REFERENCE_AUDIO)
            DEFAULT_VOICE_DURATION = round(len(audio) / 1000.0, 1)
            logger.info(f"Loaded default voice. Duration: {DEFAULT_VOICE_DURATION}s")
        except Exception as e:
            logger.error(f"Error reading default audio file duration: {e}")
    else:
        logger.warning(f"Default audio prompt not found at {config.DEFAULT_REFERENCE_AUDIO}")

    # Pre-load Chatterbox TTS model once at startup
    try:
        TTSEngine.get_model()
    except Exception as e:
        logger.error(f"Failed to load Chatterbox model on startup: {e}")

def resolve_voice_path(voice_id: str) -> str:
    """
    Resolves a voice_id to a physical audio path on disk.
    Throws HTTPException if not found.
    """
    if voice_id == "default":
        if not os.path.exists(config.DEFAULT_REFERENCE_AUDIO):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Default reference voice file is missing from assets."
            )
        return config.DEFAULT_REFERENCE_AUDIO

    if not os.path.exists(config.VOICES_DIR):
        os.makedirs(config.VOICES_DIR, exist_ok=True)

    # Search file matching the voice_id
    for filename in os.listdir(config.VOICES_DIR):
        fid = filename.replace(".", "_")
        if fid == voice_id:
            return os.path.join(config.VOICES_DIR, filename)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Selected voice library entry '{voice_id}' does not exist on disk."
    )

@app.post("/api/generate", response_model=GenerateResponse)
def generate_voiceover(req: GenerateRequest):
    # Validate script length
    if not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Narration script text cannot be empty."
        )
    if len(req.text) > config.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Script text exceeds the maximum character limit of {config.MAX_TEXT_LENGTH} characters."
        )

    # Resolve voice path
    voice_path = resolve_voice_path(req.voice_id)

    # Chunk the text script
    try:
        chunks = split_script_into_chunks(req.text, target_chunk_tokens=req.chunk_size)
    except Exception as e:
        logger.error(f"Error chunking text script: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process text script: {str(e)}"
        )

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to split script into valid sentence chunks. Please verify your script punctuation."
        )

    # Generate job ID
    job_id = str(uuid.uuid4())
    total_chunks = len(chunks)
    
    # Calculate estimated duration (words / 130 words/min * 60)
    word_count = len(req.text.split())
    estimated_duration_sec = max(5, int((word_count / 130) * 60))

    # Initialize job entry
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "chunks_done": 0,
        "total_chunks": total_chunks,
        "current_chunk_preview": "",
        "elapsed_sec": 0,
        "eta_sec": total_chunks * 15,  # initial ETA estimate (15s per chunk)
        "chunk_statuses": ["pending"] * total_chunks,
        "error": None,
        "start_time": time.time(),
        "text": req.text,
    }

    # Dispatch to background sequential runner
    submit_generation_job(
        job_id=job_id,
        chunks=chunks,
        voice_path=voice_path,
        exaggeration=req.exaggeration,
        cfg_weight=req.cfg_weight,
        temperature=req.temperature,
        crossfade_ms=req.crossfade_ms
    )

    return GenerateResponse(
        job_id=job_id,
        total_chunks=total_chunks,
        estimated_duration_sec=estimated_duration_sec
    )

@app.get("/api/status/{job_id}", response_model=JobStatusResponse)
def get_status(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
    return JobStatusResponse(**job)

@app.get("/api/audio/{job_id}")
def get_audio_wav(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
    if job["status"] != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio not ready. Job status: {job['status']}"
        )
        
    wav_path = os.path.join(config.OUTPUTS_DIR, f"{job_id}.wav")
    if not os.path.exists(wav_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generated WAV audio file missing from outputs folder."
        )
    return FileResponse(wav_path, media_type="audio/wav", filename=f"narration_{job_id}.wav")

@app.get("/api/audio/{job_id}/mp3")
def get_audio_mp3(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
    if job["status"] != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio not ready. Job status: {job['status']}"
        )
        
    mp3_path = os.path.join(config.OUTPUTS_DIR, f"{job_id}.mp3")
    if not os.path.exists(mp3_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generated MP3 audio file missing from outputs folder."
        )
    return FileResponse(mp3_path, media_type="audio/mpeg", filename=f"narration_{job_id}.mp3")

@app.get("/api/waveform/{job_id}", response_model=WaveformResponse)
def get_waveform(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
    if job["status"] != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Waveform not ready. Job is not complete."
        )
        
    peaks_path = os.path.join(config.OUTPUTS_DIR, f"{job_id}_peaks.txt")
    if not os.path.exists(peaks_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Waveform peak data file missing from disk."
        )
        
    try:
        with open(peaks_path, "r") as f:
            content = f.read().strip()
            peaks = [float(p) for p in content.split(",") if p]
        return WaveformResponse(peaks=peaks)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading waveform peaks: {str(e)}"
        )

@app.post("/api/voices/upload", response_model=VoiceUploadResponse)
def upload_voices(files: List[UploadFile] = File(...)):
    uploaded_info: List[UploadedVoiceInfo] = []
    errors: List[str] = []
    
    os.makedirs(config.VOICES_DIR, exist_ok=True)
    
    for upload_file in files:
        filename = upload_file.filename
        _, ext = os.path.splitext(filename.lower())
        
        # 1. Validate extension
        if ext not in config.ALLOWED_VOICE_EXTENSIONS:
            errors.append(f"File '{filename}' has invalid extension. Only WAV and MP3 are allowed.")
            continue
            
        # Write to temporary file for size and duration checking
        temp_id = str(uuid.uuid4())
        temp_path = os.path.join(config.VOICES_DIR, f"temp_{temp_id}{ext}")
        
        size_bytes = 0
        try:
            with open(temp_path, "wb") as buffer:
                # Read chunks to compute size and prevent memory spikes
                while chunk := upload_file.file.read(1024 * 1024):
                    size_bytes += len(chunk)
                    if size_bytes > config.MAX_VOICE_FILE_SIZE_MB * 1024 * 1024:
                        break
                    buffer.write(chunk)
                    
            # 2. Validate Size
            if size_bytes > config.MAX_VOICE_FILE_SIZE_MB * 1024 * 1024:
                errors.append(f"File '{filename}' exceeds maximum allowed size of {config.MAX_VOICE_FILE_SIZE_MB}MB.")
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                continue
                
            # 3. Read duration using pydub
            try:
                audio = AudioSegment.from_file(temp_path)
                duration_sec = len(audio) / 1000.0
            except Exception as ae:
                logger.error(f"Error loading audio segment for duration check: {ae}")
                errors.append(f"File '{filename}' could not be decoded as valid audio.")
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                continue
                
            # 4. Validate Duration
            if duration_sec < config.MIN_VOICE_DURATION_SEC or duration_sec > config.MAX_VOICE_DURATION_SEC:
                errors.append(
                    f"File '{filename}' duration must be between {config.MIN_VOICE_DURATION_SEC} and "
                    f"{config.MAX_VOICE_DURATION_SEC} seconds (got {round(duration_sec, 1)}s)."
                )
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                continue
                
            # 5. Handle duplicate filenames safely by appending suffixes
            base, ext = os.path.splitext(filename)
            suffix = 2
            safe_filename = filename
            while os.path.exists(os.path.join(config.VOICES_DIR, safe_filename)):
                safe_filename = f"{base}_{suffix}{ext}"
                suffix += 1
                
            final_path = os.path.join(config.VOICES_DIR, safe_filename)
            os.rename(temp_path, final_path)
            
            voice_id = safe_filename.replace(".", "_")
            uploaded_info.append(UploadedVoiceInfo(
                voice_id=voice_id,
                filename=safe_filename,
                duration_sec=round(duration_sec, 1),
                size_bytes=size_bytes
            ))
            logger.info(f"Successfully uploaded and verified voice library file: {safe_filename}")
            
        except Exception as e:
            logger.error(f"Error uploading voice: {e}", exc_info=True)
            errors.append(f"Server error processing file '{filename}': {str(e)}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    return VoiceUploadResponse(uploaded=uploaded_info, errors=errors)

@app.get("/api/voices", response_model=VoicesResponse)
def get_voices():
    voices_list: List[VoiceInfo] = []
    
    # 1. Add Default Voice
    voices_list.append(VoiceInfo(
        voice_id="default",
        filename="Default Voice",
        duration_sec=DEFAULT_VOICE_DURATION,
        is_default=True
    ))
    
    # 2. Add User-uploaded voices, sorted newest first (using modification time)
    if os.path.exists(config.VOICES_DIR):
        uploaded_files = []
        for filename in os.listdir(config.VOICES_DIR):
            path = os.path.join(config.VOICES_DIR, filename)
            # Make sure it's a file and not temp or dotfile
            if os.path.isfile(path) and not filename.startswith(".") and not filename.startswith("temp_"):
                mtime = os.path.getmtime(path)
                uploaded_files.append((filename, path, mtime))
                
        # Sort newest first
        uploaded_files.sort(key=lambda x: x[2], reverse=True)
        
        for filename, path, _ in uploaded_files:
            try:
                audio = AudioSegment.from_file(path)
                duration_sec = round(len(audio) / 1000.0, 1)
                voice_id = filename.replace(".", "_")
                voices_list.append(VoiceInfo(
                    voice_id=voice_id,
                    filename=filename,
                    duration_sec=duration_sec,
                    is_default=False
                ))
            except Exception as e:
                logger.error(f"Error loading uploaded voice metadata for {filename}: {e}")
                
    return VoicesResponse(voices=voices_list)

@app.get("/api/voices/{voice_id}/audio")
def get_voice_audio(voice_id: str):
    path = resolve_voice_path(voice_id)
    _, ext = os.path.splitext(path.lower())
    media_type = "audio/mpeg" if ext == ".mp3" else "audio/wav"
    return FileResponse(path, media_type=media_type)

@app.delete("/api/voices/{voice_id}")
def delete_voice(voice_id: str):
    if voice_id == "default":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the default voice."
        )
        
    path = resolve_voice_path(voice_id)
    try:
        os.remove(path)
        logger.info(f"Deleted voice file from library: {path}")
        return {"deleted": True, "voice_id": voice_id}
    except Exception as e:
        logger.error(f"Error deleting voice file {path}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete voice file: {str(e)}"
        )

@app.delete("/api/job/{job_id}")
def delete_job(job_id: str):
    # This deletes files from disk and metadata
    delete_job_data(job_id)
    return {"deleted": True, "job_id": job_id}

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        model_loaded=TTSEngine._model is not None,
        device=TTSEngine.device
    )
