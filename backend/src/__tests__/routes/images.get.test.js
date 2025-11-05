import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mocks
const mockVerifyToken = jest.fn();
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  verifyToken: mockVerifyToken,
}));

// Mock Supabase client used by retry endpoint to avoid real client creation
const mockDownload = jest.fn();
const mockFrom = jest.fn(() => ({
  download: mockDownload,
}));
jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: {
    storage: {
      from: mockFrom,
    },
  },
}));

// Mock imageService: getImageById for single image retrieval
const mockGetImageById = jest.fn();
const mockListImages = jest.fn();
const mockUploadImage = jest.fn();
const mockSearchImages = jest.fn();
const mockFindSimilarToImage = jest.fn();
const mockGetDistinctColors = jest.fn();
const mockRetryAIProcessing = jest.fn();
jest.unstable_mockModule('../../services/imageService.js', () => ({
  getImageById: mockGetImageById,
  listImages: mockListImages,
  uploadImage: mockUploadImage,
  searchImages: mockSearchImages,
  findSimilarToImage: mockFindSimilarToImage,
  getDistinctColors: mockGetDistinctColors,
  retryAIProcessing: mockRetryAIProcessing,
}));

// Import router after mocks
const { default: imagesRouter } = await import('../../routes/images.js');

const app = express();
app.use(express.json());
app.use('/api/images', imagesRouter);

describe('GET /api/images/:id (single image)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects unauthenticated requests', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      res.status(401).json({ error: 'Unauthorized' });
    });

    const res = await request(app).get('/api/images/123');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockGetImageById).not.toHaveBeenCalled();
  });

  test('returns image with metadata when found and owned by user', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const imageData = {
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2025-10-27T10:00:00Z').toISOString(),
      metadata: {
        description: 'A beautiful sunset',
        tags: ['sunset', 'nature'],
        colors: ['#ff6b35', '#f7931e'],
        dominant_color: '#ff6b35',
        ai_processing_status: 'completed',
      },
    };

    mockGetImageById.mockResolvedValueOnce(imageData);

    const res = await request(app)
      .get('/api/images/10')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(imageData);
    expect(mockGetImageById).toHaveBeenCalledWith({
      imageId: 10,
      userId: 'user-123',
    });
  });

  test('returns 404 when image not found', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockGetImageById.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/images/999')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Image not found');
    expect(mockGetImageById).toHaveBeenCalledWith({
      imageId: 999,
      userId: 'user-123',
    });
  });

  test('returns 404 when image belongs to different user', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    // Service returns null when image doesn't belong to user
    mockGetImageById.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/images/10')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Image not found');
  });

  test('returns 400 for invalid image ID', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const res = await request(app)
      .get('/api/images/invalid')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid image ID');
    expect(mockGetImageById).not.toHaveBeenCalled();
  });

  test('returns image without metadata when metadata is null', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const imageData = {
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2025-10-27T10:00:00Z').toISOString(),
      metadata: null,
    };

    mockGetImageById.mockResolvedValueOnce(imageData);

    const res = await request(app)
      .get('/api/images/10')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(imageData);
    expect(res.body.metadata).toBeNull();
  });

  test('handles service errors gracefully', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockGetImageById.mockRejectedValueOnce(new Error('Database connection failed'));

    const res = await request(app)
      .get('/api/images/10')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to retrieve image');
  });
});
