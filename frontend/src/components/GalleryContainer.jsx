import SearchBar from './SearchBar';
import SearchResultsIndicator from './SearchResultsIndicator';
import ImageGrid from './ImageGrid';

export default function GalleryContainer({
  images,
  loading,
  error,
  searchQuery,
  selectedColor,
  availableColors,
  isSearching,
  totalImages,
  activeFilter,
  onSearchChange,
  onSearchKeyDown,
  onClearSearch,
  onLoadImages,
  onTagClick,
  onColorClick,
  onColorSelect,
  onFindSimilar,
  onImageClick
}) {
  return (
    <div className="w-full">
      <div className="flex justify-center">
        <div className="w-full" style={{maxWidth: '1200px'}}>
          {/* Gallery Grid with integrated Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <SearchBar
              searchQuery={searchQuery}
              selectedColor={selectedColor}
              availableColors={availableColors}
              onSearchChange={onSearchChange}
              onSearchKeyDown={onSearchKeyDown}
              onClearSearch={onClearSearch}
              onColorSelect={onColorSelect}
              isSearching={isSearching}
            />

            <SearchResultsIndicator
              activeFilter={activeFilter}
              loading={loading}
              isSearching={isSearching}
              searchQuery={searchQuery}
              selectedColor={selectedColor}
              totalImages={totalImages}
              onClearSearch={onClearSearch}
              onShowAll={onLoadImages}
            />

            <ImageGrid
              images={images}
              loading={loading}
              isSearching={isSearching}
              error={error}
              searchQuery={searchQuery}
              onTagClick={onTagClick}
              onColorClick={onColorClick}
              onFindSimilar={onFindSimilar}
              onImageClick={onImageClick}
              onLoadImages={onLoadImages}
              onClearSearch={onClearSearch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}