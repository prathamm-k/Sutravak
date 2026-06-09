FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build 

FROM python:3.11-slim
WORKDIR /app

ENV HF_HOME=/app/huggingface_cache

RUN apt-get update && apt-get install -y ffmpeg espeak-ng build-essential && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

COPY --from=frontend-builder /frontend/dist /app/dist

EXPOSE 9001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]
