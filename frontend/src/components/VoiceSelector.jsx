import React, { useRef, useState, useEffect } from 'react';
import { Upload, Trash2, Play, Pause, AlertTriangle } from 'lucide-react';

export default function VoiceSelector({
  voiceHook,
  disabled
}) {
  const {
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    isUploading,
    uploadProgress,
    error,
    setError,
    uploadVoice,
    deleteVoice,
    selectedVoicePreviewUrl
  } = voiceHook;

  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Find currently selected voice details
  const selectedVoice = voices.find(v => v.voice_id === selectedVoiceId) || voices[0];

  // Sync playing states when audio source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [selectedVoiceId]);

  // Audio event listeners
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        console.error("Audio preview failed:", e);
        setError("Failed to play preview audio.");
      });
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileSelection(files[0]);
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      await handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = async (file) => {
    try {
      await uploadVoice(file);
    } catch (err) {
      // Error handled in hook, shown in UI
    }
  };

  const handleDelete = async (e, voiceId, filename) => {
    e.stopPropagation();
    if (disabled) return;
    if (window.confirm(`Are you sure you want to delete the voice "${filename}"?`)) {
      try {
        await deleteVoice(voiceId);
      } catch (err) {
        // Error handled in hook
      }
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col space-y-4 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold text-sm">
      <div className="flex justify-between items-center pb-2 border-b border-parchment-border">
        <h2 className="text-lg font-serif font-semibold text-parchment-gold tracking-wide">
          Voice Cloning Library
        </h2>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center space-x-2 text-xs text-parchment-error bg-parchment-error/10 border border-parchment-error/20 p-2.5 rounded">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragOver 
            ? 'border-parchment-gold bg-parchment-gold/5' 
            : 'border-parchment-border hover:border-parchment-gold/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".mp3,.wav"
          disabled={disabled}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-parchment-gold"></div>
            <span className="text-xs text-parchment-gold font-mono">Uploading... {uploadProgress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1.5 text-center">
            <Upload size={24} className="text-parchment-gold" />
            <span className="font-semibold text-parchment-text">Clone New Voice</span>
            <span className="text-xs text-parchment-textMuted">Drag & drop WAV or MP3, or click to browse</span>
            <span className="text-[10px] text-parchment-textMuted/60">(Limits: 1-120s duration, up to 50MB)</span>
          </div>
        )}
      </div>

      {/* Voice Selection Dropdown & List */}
      <div className="flex space-x-2">
        <select
          value={selectedVoiceId}
          onChange={(e) => setSelectedVoiceId(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-[#0D0C0A] text-parchment-text border border-parchment-border rounded px-3 py-2 outline-none focus:border-parchment-gold text-xs transition-colors duration-200"
        >
          {voices.map((v) => (
            <option key={v.voice_id} value={v.voice_id} className="bg-parchment-card">
              {v.filename} — {v.duration_sec}s
            </option>
          ))}
        </select>
        
        {selectedVoiceId !== 'default' && (
          <button
            onClick={(e) => handleDelete(e, selectedVoiceId, selectedVoice?.filename)}
            disabled={disabled}
            className="p-2 border border-parchment-border hover:border-parchment-error hover:text-parchment-error rounded text-parchment-textMuted transition-colors duration-200"
            title="Delete custom voice"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Mini Audio Preview Player */}
      {selectedVoicePreviewUrl && (
        <div className="bg-[#0D0C0A] border border-parchment-border/50 rounded p-3 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-xs text-parchment-textMuted font-mono">
            <span>Voice Preview: <strong className="text-parchment-gold font-normal">{selectedVoice?.filename}</strong></span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlayPause}
              className="p-1.5 bg-parchment-gold hover:bg-parchment-goldHover text-parchment-dark rounded-full transition-colors duration-200 focus:outline-none"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-[1px]" />}
            </button>
            
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 gold-slider cursor-pointer"
            />
            
            <span className="text-xs font-mono text-parchment-textMuted select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <audio
            ref={audioRef}
            src={selectedVoicePreviewUrl}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onAudioEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
