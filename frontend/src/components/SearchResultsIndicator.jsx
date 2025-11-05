export default function SearchResultsIndicator({
  activeFilter,
  loading,
  isSearching,
  searchQuery,
  selectedColor,
  totalImages,
  onClearSearch,
  onShowAll
}) {
  if (!activeFilter || loading || isSearching) {
    return null;
  }

  const getResultsText = () => {
    if (activeFilter === 'both' && searchQuery && selectedColor) {
      return totalImages > 0
        ? `Found ${totalImages} image${totalImages === 1 ? '' : 's'} matching "${searchQuery}" with this color`
        : `No images found for "${searchQuery}" with this color`;
    } else if (activeFilter === 'search' && searchQuery) {
      return totalImages > 0
        ? `Found ${totalImages} image${totalImages === 1 ? '' : 's'} matching "${searchQuery}"`
        : `No images found for "${searchQuery}"`;
    } else if (activeFilter === 'similar') {
      return `Showing ${totalImages} similar image${totalImages === 1 ? '' : 's'}`;
    } else if (activeFilter === 'color' && selectedColor) {
      return totalImages > 0
        ? `Found ${totalImages} image${totalImages === 1 ? '' : 's'} with this color`
        : `No images found with this color`;
    }
    return 'Showing filtered results';
  };

  const getButtonText = () => {
    if (activeFilter === 'search' || activeFilter === 'both') {
      return 'Clear search';
    }
    return 'Show all images';
  };

  const handleButtonClick = () => {
    if (activeFilter === 'search' || activeFilter === 'both') {
      onClearSearch();
    } else {
      onShowAll();
    }
  };

  return (
    <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
      <div className="flex items-center justify-between">
        <p className="text-sm text-blue-700">
          {getResultsText()}
        </p>
        <button
          onClick={handleButtonClick}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}