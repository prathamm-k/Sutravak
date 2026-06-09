FROM python:3.11-slim

WORKDIR /app

ENV HF_HOME=/app/huggingface_cache

# Install system dependencies (ffmpeg is required by pydub for audio processing)
RUN apt-get update && apt-get install -y ffmpeg espeak-ng build-essential && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose FastAPI port
EXPOSE 9001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]
