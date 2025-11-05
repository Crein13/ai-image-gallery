import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import UploadZone from '../components/UploadZone';
import GalleryContainer from '../components/GalleryContainer';
import ImageModal from '../components/ImageModal';
import { imageService, healthService } from '../services/api';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [allImages, setAllImages] = useState([]); // Store all images for color extraction
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalImages, setTotalImages] = useState(0);
  const [activeFilter, setActiveFilter] = useState(null); // 'search', 'similar', 'color'
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    // Load images when component mounts
    loadImages();
    // Load available colors
    loadAvailableColors();
  }, []);

  // Poll for processing status updates
  useEffect(() => {
    let pollInterval;

    // Check if we have any images that are still processing (from both displayed and all images)
    const hasProcessingImages = [...images, ...allImages].some(image =>
      image.metadata?.ai_processing_status === 'pending' ||
      image.metadata?.ai_processing_status === 'processing'
    );

    if (hasProcessingImages) {
      setIsPolling(true);
      // Poll every 3 seconds for processing updates
      pollInterval = setInterval(async () => {
        try {
          if (!isSearching) {
            // Get fresh data from server
            const response = await imageService.getImages();
            const updatedAllImages = response.items || [];

            // Always update allImages (complete dataset)
            setAllImages(updatedAllImages);

            if (!activeFilter) {
              // If no active filter, update displayed images with full dataset
              setImages(updatedAllImages);
            } else {
              // If we have active filters, update displayed images with fresh data for those specific images
              const updatedDisplayedImages = images.map(currentImage => {
                const updatedImage = updatedAllImages.find(img => img.id === currentImage.id);
                return updatedImage || currentImage;
              });
              setImages(updatedDisplayedImages);
            }

            // Check if all processing is complete
            const stillProcessing = updatedAllImages.some(image =>
              image.metadata?.ai_processing_status === 'pending' ||
              image.metadata?.ai_processing_status === 'processing'
            );

            if (!stillProcessing) {
              // Reload colors when all processing is complete
              loadAvailableColors();
              setIsPolling(false);
            }
          }
        } catch (err) {
          // Silently fail polling - don't disrupt user experience
        }
      }, 3000);
    } else {
      // No processing images, ensure polling state is false
      setIsPolling(false);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        setIsPolling(false);
      }
    };
  }, [images, allImages, isSearching, activeFilter]); // Re-run when images change or search state changes  // Extract colors from ALL images as fallback if backend colors are not available
  useEffect(() => {
    // Only extract colors client-side if we have images but no colors from backend
    if (allImages.length > 0 && availableColors.length === 0) {
      const extractedColors = new Set();

      allImages.forEach((image) => {
        // Try to get colors from image metadata (backend returns as 'metadata', not 'image_metadata')
        if (image.metadata) {
          // Add dominant color if it exists
          if (image.metadata.dominant_color) {
            extractedColors.add(image.metadata.dominant_color.toLowerCase());
          }

          // Add colors from colors array
          if (image.metadata.colors && Array.isArray(image.metadata.colors)) {
            image.metadata.colors.forEach(color => {
              if (color && typeof color === 'string' && color.match(/^#[0-9A-Fa-f]{6}$/i)) {
                extractedColors.add(color.toLowerCase());
              }
            });
          }
        }
      });

      const colorsArray = Array.from(extractedColors);

      // Use extracted colors as fallback when backend colors are not available
      if (colorsArray.length > 0) {
        setAvailableColors(colorsArray);
      }
    }
  }, [allImages, availableColors]); // Monitor both allImages and availableColors

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      setActiveFilter(null); // Clear any active filters
      setSelectedColor(null); // Clear color filter

      // First check if backend is available
      try {
        await healthService.checkBackend();
      } catch (healthError) {
        setError('Backend server is not running. Please start the backend server first.');
        return;
      }

      const response = await imageService.getImages();
      const imageItems = response.items || [];
      setImages(imageItems);
      setAllImages(imageItems); // Store all images for color extraction
      setTotalImages(response.total || imageItems.length || 0);
    } catch (err) {
      // Handle different types of errors
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !err.response) {
        setError('Backend server is not running. Please start the backend server first.');
      } else if (err.response?.status === 404) {
        // Gallery endpoint not found - just show empty state without error
        setImages([]);
      } else if (err.response?.status === 401) {
        // Auth error - let the axios interceptor handle this
        setError('Authentication expired. Please refresh the page.');
      } else if (err.response?.status === 500) {
        // Server error - could be database connection or empty data
        setImages([]);
        setError('No images found. Upload some images to get started!');
      } else {
        // Other errors
        setError(`Failed to load images: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableColors = async () => {
    try {
      // First check if we're authenticated
      const token = localStorage.getItem('access_token');
      if (!token) {
        return;
      }

      const response = await imageService.getColors();
      const colors = response.colors || [];

      // Use backend colors as the primary source, client-side extraction as fallback
      if (colors.length > 0) {
        setAvailableColors(colors);
      }
    } catch (err) {
      // Client-side extraction will handle it as fallback
    }
  };

  const handleUploadSuccess = (result) => {
    // Add new images to both lists
    if (result.images) {
      // Add images to the front of the list
      setImages(prevImages => [...result.images, ...prevImages]);
      setAllImages(prevImages => [...result.images, ...prevImages]);

      // Since new images are likely to be in 'pending' status, polling will start automatically
      // due to the useEffect that monitors processing images
    }

    // Reload to get the latest images and ensure consistency
    loadImages();
    // Reload colors in case new ones were added
    loadAvailableColors();
  };

  const searchImages = async (query, colorOverride = null) => {
    // Prevent multiple simultaneous searches
    if (isSearching) {
      return;
    }

    // Use colorOverride if provided, otherwise use selectedColor state
    const activeColor = colorOverride !== null ? colorOverride : selectedColor;

    // If no query and no color filter, load all images
    if (!query?.trim() && !activeColor) {
      loadImages();
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      // Determine active filter type
      if (query?.trim() && activeColor) {
        setActiveFilter('both');
      } else if (query?.trim()) {
        setActiveFilter('search');
      } else if (activeColor) {
        setActiveFilter('color');
      }

      const searchParams = {};
      if (query?.trim()) {
        searchParams.query = query.trim();
      }
      if (activeColor) {
        searchParams.color = activeColor;
      }
      searchParams.limit = 20;

      const response = await imageService.searchImages(searchParams);
      setImages(response.items || []); // Only update displayed images, not allImages
      setTotalImages(response.total || response.items?.length || 0);
    } catch (err) {
      setError(`Failed to search images: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear any existing timeout
    clearTimeout(window.searchTimeout);

    // If we're currently searching, don't start a new search immediately
    if (isSearching) {
      // Wait a bit longer if already searching to avoid spam
      window.searchTimeout = setTimeout(() => {
        searchImages(query);
      }, 500);
    } else {
      // Normal debounce delay when not searching
      window.searchTimeout = setTimeout(() => {
        searchImages(query);
      }, 300);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(window.searchTimeout);
      searchImages(searchQuery);
    } else if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedColor(null);
    setActiveFilter(null);
    clearTimeout(window.searchTimeout);
    loadImages(); // Load all images when clearing search
  };

  const handleFindSimilar = async (imageId) => {
    try {
      setIsSearching(true);
      setError(null);
      setSearchQuery(''); // Clear text search when finding similar
      setSelectedColor(null); // Clear color filter when finding similar
      setActiveFilter('similar');

      const response = await imageService.getSimilarImages(imageId);
      setImages(response.items || []); // Only update displayed images, not allImages
      setTotalImages(response.total || response.items?.length || 0);
    } catch (err) {
      setError(`Failed to find similar images: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    searchImages(tag);
  };

  const searchByColor = async (color) => {
    // Use the unified search function with current query and the specific color
    await searchImages(searchQuery, color);
  };

  const handleColorClick = (color) => {
    searchByColor(color);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    if (color) {
      // Don't clear text search - allow both color and text filters
      searchByColor(color);
    } else {
      // If color is cleared, search with current text query or load all images
      if (searchQuery.trim()) {
        searchImages(searchQuery);
      } else {
        setActiveFilter(null);
        loadImages();
      }
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handleModalFindSimilar = (imageId) => {
    handleFindSimilar(imageId);
    handleCloseModal();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Images</h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-gray-600">Upload and manage your AI-tagged images</p>
            {isPolling && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing images...</span>
              </div>
            )}
          </div>
        </div>

        {/* Centered Content Container */}
        <div className="flex flex-col items-center space-y-8 sm:space-y-12 lg:space-y-16">
          {/* Upload Section - Always Visible */}
          <div className="w-full">
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full" style={{maxWidth: '1200px'}}>
                <UploadZone onUploadSuccess={handleUploadSuccess} />
              </div>
            </div>
          </div>

          {/* Gallery Section with Search */}
          <GalleryContainer
            images={images}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            selectedColor={selectedColor}
            availableColors={availableColors}
            isSearching={isSearching}
            totalImages={totalImages}
            activeFilter={activeFilter}
            onSearchChange={handleSearchChange}
            onSearchKeyDown={handleSearchKeyDown}
            onClearSearch={handleClearSearch}
            onLoadImages={loadImages}
            onTagClick={handleTagClick}
            onColorClick={handleColorClick}
            onColorSelect={handleColorSelect}
            onFindSimilar={handleFindSimilar}
            onImageClick={handleImageClick}
          />

          {/* Manual Refresh Button - show only when there are processing images */}
          {images.some(image =>
            image.metadata?.ai_processing_status === 'pending' ||
            image.metadata?.ai_processing_status === 'processing'
          ) && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  loadImages();
                  loadAvailableColors();
                }}
                disabled={loading || isSearching}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh Status'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onFindSimilar={handleModalFindSimilar}
        isSearching={isSearching}
      />
    </div>
  );
}