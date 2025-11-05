import { useEffect } from 'react';

export default function ImageModal({ image, isOpen, onClose, onFindSimilar, isSearching }) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const imageUrl = image.original_path
    ? `${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:4000'}/storage/v1/object/public/${import.meta.env.SUPABASE_BUCKET || 'ai-image-gallery'}/${image.original_path}`
    : null;

  const thumbnailUrl = image.thumbnail_path
    ? `${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:4000'}/storage/v1/object/public/${import.meta.env.SUPABASE_BUCKET || 'ai-image-gallery'}/${image.thumbnail_path}`
    : null;

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 truncate pr-4">
              {image.filename}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {/* Image Section - Takes up 2/3 of the width on large screens */}
              <div className="lg:col-span-1 xl:col-span-2 space-y-4">
                <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px] max-h-[600px]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={image.filename}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      style={{
                        imageOrientation: 'from-image',
                        maxHeight: '600px',
                        width: 'auto',
                        height: 'auto'
                      }}
                      onError={(e) => {
                        // Fallback to thumbnail if original fails
                        if (thumbnailUrl && e.target.src !== thumbnailUrl) {
                          e.target.src = thumbnailUrl;
                        } else {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm">Image not available</p>
                    </div>
                  </div>
                </div>

                {/* Find Similar Button */}
                {image.metadata?.ai_processing_status === 'completed' && (
                  <button
                    onClick={() => {
                      onFindSimilar(image.id);
                      onClose(); // Close modal after finding similar
                    }}
                    disabled={isSearching}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSearching ? 'Searching...' : 'Find Similar Images'}
                  </button>
                )}
              </div>

              {/* Details Section - Takes up 1/3 of the width on large screens */}
              <div className="lg:col-span-1 xl:col-span-1 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Image Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Filename:</span>
                      <span className="text-gray-900 font-medium">{image.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">File Size:</span>
                      <span className="text-gray-900">{formatFileSize(image.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="text-gray-900">{image.mime_type || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uploaded:</span>
                      <span className="text-gray-900">{formatDate(image.uploaded_at)}</span>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                {image.metadata && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Analysis</h3>

                    {image.metadata.ai_processing_status === 'completed' ? (
                      <div className="space-y-4">
                        {/* Description */}
                        {image.metadata.description && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                              {image.metadata.description}
                            </p>
                          </div>
                        )}

                        {/* Tags */}
                        {image.metadata.tags && image.metadata.tags.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Tags ({image.metadata.tags.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {image.metadata.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Colors */}
                        {image.metadata.colors && image.metadata.colors.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Color Palette ({image.metadata.colors.length})
                            </h4>
                            <div className="grid grid-cols-5 gap-2">
                              {image.metadata.colors.map((color, index) => (
                                <div key={index} className="text-center">
                                  <div
                                    className="w-12 h-12 rounded-lg border border-gray-300 mx-auto mb-1"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-xs text-gray-600 font-mono">
                                    {color}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dominant Color */}
                        {image.metadata.dominant_color && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Dominant Color</h4>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full border border-gray-300"
                                style={{ backgroundColor: image.metadata.dominant_color }}
                              />
                              <span className="text-sm text-gray-600 font-mono">
                                {image.metadata.dominant_color}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Processing Date */}
                        {image.metadata.created_at && (
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                            AI processed on {formatDate(image.metadata.created_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <div className="flex items-center">
                          {image.metadata.ai_processing_status === 'processing' ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              AI analysis in progress...
                            </>
                          ) : (
                            <span>AI analysis {image.metadata.ai_processing_status || 'pending'}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}