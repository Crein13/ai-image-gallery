export default function ImageCard({
  image,
  onTagClick,
  onColorClick,
  onFindSimilar,
  onImageClick,
  isSearching
}) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div
        className="aspect-square bg-gray-200 flex items-center justify-center cursor-pointer"
        onClick={() => onImageClick && onImageClick(image)}
      >
        {image.thumbnail_path ? (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:4000'}/storage/v1/object/public/${import.meta.env.SUPABASE_BUCKET || 'ai-image-gallery'}/${image.thumbnail_path}`}
            alt={image.filename}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
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
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 truncate mb-2">{image.filename}</h4>
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
                      <button
                        key={index}
                        onClick={() => onTagClick(tag)}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                        title={`Search for images with "${tag}" tag`}
                      >
                        {tag}
                      </button>
                    ))}
                    {image.metadata.tags.length > 3 && (
                      <span className="inline-block text-xs text-gray-500 px-2 py-1">
                        +{image.metadata.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Color Palette */}
                {image.metadata.colors && image.metadata.colors.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-gray-500 mr-1">Colors:</span>
                    {image.metadata.colors.slice(0, 5).map((color, index) => (
                      <button
                        key={index}
                        onClick={() => onColorClick(color)}
                        className="w-4 h-4 rounded-full border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={`Search for images with ${color} color`}
                      />
                    ))}
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

        {/* Find Similar Button */}
        {image.metadata?.ai_processing_status === 'completed' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => onFindSimilar(image.id)}
              disabled={isSearching}
              className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find Similar Images
            </button>
          </div>
        )}
      </div>
    </div>
  );
}