import React from 'react';

export default function TextInput({ text, setText, disabled }) {
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  // Estimate tokens (1.3 tokens per word) and chunks (target 180 tokens per chunk)
  const estimatedTokens = Math.round(wordCount * 1.3);
  const estimatedChunks = wordCount === 0 ? 0 : Math.ceil(estimatedTokens / 180);
  
  // Estimate duration (words / 130 words/minute)
  const estMinutes = Math.floor(wordCount / 130);
  const estSeconds = Math.round(((wordCount / 130) % 1) * 60);
  const durationStr = `${estMinutes}m ${estSeconds}s`;

  const handleClear = () => {
    setText('');
  };

  return (
    <div className="flex flex-col space-y-2 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold">
      <div className="flex justify-between items-center pb-2 border-b border-parchment-border">
        <h2 className="text-lg font-serif font-semibold text-parchment-gold tracking-wide">
          Manuscript Script
        </h2>
        {text && !disabled && (
          <button
            onClick={handleClear}
            className="text-xs font-semibold uppercase tracking-wider text-parchment-textMuted hover:text-parchment-gold transition-colors duration-200"
          >
            Clear Script
          </button>
        )}
      </div>
      
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or write your history documentary narration script here... Be sure to use standard punctuation like periods, exclamation marks, or question marks to define sentence boundaries."
          disabled={disabled}
          className="w-full h-80 bg-[#0D0C0A] text-parchment-text border border-parchment-border rounded p-4 outline-none focus:border-parchment-gold focus:ring-1 focus:ring-parchment-gold transition-all duration-300 resize-none font-inter text-sm leading-relaxed"
        />
      </div>

      {charCount > 10000 && (
        <div className="text-xs text-parchment-error bg-parchment-error/10 border border-parchment-error/20 p-2.5 rounded">
          ⚠️ Warning: Script exceeds 10,000 characters. Large script generation might take several minutes.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs text-parchment-textMuted font-mono">
        <div className="bg-[#0D0C0A] p-2.5 rounded border border-parchment-border/50">
          <span className="block text-[10px] uppercase tracking-wider text-parchment-textMuted/60 mb-0.5">Characters</span>
          <span className="text-parchment-text font-semibold text-sm">{charCount.toLocaleString()}</span>
        </div>
        <div className="bg-[#0D0C0A] p-2.5 rounded border border-parchment-border/50">
          <span className="block text-[10px] uppercase tracking-wider text-parchment-textMuted/60 mb-0.5">Word Count</span>
          <span className="text-parchment-text font-semibold text-sm">{wordCount.toLocaleString()}</span>
        </div>
        <div className="bg-[#0D0C0A] p-2.5 rounded border border-parchment-border/50">
          <span className="block text-[10px] uppercase tracking-wider text-parchment-textMuted/60 mb-0.5">Est. Duration</span>
          <span className="text-parchment-gold font-semibold text-sm">{durationStr}</span>
        </div>
        <div className="bg-[#0D0C0A] p-2.5 rounded border border-parchment-border/50">
          <span className="block text-[10px] uppercase tracking-wider text-parchment-textMuted/60 mb-0.5">Est. Chunks</span>
          <span className="text-parchment-gold font-semibold text-sm">{estimatedChunks}</span>
        </div>
      </div>
    </div>
  );
}
