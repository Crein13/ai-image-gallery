import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import UploadZone from '../components/UploadZone';
import { imageService, healthService } from '../services/api';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load images when component mounts
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // First check if backend is available
      try {
        await healthService.checkBackend();
      } catch (healthError) {
        setError('Backend server is not running. Please start the backend server first.');
        return;
      }

      const response = await imageService.getImages();
      setImages(response.items || []);
    } catch (err) {
      console.error('Error loading images:', err);

      // Handle different types of errors
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !err.response) {
        setError('Backend server is not running. Please start the backend server first.');
      } else if (err.response?.status === 404) {
        // Gallery endpoint not found - just show empty state without error
        setImages([]);
      } else if (err.response?.status === 401) {
        // Auth error - let the axios interceptor handle this
        setError('Authentication expired. Please refresh the page.');
      } else {
        // Other errors
        setError(`Failed to load images: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (result) => {
    // Add new images to the list
    if (result.images) {
      setImages(prevImages => [...result.images, ...prevImages]);
    }
    // Reload to get the latest images
    loadImages();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Images</h1>
          <p className="text-gray-600">Upload and manage your AI-tagged images</p>
        </div>

        {/* Upload Section - Always Visible */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-5xl w-full">
            <UploadZone onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>

        {/* Search Bar - Placeholder */}
        <div className="mt-8 flex justify-center">
          <div className="max-w-md w-full">
            <label htmlFor="search" className="sr-only">Search images</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search images by tags or description..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-auto max-w-5xl">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading images...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
              <p className="text-red-600 mb-4">{error}</p>
              {error.includes('Backend server is not running') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Backend Server Required</h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        To use the gallery, please start the backend server by running:
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={loadImages}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : images.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
              <p className="text-gray-500 mb-4">
                Upload your first images to see them appear here with AI-generated tags and descriptions.
              </p>
            </div>
          ) : (
            <div className="p-6 flex justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center max-w-5xl w-full">
                {images.map((image) => (
                  <div key={image.id} className="bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-200 flex items-center justify-center">
                      {image.thumbnail_path ? (
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:4000'}/storage/v1/object/public/${import.meta.env.SUPABASE_BUCKET || 'ai-image-gallery'}/${image.thumbnail_path}`}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{image.filename}</h4>
                      {image.metadata && (
                        <div className="mt-2">
                          {image.metadata.ai_processing_status === 'completed' ? (
                            <>
                              {image.metadata.description && (
                                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                                  {image.metadata.description}
                                </p>
                              )}
                              {image.metadata.tags && image.metadata.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {image.metadata.tags.slice(0, 3).map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {image.metadata.tags.length > 3 && (
                                    <span className="inline-block text-xs text-gray-500 px-2 py-1">
                                      +{image.metadata.tags.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}