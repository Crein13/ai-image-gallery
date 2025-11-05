export default function SearchBar({
  searchQuery,
  selectedColor,
  availableColors,
  onSearchChange,
  onSearchKeyDown,
  onClearSearch,
  onColorSelect,
  isSearching
}) {
  return (
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <label htmlFor="search" className="sr-only">Search images</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
              value={searchQuery}
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="Search images by tags or description..."
              className="block w-full pl-16 pr-12 py-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isSearching}
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                title="Clear search"
              >
                <svg
                  className="h-4 w-4 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Color Palette */}
        {availableColors && availableColors.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Colors:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto max-w-xs">
              {availableColors.slice(0, 10).map((color) => (
                <button
                  key={color}
                  onClick={() => onColorSelect(color)}
                  disabled={isSearching}
                  className={`
                    flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200
                    hover:scale-110 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
                    ${selectedColor === color
                      ? 'border-blue-600 shadow-lg scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={`Filter by ${color} color`}
                  aria-label={`Filter by ${color} color`}
                >
                  {selectedColor === color && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white drop-shadow-sm"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedColor && (
              <button
                onClick={() => onColorSelect(null)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors whitespace-nowrap"
                disabled={isSearching}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}