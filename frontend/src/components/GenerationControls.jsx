import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const DEFAULTS = {
  exaggeration: 0.5,
  cfg_weight: 0.6,
  temperature: 0.75,
  chunk_size: 160,
  crossfade_ms: 4,
};

export default function GenerationControls({ params, setParams, disabled }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSliderChange = (key, val) => {
    setParams((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleReset = () => {
    setParams(DEFAULTS);
  };

  const tooltips = {
    exaggeration: "Controls emotional weight. Higher values produce more expressive, dramatic speech, while lower values sound flatter.",
    cfg_weight: "Voice Fidelity. Higher values force closer adherence to the reference voice characteristics, but too high can degrade audio quality.",
    temperature: "Speech variation and randomness. Higher values add style variation and phrasing changes; lower values are more predictable.",
    chunk_size: "Target token size for splitting scripts (1.3 tokens/word). Defines narration chunk sizes (~40-45 words).",
    crossfade_ms: "Duration of crossfade blending (in milliseconds) applied between stitched chunk WAV files.",
  };

  return (
    <div className="flex flex-col space-y-4 bg-parchment-card border border-parchment-border p-5 rounded-md glow-gold text-sm">
      <div className="flex justify-between items-center pb-2 border-b border-parchment-border">
        <h2 className="text-lg font-serif font-semibold text-parchment-gold tracking-wide">
          Parameters
        </h2>
        <button
          onClick={handleReset}
          disabled={disabled}
          className="flex items-center space-x-1 text-xs font-semibold uppercase tracking-wider text-parchment-textMuted hover:text-parchment-gold disabled:opacity-50 transition-colors duration-200"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Primary Parameters */}
      <div className="space-y-4">
        {/* Exaggeration Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-parchment-text flex items-center group relative cursor-help">
              Emotional Weight (exaggeration)
              <HelpCircle size={12} className="ml-1 text-parchment-textMuted group-hover:text-parchment-gold" />
              <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-60 bg-[#0D0C0A] text-parchment-text text-[10px] p-2 rounded border border-parchment-border z-10 font-sans leading-normal">
                {tooltips.exaggeration}
              </span>
            </span>
            <span className="font-mono text-parchment-gold font-bold">{params.exaggeration}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            disabled={disabled}
            value={params.exaggeration}
            onChange={(e) => handleSliderChange('exaggeration', parseFloat(e.target.value))}
            className="w-full gold-slider cursor-pointer"
          />
        </div>

        {/* CFG Weight Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-parchment-text flex items-center group relative cursor-help">
              Voice Fidelity (cfg_weight)
              <HelpCircle size={12} className="ml-1 text-parchment-textMuted group-hover:text-parchment-gold" />
              <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-60 bg-[#0D0C0A] text-parchment-text text-[10px] p-2 rounded border border-parchment-border z-10 font-sans leading-normal">
                {tooltips.cfg_weight}
              </span>
            </span>
            <span className="font-mono text-parchment-gold font-bold">{params.cfg_weight}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            disabled={disabled}
            value={params.cfg_weight}
            onChange={(e) => handleSliderChange('cfg_weight', parseFloat(e.target.value))}
            className="w-full gold-slider cursor-pointer"
          />
        </div>
      </div>

      {/* Advanced Collapsible Section */}
      <div className="border-t border-parchment-border/50 pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs font-semibold text-parchment-textMuted hover:text-parchment-gold transition-colors duration-200 py-1"
        >
          <span>Advanced Settings</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-3 transition-all duration-300">
            {/* Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-parchment-text flex items-center group relative cursor-help">
                  Speech Variation (temperature)
                  <HelpCircle size={12} className="ml-1 text-parchment-textMuted group-hover:text-parchment-gold" />
                  <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-60 bg-[#0D0C0A] text-parchment-text text-[10px] p-2 rounded border border-parchment-border z-10 font-sans leading-normal">
                    {tooltips.temperature}
                  </span>
                </span>
                <span className="font-mono text-parchment-gold font-bold">{params.temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                disabled={disabled}
                value={params.temperature}
                onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                className="w-full gold-slider cursor-pointer"
              />
            </div>

            {/* Chunk Size Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-parchment-text flex items-center group relative cursor-help">
                  Chunk Size (tokens)
                  <HelpCircle size={12} className="ml-1 text-parchment-textMuted group-hover:text-parchment-gold" />
                  <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-60 bg-[#0D0C0A] text-parchment-text text-[10px] p-2 rounded border border-parchment-border z-10 font-sans leading-normal">
                    {tooltips.chunk_size}
                  </span>
                </span>
                <span className="font-mono text-parchment-gold font-bold">{params.chunk_size}</span>
              </div>
              <input
                type="range"
                min="100"
                max="250"
                step="5"
                disabled={disabled}
                value={params.chunk_size}
                onChange={(e) => handleSliderChange('chunk_size', parseInt(e.target.value))}
                className="w-full gold-slider cursor-pointer"
              />
            </div>

            {/* Crossfade Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-parchment-text flex items-center group relative cursor-help">
                  Crossfade (ms)
                  <HelpCircle size={12} className="ml-1 text-parchment-textMuted group-hover:text-parchment-gold" />
                  <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-60 bg-[#0D0C0A] text-parchment-text text-[10px] p-2 rounded border border-parchment-border z-10 font-sans leading-normal">
                    {tooltips.crossfade_ms}
                  </span>
                </span>
                <span className="font-mono text-parchment-gold font-bold">{params.crossfade_ms}ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                disabled={disabled}
                value={params.crossfade_ms}
                onChange={(e) => handleSliderChange('crossfade_ms', parseInt(e.target.value))}
                className="w-full gold-slider cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
