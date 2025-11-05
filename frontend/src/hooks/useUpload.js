import { useState } from 'react';
import { imageService } from '../services/api';

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadImages = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await imageService.uploadImages(files, (progressPercent) => {
        setProgress(progressPercent);
      });

      setUploading(false);
      setProgress(100);
      return result;
    } catch (err) {
      setUploading(false);
      setProgress(0);
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return {
    uploading,
    progress,
    error,
    uploadImages,
    reset
  };
}