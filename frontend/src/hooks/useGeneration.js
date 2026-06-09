import { useState, useEffect, useRef, useCallback } from 'react';
import client from '../api/client';

export default function useGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null); // pending, in_progress, complete, error
  const [chunksDone, setChunksDone] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunkPreview, setCurrentChunkPreview] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [etaSec, setEtaSec] = useState(0);
  const [chunkStatuses, setChunkStatuses] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const pollingIntervalRef = useRef(null);

  // Clears the polling interval
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Polls the job status endpoint
  const pollStatus = useCallback(async (id) => {
    try {
      const response = await client.get(`/status/${id}`);
      const data = response.data;

      setStatus(data.status);
      setChunksDone(data.chunks_done);
      setTotalChunks(data.total_chunks);
      setCurrentChunkPreview(data.current_chunk_preview || '');
      setElapsedSec(data.elapsed_sec);
      setEtaSec(data.eta_sec);
      setChunkStatuses(data.chunk_statuses || []);

      if (data.status === 'complete') {
        stopPolling();
        setIsGenerating(false);
        setAudioUrl(`/api/audio/${id}`);
      } else if (data.status === 'error') {
        stopPolling();
        setIsGenerating(false);
        setError(data.error || 'Speech generation failed.');
      }
    } catch (err) {
      console.error('Error polling job status:', err);
      // We don't stop polling immediately on a single network failure,
      // but if the job itself is missing, we stop.
      if (err.response?.status === 404) {
        stopPolling();
        setIsGenerating(false);
        setError('Job not found on server.');
      }
    }
  }, [stopPolling]);

  // Start polling for a specific jobId
  const startPolling = useCallback((id) => {
    stopPolling();
    setJobId(id);
    setIsGenerating(true);
    pollStatus(id); // Poll once immediately
    pollingIntervalRef.current = setInterval(() => {
      pollStatus(id);
    }, 2000);
  }, [pollStatus, stopPolling]);

  // Submits a text generation job
  const generateVoiceover = useCallback(async (params) => {
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setStatus('pending');
    setChunksDone(0);
    setTotalChunks(0);
    setCurrentChunkPreview('');
    setElapsedSec(0);
    setEtaSec(0);
    setChunkStatuses([]);

    try {
      const response = await client.post('/generate', params);
      const { job_id } = response.data;
      startPolling(job_id);
      return job_id;
    } catch (err) {
      console.error('Error initiating generation:', err);
      setIsGenerating(false);
      setStatus(null);
      const msg = err.response?.data?.detail || 'Failed to start generation job.';
      setError(msg);
      throw new Error(msg);
    }
  }, [startPolling]);

  // Reset the generator state
  const resetGenerator = useCallback(() => {
    stopPolling();
    setIsGenerating(false);
    setJobId(null);
    setStatus(null);
    setChunksDone(0);
    setTotalChunks(0);
    setCurrentChunkPreview('');
    setElapsedSec(0);
    setEtaSec(0);
    setChunkStatuses([]);
    setAudioUrl(null);
    setError(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isGenerating,
    jobId,
    status,
    chunksDone,
    totalChunks,
    currentChunkPreview,
    elapsedSec,
    etaSec,
    chunkStatuses,
    audioUrl,
    error,
    generateVoiceover,
    resetGenerator,
  };
}
