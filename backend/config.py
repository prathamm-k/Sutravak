import os

# Base Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
VOICES_DIR = os.path.join(BASE_DIR, "voices")

DEFAULT_REFERENCE_AUDIO = os.path.join(ASSETS_DIR, "audio_prompt.mp3")

# Validation Constraints
MAX_TEXT_LENGTH = 50000  # characters
MAX_VOICE_FILE_SIZE_MB = 50
MIN_VOICE_DURATION_SEC = 1.0
MAX_VOICE_DURATION_SEC = 120.0
ALLOWED_VOICE_EXTENSIONS = {".mp3", ".wav"}

# Default Inference Parameters
DEFAULT_EXAGGERATION = 0.5
DEFAULT_CFG_WEIGHT = 0.6
DEFAULT_TEMPERATURE = 0.75
DEFAULT_CHUNK_SIZE = 160  # tokens (approx)
DEFAULT_CROSSFADE_MS = 4

# Stability & Stitching parameters
TEMPERATURE_JITTER = 0.05  # random ±jitter per chunk for naturalness
PARAGRAPH_SILENCE_MS = 120
