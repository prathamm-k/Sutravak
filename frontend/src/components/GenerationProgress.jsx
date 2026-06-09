import React from 'react';

export default function GenerationProgress({
  status,
  chunksDone,
  totalChunks,
  currentChunkPreview,
  elapsedSec,
  etaSec,
  chunkStatuses,
}) {
  if (!status || status === 'complete') return null;

  const progressPercentage = totalChunks > 0 ? (chunksDone / totalChunks) * 100 : 0;

  const formatTime = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusColorClass = (chunkStatus) => {
    switch (chunkStatus) {
      case 'done':
        return 'bg-parchment-success border-parchment-success';
      case 'generating':
        return 'bg-parchment-gold border-parchment-gold animate-pulse shadow-[0_0_8px_rgba(201,168,76,0.5)]';
      case 'error':
        return 'bg-parchment-error border-parchment-error';
      case 'pending':
      default:
        return 'bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col space-y-4 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold text-sm">
      <div className="flex justify-between items-center pb-2 border-b border-parchment-border">
        <h2 className="text-lg font-serif font-semibold text-parchment-gold tracking-wide">
          Generation Status
        </h2>
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-parchment-gold animate-pulse">
          {status === 'pending' ? 'Queued' : 'Synthesizing'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-parchment-textMuted">
          <span>Overall Progress</span>
          <span>{chunksDone} / {totalChunks} Chunks ({Math.round(progressPercentage)}%)</span>
        </div>
        <div className="w-full bg-[#0D0C0A] rounded-full h-2.5 overflow-hidden border border-parchment-border/50">
          <div
            className="bg-parchment-gold h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Time Stats */}
      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div className="bg-[#0D0C0A] p-2.5 rounded border border-parchment-border/50">
          <span className="block text-[10px] uppercase tracking-wider text-parchment-textMuted/60 mb-0.5">Elapsed Time</span>
          <span className="text-parchment-text font-semibold">{formatTime(elapsedSec)}</span>
        </div>
        <div className="bg-[#0D0C0A] p-2.5 rounded border border-parchment-border/50">
          <span className="block text-[10px] uppercase tracking-wider text-parchment-textMuted/60 mb-0.5">Estimated ETA</span>
          <span className="text-parchment-gold font-semibold">{status === 'pending' ? '--:--' : formatTime(etaSec)}</span>
        </div>
      </div>

      {/* Chunk preview */}
      {currentChunkPreview && (
        <div className="bg-[#0D0C0A] border border-parchment-border/50 rounded p-3 text-xs leading-relaxed">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-parchment-textMuted/60 mb-1">
            Current Chunk Text
          </span>
          <p className="text-parchment-text font-serif italic">
            "{currentChunkPreview}..."
          </p>
        </div>
      )}

      {/* Chunk Status Grid */}
      <div className="space-y-2">
        <span className="block text-[10px] font-mono uppercase tracking-wider text-parchment-textMuted/60">
          Chunk Queue Grid
        </span>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {chunkStatuses.map((chunkStatus, idx) => (
            <div
              key={idx}
              className={`h-7 rounded border text-[10px] font-mono flex items-center justify-center font-semibold text-[#0D0C0A] transition-all duration-300 ${getStatusColorClass(chunkStatus)}`}
              title={`Chunk ${idx + 1}: ${chunkStatus}`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
