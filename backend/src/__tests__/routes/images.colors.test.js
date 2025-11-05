import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mocks
const mockVerifyToken = jest.fn();
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  verifyToken: mockVerifyToken,
}));

// Mock service functions
const mockGetDistinctColors = jest.fn();
const mockRetryAIProcessing = jest.fn();
jest.unstable_mockModule('../../services/imageService.js', () => ({
  uploadImage: jest.fn(),
  listImages: jest.fn(),
  getImageById: jest.fn(),
  searchImages: jest.fn(),
  findSimilarToImage: jest.fn(),
  getDistinctColors: mockGetDistinctColors,
  retryAIProcessing: mockRetryAIProcessing,
}));

// Mock HATEOAS utilities
jest.unstable_mockModule('../../utils/hateoas.js', () => ({
  buildPaginationLinks: jest.fn(),
  buildPaginatedResponse: jest.fn(),
}));

// Import router after mocks
const { default: imagesRouter } = await import('../../routes/images.js');

const app = express();
app.use(express.json());
app.use('/api/images', imagesRouter);

describe('GET /api/images/colors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects unauthenticated requests', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      return res.status(401).json({ error: 'Unauthorized' });
    });

    const response = await request(app).get('/api/images/colors');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns distinct colors for authenticated user', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockColors = {
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      total: 3
    };

    mockGetDistinctColors.mockResolvedValueOnce(mockColors);

    const response = await request(app).get('/api/images/colors');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockColors);
    expect(mockGetDistinctColors).toHaveBeenCalledWith({
      userId: 'user-123',
      limit: null // No limit by default, show all colors
    });
  });

  test('respects limit parameter', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockGetDistinctColors.mockResolvedValueOnce({
      colors: ['#ff0000'],
      total: 1
    });

    const response = await request(app).get('/api/images/colors?limit=5');

    expect(response.status).toBe(200);
    expect(mockGetDistinctColors).toHaveBeenCalledWith({
      userId: 'user-123',
      limit: 5
    });
  });

  test('handles invalid limit parameter', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockGetDistinctColors.mockResolvedValueOnce({
      colors: [],
      total: 0
    });

    const response = await request(app).get('/api/images/colors?limit=invalid');

    expect(response.status).toBe(200);
    expect(mockGetDistinctColors).toHaveBeenCalledWith({
      userId: 'user-123',
      limit: null // Should default to null (no limit)
    });
  });

  test('handles service errors', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockGetDistinctColors.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/images/colors');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch colors' });
  });
});

describe('POST /api/images/:imageId/retry-ai', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects unauthenticated requests', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      return res.status(401).json({ error: 'Unauthorized' });
    });

    const response = await request(app).post('/api/images/123/retry-ai');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  test('successfully retries AI processing', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockResult = {
      success: true,
      message: 'AI processing retry initiated',
      image_id: 123,
    };

    mockRetryAIProcessing.mockResolvedValueOnce(mockResult);

    const response = await request(app).post('/api/images/123/retry-ai');

    expect(response.status).toBe(202);
    expect(response.body).toEqual(mockResult);
    expect(mockRetryAIProcessing).toHaveBeenCalledWith({
      imageId: 123,
      userId: 'user-123'
    });
  });

  test('validates image ID parameter', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const response = await request(app).post('/api/images/invalid/retry-ai');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid image ID' });
    expect(mockRetryAIProcessing).not.toHaveBeenCalled();
  });

  test('validates positive image ID', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const response = await request(app).post('/api/images/0/retry-ai');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid image ID' });
    expect(mockRetryAIProcessing).not.toHaveBeenCalled();
  });

  test('handles 404 errors from service', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const error = new Error('Image not found');
    error.status = 404;
    mockRetryAIProcessing.mockRejectedValueOnce(error);

    const response = await request(app).post('/api/images/123/retry-ai');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Image not found' });
  });

  test('handles 400 errors from service', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const error = new Error('AI processing already completed');
    error.status = 400;
    mockRetryAIProcessing.mockRejectedValueOnce(error);

    const response = await request(app).post('/api/images/123/retry-ai');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'AI processing already completed' });
  });

  test('handles generic service errors', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockRetryAIProcessing.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).post('/api/images/123/retry-ai');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to retry AI processing' });
  });
});