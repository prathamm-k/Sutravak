import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

import useVoiceLibrary from './hooks/useVoiceLibrary';
import useGeneration from './hooks/useGeneration';

import TextInput from './components/TextInput';
import GenerationControls from './components/GenerationControls';
import VoiceSelector from './components/VoiceSelector';
import GenerationProgress from './components/GenerationProgress';
import AudioPlayer from './components/AudioPlayer';
import SessionHistory from './components/SessionHistory';

export default function App() {
  const [text, setText] = useState('');
  const [params, setParams] = useState({
    exaggeration: 0.5,
    cfg_weight: 0.6,
    temperature: 0.75,
    chunk_size: 160,
    crossfade_ms: 4,
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('history_narration_tts_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load local history from localStorage:", e);
      return [];
    }
  });
  const [loadedJob, setLoadedJob] = useState(null);

  // Persist history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('history_narration_tts_history', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save local history to localStorage:", e);
    }
  }, [history]);

  const voiceHook = useVoiceLibrary();
  const generationHook = useGeneration();

  const {
    isGenerating,
    jobId,
    status,
    totalChunks,
    audioUrl,
    error: genError,
    generateVoiceover,
    resetGenerator,
  } = generationHook;

  // Handle successful generation completion to append to history
  useEffect(() => {
    if (status === 'complete' && jobId) {
      const exists = history.some((item) => item.jobId === jobId);
      if (!exists) {
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const durationSec = Math.max(5, Math.round((wordCount / 130) * 60));

        const newItem = {
          jobId,
          timestamp: Date.now(),
          previewText: text.trim().slice(0, 50) || 'Script',
          durationSec,
          params: { ...params, voice_id: voiceHook.selectedVoiceId },
          audioUrl: `/api/audio/${jobId}`,
        };

        setHistory((prev) => [newItem, ...prev]);
        setLoadedJob(newItem);
      }
    }
  }, [status, jobId]);

  const handleGenerate = async () => {
    if (!text || text.trim() === '') return;

    // Clear any previously loaded static job playing
    setLoadedJob(null);

    try {
      await generateVoiceover({
        text,
        ...params,
        voice_id: voiceHook.selectedVoiceId,
      });
    } catch (err) {
      console.error('Failed to trigger generation:', err);
    }
  };

  // Reload an historical generation into the player
  const handleReloadJob = (historicalJob) => {
    resetGenerator();
    setLoadedJob(historicalJob);
  };

  // Active audio parameters
  const activeAudioUrl = loadedJob ? loadedJob.audioUrl : audioUrl;
  const activeJobId = loadedJob ? loadedJob.jobId : jobId;

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 md:px-8 py-6">

      {/* Ancient Manuscript Style Header */}
      <header className="flex flex-col items-center text-center space-y-2 mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold tracking-wider text-parchment-gold hover:text-parchment-goldHover transition-colors duration-300">
          Sutravak
        </h1>
        <p className="text-xs md:text-sm font-serif italic text-parchment-textMuted tracking-widest max-w-lg uppercase">
          Documentary Voiceover Generation System
        </p>
        <div className="gold-divider w-64 md:w-96 mt-2" />
      </header>

      {/* Main Grid Interface */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Script and parameters */}
        <section className="lg:col-span-7 flex flex-col space-y-6">
          <TextInput
            text={text}
            setText={setText}
            disabled={isGenerating}
          />

          <GenerationControls
            params={params}
            setParams={setParams}
            disabled={isGenerating}
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating || text.trim() === ''}
            className="w-full py-4 px-6 bg-parchment-gold hover:bg-parchment-goldHover disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:cursor-not-allowed border border-parchment-border hover:border-parchment-gold text-parchment-dark font-serif font-semibold tracking-wider rounded-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(201,168,76,0.3)] flex items-center justify-center space-x-2"
          >
            <Sparkles size={18} />
            <span>
              {isGenerating ? 'Synthesizing Audio Chronicles...' : 'Generate Narration Voiceover'}
            </span>
          </button>
        </section>

        {/* Right Column: Voice selector, progress, audio player, history */}
        <section className="lg:col-span-5 flex flex-col space-y-6">
          <VoiceSelector
            voiceHook={voiceHook}
            disabled={isGenerating}
          />

          {isGenerating && (
            <GenerationProgress
              status={generationHook.status}
              chunksDone={generationHook.chunksDone}
              totalChunks={generationHook.totalChunks}
              currentChunkPreview={generationHook.currentChunkPreview}
              elapsedSec={generationHook.elapsedSec}
              etaSec={generationHook.etaSec}
              chunkStatuses={generationHook.chunkStatuses}
            />
          )}

          {/* Error state */}
          {genError && (
            <div className="bg-parchment-error/10 border border-parchment-error/20 rounded p-4 text-sm text-parchment-error">
              <h3 className="font-semibold font-serif mb-1">Generation Failed</h3>
              <p>{genError}</p>
            </div>
          )}

          {/* Custom Audio Player */}
          {activeAudioUrl && !isGenerating && (
            <AudioPlayer
              jobId={activeJobId}
              audioUrl={activeAudioUrl}
            />
          )}

          <SessionHistory
            history={history}
            setHistory={setHistory}
            currentJobId={activeJobId}
            onReloadJob={handleReloadJob}
          />
        </section>

      </main>

      {/* Decorative Footer */}
      <footer className="mt-auto py-8 text-center text-[10px] font-mono text-parchment-textMuted/40 border-t border-parchment-border/30">
        <p>SUTRAVAK · POWERED BY CHATTERBOX</p>
      </footer>

    </div>
  );
}
