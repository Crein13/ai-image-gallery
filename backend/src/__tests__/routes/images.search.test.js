/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import request from 'supertest';

// Mock services
const mockSearchImages = jest.fn();
const mockVerifyToken = jest.fn();

jest.unstable_mockModule('../../services/imageService.js', () => ({
  uploadImage: jest.fn(),
  listImages: jest.fn(),
  getImageById: jest.fn(),
  searchImages: mockSearchImages,
  findSimilarToImage: jest.fn(),
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  verifyToken: (req, res, next) => mockVerifyToken(req, res, next),
}));

const { default: app } = await import('../../app.js');

describe('GET /api/images/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is authenticated
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  describe('Authentication', () => {
    test('requires authentication', async () => {
      mockVerifyToken.mockImplementation((req, res) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const res = await request(app).get('/api/images/search?q=beach');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('Parameter Parsing', () => {
    test('parses query parameter correctly', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search?q=beach');

      expect(mockSearchImages).toHaveBeenCalledWith({
        userId: 'user-123',
        query: 'beach',
        color: undefined,
        dominantOnly: undefined,
        limit: 20,
        offset: 0,
        sort: 'newest',
      });
    });

    test('parses color parameter correctly', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search?color=%230000ff');

      expect(mockSearchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          color: '#0000ff',
        })
      );
    });

    test('parses dominantOnly as boolean', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search?color=%23ff0000&dominantOnly=true');

      expect(mockSearchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          dominantOnly: true,
        })
      );
    });

    test('parses limit and offset as numbers', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 10,
        offset: 20,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search?limit=10&offset=20');

      expect(mockSearchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });

    test('parses sort parameter', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search?sort=oldest');

      expect(mockSearchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'oldest',
        })
      );
    });

    test('handles URL-encoded query strings', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search?q=blue%20sky');

      expect(mockSearchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'blue sky',
        })
      );
    });

    test('handles search with no parameters', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      await request(app).get('/api/images/search');

      expect(mockSearchImages).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          query: undefined,
          color: undefined,
        })
      );
    });
  });

  describe('Response Format', () => {
    test('returns proper JSON structure with items and pagination', async () => {
      const mockResult = {
        items: [
          {
            id: 1,
            user_id: 'user-123',
            filename: 'test.jpg',
            original_path: 'originals/user-123/test.jpg',
            thumbnail_path: 'thumbnails/user-123/test.jpg',
            file_size: 1024000,
            mime_type: 'image/jpeg',
            uploaded_at: '2025-01-01T00:00:00.000Z',
            metadata: {
              description: 'Test image',
              tags: ['test'],
              colors: ['#ff0000'],
              dominant_color: '#ff0000',
              ai_processing_status: 'completed',
            },
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockSearchImages.mockResolvedValueOnce(mockResult);

      const res = await request(app).get('/api/images/search?q=test');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.items).toHaveLength(1);
    });

    test('returns empty array when no results found', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
      });

      const res = await request(app).get('/api/images/search?q=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('HATEOAS Pagination Links', () => {
    test('includes self, next, and prev links', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 100,
        limit: 20,
        offset: 40,
        hasNext: true,
        hasPrev: true,
        nextOffset: 60,
        prevOffset: 20,
      });

      const res = await request(app).get('/api/images/search?q=test&limit=20&offset=40');

      expect(res.status).toBe(200);
      expect(res.body.pagination.links).toBeDefined();
      expect(res.body.pagination.links.self).toBe('/api/images/search?q=test&limit=20&offset=40&sort=newest');
      expect(res.body.pagination.links.next).toBe('/api/images/search?q=test&limit=20&offset=60&sort=newest');
      expect(res.body.pagination.links.prev).toBe('/api/images/search?q=test&limit=20&offset=20&sort=newest');
    });

    test('omits next link when no more results', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 25,
        limit: 20,
        offset: 20,
        hasNext: false,
        hasPrev: true,
        nextOffset: null,
        prevOffset: 0,
      });

      const res = await request(app).get('/api/images/search?q=test&offset=20');

      expect(res.status).toBe(200);
      expect(res.body.pagination.links.next).toBeUndefined();
      expect(res.body.pagination.links.prev).toBeDefined();
    });

    test('omits prev link on first page', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 50,
        limit: 20,
        offset: 0,
        hasNext: true,
        hasPrev: false,
        nextOffset: 20,
        prevOffset: null,
      });

      const res = await request(app).get('/api/images/search?q=test');

      expect(res.status).toBe(200);
      expect(res.body.pagination.links.prev).toBeUndefined();
      expect(res.body.pagination.links.next).toBeDefined();
    });

    test('preserves all query parameters in links', async () => {
      mockSearchImages.mockResolvedValueOnce({
        items: [],
        total: 50,
        limit: 20,
        offset: 0,
        hasNext: true,
        hasPrev: false,
        nextOffset: 20,
      });

      const res = await request(app).get('/api/images/search?q=ocean&color=%23ff0000&dominantOnly=true&sort=oldest');

      expect(res.status).toBe(200);
      expect(res.body.pagination.links.self).toContain('q=ocean');
      expect(res.body.pagination.links.self).toContain('color=%23ff0000');
      expect(res.body.pagination.links.self).toContain('dominantOnly=true');
      expect(res.body.pagination.links.self).toContain('sort=oldest');
      expect(res.body.pagination.links.next).toContain('q=ocean');
      expect(res.body.pagination.links.next).toContain('color=%23ff0000');
    });
  });

  describe('Error Handling', () => {
    test('returns 400 for service validation errors', async () => {
      const error = new Error('Invalid color format');
      error.status = 400;
      mockSearchImages.mockRejectedValueOnce(error);

      const res = await request(app).get('/api/images/search?color=bad');

      expect(res.status).toBe(400);
    });

    test('returns 500 for unexpected errors', async () => {
      mockSearchImages.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app).get('/api/images/search?q=test');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Search failed');
    });

    test('logs errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchImages.mockRejectedValueOnce(new Error('Test error'));

      await request(app).get('/api/images/search?q=test');

      expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
