import { useState, useRef, useEffect } from 'react';

function ColorDropdown({ availableColors, selectedColor, onColorSelect, isSearching }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayColors = showAll ? availableColors : availableColors.slice(0, 5);

  const handleColorClick = (color) => {
    onColorSelect(color);
    setIsOpen(false);
  };

  const getSelectedColorDisplay = () => {
    if (!selectedColor) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-gray-400 bg-white"></div>
          <span>No color</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border-2 border-gray-400"
          style={{ backgroundColor: selectedColor }}
        ></div>
        <span>{selectedColor}</span>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSearching}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors ${isSearching ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {getSelectedColorDisplay()}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-2">
            {/* No color option */}
            <button
              onClick={() => handleColorClick(null)}
              className={`
                w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-gray-50
                ${!selectedColor ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
              `}
            >
              <div className="w-4 h-4 rounded-full border-2 border-gray-400 bg-white"></div>
              <span>No color</span>
              {!selectedColor && (
                <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Color options */}
            <div className="grid grid-cols-6 gap-2 mt-2">
              {displayColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorClick(color)}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all duration-200
                    ${selectedColor === color
                      ? 'border-blue-600 ring-2 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-500'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={`Filter by ${color}`}
                >
                  {selectedColor === color && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Show more/less toggle */}
            {availableColors.length > 5 && (
              <div className="pt-2 mt-2 border-t border-gray-200">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 py-1"
                >
                  {showAll ? 'Show less' : `Show all ${availableColors.length} colors`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder={isSearching ? "Searching..." : "Search images by tags or description..."}
              className={`block w-full pl-4 pr-16 py-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                isSearching ? 'opacity-75' : ''
              }`}
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              {isSearching ? (
                <svg
                  className="h-5 w-5 text-blue-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    className="opacity-75"
                  />
                </svg>
              ) : (
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
              )}
            </div>
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-12 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
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

        {/* Color Palette Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Colors:
          </span>
          {availableColors && availableColors.length > 0 ? (
            <ColorDropdown
              availableColors={availableColors}
              selectedColor={selectedColor}
              onColorSelect={onColorSelect}
              isSearching={isSearching}
            />
          ) : (
            <div className="text-sm text-gray-500 italic">
              Upload images to see color filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}