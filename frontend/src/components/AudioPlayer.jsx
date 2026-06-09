import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';
import client from '../api/client';

export default function AudioPlayer({ jobId, audioUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [peaks, setPeaks] = useState([]);
  const [loadingWaveform, setLoadingWaveform] = useState(false);

  // Fetch pre-computed waveform peaks from backend
  useEffect(() => {
    if (!jobId) return;
    
    const fetchWaveform = async () => {
      setLoadingWaveform(true);
      try {
        const response = await client.get(`/waveform/${jobId}`);
        setPeaks(response.data.peaks);
      } catch (err) {
        console.error("Error fetching waveform data:", err);
        // Fallback: generate a default mock waveform if fetch fails
        const mockPeaks = Array.from({ length: 1000 }, () => Math.random() * 0.7 + 0.1);
        setPeaks(mockPeaks);
      } finally {
        setLoadingWaveform(false);
      }
    };
    
    fetchWaveform();
  }, [jobId]);

  // Sync play states when audioUrl changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Keyboard shortcuts (Space to play/pause, ArrowLeft/ArrowRight to seek ±5s)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key events when typing in inputs/textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeekRelative(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, currentTime, duration]);

  // Play/Pause toggler
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
      });
    }
  };

  const handleSeekRelative = (seconds) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    audioRef.current.currentTime = time;
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
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

  // Convert raw peaks (1000 points) to display peaks (100 bars)
  const getDisplayBars = () => {
    if (peaks.length === 0) return Array.from({ length: 100 }, () => 0.1);
    
    const displayCount = 100;
    const step = Math.floor(peaks.length / displayCount);
    const bars = [];
    
    for (let i = 0; i < displayCount; i++) {
      const startIdx = i * step;
      const endIdx = startIdx + step;
      const subset = peaks.slice(startIdx, endIdx);
      const avg = subset.reduce((sum, val) => sum + val, 0) / (subset.length || 1);
      bars.push(Math.max(0.05, avg)); // minimum bar height of 5%
    }
    
    return bars;
  };

  const displayBars = getDisplayBars();
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progressRatio * displayBars.length);

  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle clicking on a specific bar in the waveform to seek
  const handleWaveformClick = (e, index) => {
    if (!audioRef.current || duration === 0) return;
    const ratio = index / displayBars.length;
    const seekTime = ratio * duration;
    setCurrentTime(seekTime);
    audioRef.current.currentTime = seekTime;
  };

  return (
    <div className="flex flex-col space-y-4 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold text-sm">
      <div className="flex justify-between items-center pb-2 border-b border-parchment-border">
        <h2 className="text-lg font-serif font-semibold text-parchment-gold tracking-wide">
          Audio Player
        </h2>
        
        {/* Playback speed selector */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <span className="text-parchment-textMuted text-[10px] uppercase tracking-wider">Speed:</span>
          {[0.75, 1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-1.5 py-0.5 rounded border transition-colors duration-200 ${
                playbackSpeed === speed
                  ? 'border-parchment-gold text-parchment-gold bg-parchment-gold/5'
                  : 'border-parchment-border text-parchment-textMuted hover:text-parchment-text'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Waveform Visualization */}
      <div className="bg-[#0D0C0A] border border-parchment-border/40 rounded p-4 flex flex-col justify-end h-28 relative overflow-hidden group">
        {loadingWaveform ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="text-xs font-mono text-parchment-gold animate-pulse">Computing peaks...</span>
          </div>
        ) : null}
        
        <div className="flex items-end justify-between w-full h-16 space-x-[2px]">
          {displayBars.map((val, idx) => {
            const isPlayed = idx <= activeBarIndex;
            return (
              <div
                key={idx}
                onClick={(e) => handleWaveformClick(e, idx)}
                style={{ height: `${val * 100}%` }}
                className={`flex-1 rounded-t-sm cursor-pointer transition-all duration-150 origin-bottom hover:scale-y-110 ${
                  isPlayed 
                    ? 'bg-parchment-gold shadow-[0_0_4px_rgba(201,168,76,0.3)]' 
                    : 'bg-zinc-800 border-t border-zinc-700'
                }`}
                title={`Seek to ${formatTime((idx / displayBars.length) * duration)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Seek & Play Controls */}
      <div className="flex items-center justify-between space-x-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="p-3 bg-parchment-gold hover:bg-parchment-goldHover text-parchment-dark rounded-full transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none shrink-0"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="translate-x-[1px]" />}
        </button>

        {/* Custom seek range bar */}
        <div className="flex-1 flex flex-col space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="w-full gold-slider cursor-pointer"
          />
          <div className="flex justify-between text-xs font-mono text-parchment-textMuted select-none">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={toggleMute}
            className="text-parchment-textMuted hover:text-parchment-gold transition-colors duration-200"
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 gold-slider cursor-pointer"
          />
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Download Action Buttons */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-parchment-border/50">
        <a
          href={`/api/audio/${jobId}`}
          download={`narration_${jobId}.wav`}
          className="flex items-center justify-center space-x-2 py-2 px-4 border border-parchment-border hover:border-parchment-gold hover:text-parchment-gold rounded text-xs font-semibold uppercase tracking-wider text-parchment-text transition-all duration-200"
        >
          <Download size={14} />
          <span>Download WAV</span>
        </a>
        <a
          href={`/api/audio/${jobId}/mp3`}
          download={`narration_${jobId}.mp3`}
          className="flex items-center justify-center space-x-2 py-2 px-4 border border-parchment-border hover:border-parchment-gold hover:text-parchment-gold rounded text-xs font-semibold uppercase tracking-wider text-parchment-text transition-all duration-200"
        >
          <Download size={14} />
          <span>Download MP3</span>
        </a>
      </div>
    </div>
  );
}
