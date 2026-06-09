import React from 'react';
import { Trash2, AudioLines } from 'lucide-react';
import client from '../api/client';

export default function SessionHistory({ history, setHistory, currentJobId, onReloadJob }) {
  const handleDelete = async (e, jobId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this generation? This will delete the audio files from disk.")) {
      try {
        await client.delete(`/job/${jobId}`);
        // Remove from local state history
        setHistory((prev) => prev.filter((item) => item.jobId !== jobId));
      } catch (err) {
        console.error("Failed to delete job audio files:", err);
        alert("Failed to delete job audio files from server.");
      }
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold text-sm h-36">
        <AudioLines size={24} className="text-parchment-textMuted/40" />
        <span className="text-parchment-textMuted text-xs">No generations in history yet.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold text-sm max-h-[30rem] overflow-y-auto">
      <div className="flex justify-between items-center pb-2 border-b border-parchment-border">
        <h2 className="text-lg font-serif font-semibold text-parchment-gold tracking-wide">
          Local History
        </h2>
        <span className="text-xs font-mono text-parchment-textMuted">
          {history.length} {history.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="space-y-2">
        {history.map((item) => {
          const isActive = item.jobId === currentJobId;
          const dateStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          return (
            <div
              key={item.jobId}
              onClick={() => onReloadJob(item)}
              className={`p-3 rounded border text-xs cursor-pointer transition-all duration-200 flex justify-between items-start space-x-3 group ${
                isActive
                  ? 'border-parchment-gold bg-parchment-gold/5 shadow-[inset_0_0_8px_rgba(201,168,76,0.05)]'
                  : 'border-parchment-border hover:border-parchment-gold/50 bg-[#0D0C0A]/40'
              }`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-parchment-textMuted">{dateStr}</span>
                  <span className="text-[10px] font-mono text-parchment-gold font-semibold">
                    {formatTime(item.durationSec)}
                  </span>
                </div>
                
                <p className="text-parchment-text font-serif italic truncate">
                  "{item.previewText}..."
                </p>

                {/* Param details tags */}
                <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-mono text-parchment-textMuted/80">
                  <span className="bg-parchment-border/40 px-1 py-0.5 rounded">e:{item.params.exaggeration}</span>
                  <span className="bg-parchment-border/40 px-1 py-0.5 rounded">cfg:{item.params.cfg_weight}</span>
                  <span className="bg-parchment-border/40 px-1 py-0.5 rounded">t:{item.params.temperature}</span>
                  <span className="bg-parchment-border/40 px-1 py-0.5 rounded">c:{item.params.chunk_size}</span>
                  <span className="bg-parchment-border/40 px-1 py-0.5 rounded">cf:{item.params.crossfade_ms}ms</span>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(e, item.jobId)}
                className="p-1 text-parchment-textMuted hover:text-parchment-error rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 shrink-0 self-center"
                title="Delete item"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
