import os
import time
import uuid
import torch
import random
import logging
import threading
import torchaudio as ta
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor

from chatterbox import ChatterboxTTS
import config
from audio_utils import stitch_audio_chunks, normalize_audio, generate_waveform_peaks

# Configure logger
logger = logging.getLogger("tts_engine")
logging.basicConfig(level=logging.INFO)

# Global thread pool for executing voice generation jobs sequentially.
# max_workers=1 guarantees that we generate one job (and one chunk) at a time,
# preventing CPU/GPU/MPS resource exhaustion.
job_executor = ThreadPoolExecutor(max_workers=1)

# In-memory job store
# Key: job_id (str), Value: dict
jobs: Dict[str, dict] = {}
jobs_lock = threading.Lock()

class TTSEngine:
    _model: Optional[ChatterboxTTS] = None
    _lock = threading.Lock()
    
    # Check device availability: MPS first, then CUDA, then CPU fallback
    if torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"
    sr = 24000  # Default sample rate, will be updated upon loading

    @classmethod
    def get_model(cls) -> ChatterboxTTS:
        """
        Thread-safe singleton model loader.
        """
        with cls._lock:
            if cls._model is None:
                logger.info(f"Loading ChatterboxTTS on device: {cls.device}...")
                cls._model = ChatterboxTTS.from_pretrained(device=cls.device)
                cls.sr = cls._model.sr
                # Hybrid float16 casting for Apple Silicon (MPS) or NVIDIA (CUDA)
                if cls.device in ["mps", "cuda"]:
                    logger.info(f"Casting model.t3 Llama transformer to float16 on {cls.device}...")
                    cls._model.t3 = cls._model.t3.to(dtype=torch.float16)
                logger.info(f"ChatterboxTTS model loaded. Sample rate: {cls.sr}")
        return cls._model

    @classmethod
    def generate(cls, text: str, audio_prompt_path: Optional[str], exaggeration: float, cfg_weight: float, temperature: float):
        """
        Generate audio tensor for a single text chunk under thread lock.
        """
        model = cls.get_model()
        with cls._lock:
            # ChatterboxTTS.generate returns a PyTorch tensor: shape (1, num_samples)
            wav_tensor = model.generate(
                text=text,
                audio_prompt_path=audio_prompt_path,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight,
                temperature=temperature
            )
            return wav_tensor

def update_job_status(job_id: str, updates: dict):
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(updates)

def get_job_status(job_id: str) -> Optional[dict]:
    with jobs_lock:
        return jobs.get(job_id)

def delete_job_data(job_id: str):
    """
    Deletes job metadata and associated files from disk.
    """
    with jobs_lock:
        if job_id in jobs:
            del jobs[job_id]
            
    # Delete generated outputs
    wav_path = os.path.join(config.OUTPUTS_DIR, f"{job_id}.wav")
    mp3_path = os.path.join(config.OUTPUTS_DIR, f"{job_id}.mp3")
    peaks_path = os.path.join(config.OUTPUTS_DIR, f"{job_id}_peaks.txt")
    
    for path in [wav_path, mp3_path, peaks_path]:
        if os.path.exists(path):
            try:
                os.remove(path)
                logger.info(f"Deleted file: {path}")
            except Exception as e:
                logger.error(f"Error deleting file {path}: {e}")

def run_generation_job(
    job_id: str,
    chunks: List[dict],
    voice_path: str,
    exaggeration: float,
    cfg_weight: float,
    temperature: float,
    crossfade_ms: int
):
    """
    Runs the TTS generation job.
    Executes chunk generation sequentially, updates status/ETA, stitches audio, normalizes,
    and saves output files.
    """
    logger.info(f"Starting generation job {job_id} with {len(chunks)} chunks.")
    update_job_status(job_id, {"status": "in_progress", "start_time": time.time()})
    
    temp_dir = os.path.join(config.OUTPUTS_DIR, f"temp_{job_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    chunk_paths = []
    ends_paragraphs = [c["ends_paragraph"] for c in chunks]
    
    start_time = time.time()
    
    try:
        # Load model first to cache warm up time outside loop
        model = TTSEngine.get_model()
        
        # Prepare conditionals ONCE before entering the text chunk loop
        logger.info(f"Preparing voice conditionals once for: {voice_path}...")
        model.prepare_conditionals(voice_path, exaggeration=exaggeration)
        
        # Cast conditionals to float16 on MPS/CUDA
        if TTSEngine.device in ["mps", "cuda"] and model.conds is not None:
            logger.info(f"Casting prepared conditionals to float16 on {TTSEngine.device}...")
            model.conds.t3.speaker_emb = model.conds.t3.speaker_emb.to(dtype=torch.float16)
            model.conds.t3.emotion_adv = model.conds.t3.emotion_adv.to(dtype=torch.float16)
            
            # Set exaggeration to the exact float value stored in the FP16 emotion_adv tensor
            # to bypass precision comparison mismatches in ChatterboxTTS.generate()
            exaggeration = float(model.conds.t3.emotion_adv[0, 0, 0].item())

        for idx, chunk in enumerate(chunks):
            # Update current chunk state
            update_job_status(job_id, {
                f"chunk_statuses": [
                    "done" if i < idx else ("generating" if i == idx else "pending")
                    for i in range(len(chunks))
                ],
                "current_chunk_preview": chunk["text"][:60],
            })
            
            # Apply temperature jitter (±0.05)
            chunk_temp = temperature + random.uniform(-config.TEMPERATURE_JITTER, config.TEMPERATURE_JITTER)
            chunk_temp = max(0.1, min(1.0, chunk_temp))
            
            # Generate chunk reusing the pre-prepared conditionals
            wav_tensor = TTSEngine.generate(
                text=chunk["text"],
                audio_prompt_path=None,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight,
                temperature=chunk_temp
            )
            
            # Save chunk audio
            chunk_file = os.path.join(temp_dir, f"chunk_{idx}.wav")
            ta.save(chunk_file, wav_tensor, TTSEngine.sr)
            chunk_paths.append(chunk_file)
            
            # Update metrics
            elapsed = int(time.time() - start_time)
            chunks_done = idx + 1
            avg_time_per_chunk = elapsed / chunks_done
            eta = int(avg_time_per_chunk * (len(chunks) - chunks_done))
            
            update_job_status(job_id, {
                "chunks_done": chunks_done,
                "elapsed_sec": elapsed,
                "eta_sec": eta
            })
            
        # Stitch all chunks
        logger.info(f"Stitching {len(chunk_paths)} audio chunks for job {job_id}...")
        stitched = stitch_audio_chunks(chunk_paths, crossfade_ms=crossfade_ms, ends_paragraph_list=ends_paragraphs)
        
        # Normalize final audio to -3dB peak
        normalized = normalize_audio(stitched, target_dbfs=-3.0)
        
        # Save output WAV and MP3
        output_wav = os.path.join(config.OUTPUTS_DIR, f"{job_id}.wav")
        output_mp3 = os.path.join(config.OUTPUTS_DIR, f"{job_id}.mp3")
        
        normalized.export(output_wav, format="wav")
        normalized.export(output_mp3, format="mp3")
        
        # Generate waveform peak data
        peaks = generate_waveform_peaks(normalized, num_points=1000)
        output_peaks = os.path.join(config.OUTPUTS_DIR, f"{job_id}_peaks.txt")
        with open(output_peaks, "w") as f:
            f.write(",".join(map(str, peaks)))
            
        # Complete job
        update_job_status(job_id, {
            "status": "complete",
            "chunks_done": len(chunks),
            "chunk_statuses": ["done"] * len(chunks),
            "current_chunk_preview": None,
            "eta_sec": 0,
            "elapsed_sec": int(time.time() - start_time)
        })
        logger.info(f"Job {job_id} completed successfully.")
        
    except Exception as e:
        logger.error(f"Error in job {job_id}: {str(e)}", exc_info=True)
        update_job_status(job_id, {
            "status": "error",
            "error": str(e)
        })
    finally:
        # Clean up temporary chunk files
        if os.path.exists(temp_dir):
            for f in os.listdir(temp_dir):
                try:
                    os.remove(os.path.join(temp_dir, f))
                except Exception:
                    pass
            try:
                os.rmdir(temp_dir)
            except Exception:
                pass

def submit_generation_job(
    job_id: str,
    chunks: List[dict],
    voice_path: str,
    exaggeration: float,
    cfg_weight: float,
    temperature: float,
    crossfade_ms: int
):
    """
    Submits a new generation job to the sequential background executor.
    """
    job_executor.submit(
        run_generation_job,
        job_id,
        chunks,
        voice_path,
        exaggeration,
        cfg_weight,
        temperature,
        crossfade_ms
    )
