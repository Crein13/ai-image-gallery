import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import UploadZone from '../components/UploadZone';
import GalleryContainer from '../components/GalleryContainer';
import ImageModal from '../components/ImageModal';
import { imageService, healthService } from '../services/api';

export default function Gallery() {
  const [images, setImages] = useState([]);
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

  useEffect(() => {
    // Load images when component mounts
    loadImages();
    // Load available colors
    loadAvailableColors();
  }, []);

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
      setImages(response.items || []);
      setTotalImages(response.total || response.items?.length || 0);
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
      } else if (err.response?.status === 500) {
        // Server error - could be database connection or empty data
        console.warn('Server error - might be empty database or connection issue');
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
      const response = await imageService.getColors();
      setAvailableColors(response.colors || []);
    } catch (err) {
      console.error('Error loading colors:', err);
      // Don't show error for colors - it's not critical, just set empty array
      setAvailableColors([]);
    }
  };

  const handleUploadSuccess = (result) => {
    // Add new images to the list
    if (result.images) {
      setImages(prevImages => [...result.images, ...prevImages]);
    }
    // Reload to get the latest images
    loadImages();
    // Reload colors in case new ones were added
    loadAvailableColors();
  };

  const searchImages = async (query) => {
    if (!query.trim()) {
      // If search is empty, load all images
      loadImages();
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      setActiveFilter('search');

      const response = await imageService.searchImages({
        query: query.trim(),
        limit: 20 // Default limit for search
      });
      setImages(response.items || []);
      setTotalImages(response.total || response.items?.length || 0);
    } catch (err) {
      console.error('Error searching images:', err);
      setError(`Failed to search images: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search - search after user stops typing for 300ms
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchImages(query);
    }, 300);
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
      setImages(response.items || []);
      setTotalImages(response.total || response.items?.length || 0);
    } catch (err) {
      console.error('Error finding similar images:', err);
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
    try {
      setIsSearching(true);
      setError(null);
      setActiveFilter('color');

      const response = await imageService.searchImages({
        color: color,
        limit: 20 // Default limit for color search
      });
      setImages(response.items || []);
      setTotalImages(response.total || response.items?.length || 0);
    } catch (err) {
      console.error('Error searching by color:', err);
      setError(`Failed to search by color: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleColorClick = (color) => {
    searchByColor(color);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    if (color) {
      // Clear text search when selecting a color
      setSearchQuery('');
      searchByColor(color);
    } else {
      // If color is cleared, load all images
      setActiveFilter(null);
      loadImages();
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

      <div className="px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Images</h1>
          <p className="text-gray-600">Upload and manage your AI-tagged images</p>
        </div>

        {/* Centered Content Container */}
        <div className="flex flex-col items-center space-y-16">
          {/* Upload Section - Always Visible */}
          <div className="w-full">
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full" style={{maxWidth: '1200px'}}>
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