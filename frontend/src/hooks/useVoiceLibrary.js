import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export default function useVoiceLibrary() {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('default');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Fetch all voices from backend
  const fetchVoices = useCallback(async () => {
    try {
      setError(null);
      const response = await client.get('/voices');
      setVoices(response.data.voices);
      
      // Verify if currently selected voice still exists, otherwise fallback to default
      const exists = response.data.voices.some(v => v.voice_id === selectedVoiceId);
      if (!exists && selectedVoiceId !== 'default') {
        setSelectedVoiceId('default');
      }
    } catch (err) {
      console.error('Error fetching voice library:', err);
      setError(err.response?.data?.detail || 'Failed to load voice library.');
    }
  }, [selectedVoiceId]);

  // Load voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);

  // Upload a voice file
  const uploadVoice = useCallback(async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('files', file);

    try {
      const response = await client.post('/voices/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      const { uploaded, errors } = response.data;
      
      // Fetch latest voice list
      await fetchVoices();

      if (errors && errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      if (uploaded && uploaded.length > 0) {
        // Auto-select the newly uploaded voice
        const newVoiceId = uploaded[0].voice_id;
        setSelectedVoiceId(newVoiceId);
        return uploaded[0];
      }
    } catch (err) {
      console.error('Error uploading voice file:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to upload voice.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [fetchVoices]);

  // Delete a voice
  const deleteVoice = useCallback(async (voiceId) => {
    if (voiceId === 'default') return;

    setError(null);
    try {
      await client.delete(`/voices/${voiceId}`);
      
      // Auto-fallback to default if deleted voice was selected
      if (selectedVoiceId === voiceId) {
        setSelectedVoiceId('default');
      }
      
      await fetchVoices();
    } catch (err) {
      console.error('Error deleting voice:', err);
      const msg = err.response?.data?.detail || 'Failed to delete voice.';
      setError(msg);
      throw new Error(msg);
    }
  }, [selectedVoiceId, fetchVoices]);

  // Calculate selected voice preview URL
  const selectedVoicePreviewUrl = selectedVoiceId
    ? `/api/voices/${selectedVoiceId}/audio`
    : null;

  return {
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    isUploading,
    uploadProgress,
    error,
    setError,
    uploadVoice,
    deleteVoice,
    selectedVoicePreviewUrl,
    refreshVoices: fetchVoices
  };
}
