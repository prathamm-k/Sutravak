from pydantic import BaseModel, Field
from typing import List, Optional

# POST /api/generate
class GenerateRequest(BaseModel):
    text: str
    exaggeration: float = Field(0.5, ge=0.1, le=1.0)
    cfg_weight: float = Field(0.6, ge=0.1, le=1.0)
    temperature: float = Field(0.75, ge=0.1, le=1.0)
    chunk_size: int = Field(160, ge=100, le=250)
    crossfade_ms: int = Field(4, ge=0, le=100)
    voice_id: str = "default"

class GenerateResponse(BaseModel):
    job_id: str
    total_chunks: int
    estimated_duration_sec: int

# GET /api/status/{job_id}
class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # pending, in_progress, complete, error
    chunks_done: int
    total_chunks: int
    current_chunk_preview: Optional[str] = None
    elapsed_sec: int
    eta_sec: int
    chunk_statuses: List[str]  # pending, generating, done, error
    error: Optional[str] = None

# GET /api/waveform/{job_id}
class WaveformResponse(BaseModel):
    peaks: List[float]

# Voice entry schema
class VoiceInfo(BaseModel):
    voice_id: str
    filename: str
    duration_sec: float
    is_default: bool

# GET /api/voices
class VoicesResponse(BaseModel):
    voices: List[VoiceInfo]

# POST /api/voices/upload
class UploadedVoiceInfo(BaseModel):
    voice_id: str
    filename: str
    duration_sec: float
    size_bytes: int

class VoiceUploadResponse(BaseModel):
    uploaded: List[UploadedVoiceInfo]
    errors: List[str]

# GET /api/health
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
