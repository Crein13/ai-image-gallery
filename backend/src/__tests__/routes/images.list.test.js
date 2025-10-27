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

// Mock imageService: listImages for listing, uploadImage to satisfy router imports
const mockListImages = jest.fn();
const mockUploadImage = jest.fn();
const mockGetImageById = jest.fn();
jest.unstable_mockModule('../../services/imageService.js', () => ({
  listImages: mockListImages,
  uploadImage: mockUploadImage,
  getImageById: mockGetImageById,
}));

// Import router after mocks
const { default: imagesRouter } = await import('../../routes/images.js');

const app = express();
app.use(express.json());
app.use('/api/images', imagesRouter);

describe('GET /api/images (listing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects unauthenticated requests', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      res.status(401).json({ error: 'Unauthorized' });
    });

    const res = await request(app).get('/api/images');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockListImages).not.toHaveBeenCalled();
  });

  test('returns paginated list with metadata (default newest first)', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const serviceResult = {
      items: [
        {
          id: 10,
          user_id: 'user-123',
          filename: 'b.jpg',
          original_path: 'originals/user-123/b.jpg',
          thumbnail_path: 'thumbnails/user-123/b.jpg',
          file_size: 2000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date().toISOString(),
          metadata: {
            description: 'desc b',
            tags: ['tag1', 'tag2'],
            colors: ['#112233'],
            dominant_color: '#112233',
            ai_processing_status: 'completed',
          },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      hasNext: false,
      hasPrev: false,
      nextOffset: null,
      prevOffset: null,
    };

    mockListImages.mockResolvedValueOnce(serviceResult);

    const res = await request(app)
      .get('/api/images')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      items: serviceResult.items,
      pagination: {
        total: 1,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
        links: {
          self: '/api/images?limit=20&offset=0&sort=newest',
        },
      },
    });
    expect(mockListImages).toHaveBeenCalledWith({
      userId: 'user-123',
      limit: 20,
      offset: 0,
      sort: 'newest',
    });
  });

  test('supports limit and offset and oldest sort', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const serviceResult = {
      items: [],
      total: 50,
      limit: 5,
      offset: 10,
      hasNext: true,
      hasPrev: true,
      nextOffset: 15,
      prevOffset: 5,
    };
    mockListImages.mockResolvedValueOnce(serviceResult);

    const res = await request(app)
      .get('/api/images?limit=5&offset=10&sort=oldest')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      items: [],
      pagination: {
        total: 50,
        limit: 5,
        offset: 10,
        hasNext: true,
        hasPrev: true,
        links: {
          self: '/api/images?limit=5&offset=10&sort=oldest',
          next: '/api/images?limit=5&offset=15&sort=oldest',
          prev: '/api/images?limit=5&offset=5&sort=oldest',
        },
      },
    });
    expect(mockListImages).toHaveBeenCalledWith({
      userId: 'user-123',
      limit: 5,
      offset: 10,
      sort: 'oldest',
    });
  });

  test('includes HATEOAS pagination links when hasNext is true', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const servicePayload = {
      items: [],
      total: 100,
      limit: 20,
      offset: 40,
      hasNext: true,
      hasPrev: true,
      nextOffset: 60,
      prevOffset: 20,
    };
    mockListImages.mockResolvedValueOnce(servicePayload);

    const res = await request(app)
      .get('/api/images?limit=20&offset=40&sort=newest')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      items: [],
      pagination: {
        total: 100,
        limit: 20,
        offset: 40,
        hasNext: true,
        hasPrev: true,
        links: {
          self: '/api/images?limit=20&offset=40&sort=newest',
          next: '/api/images?limit=20&offset=60&sort=newest',
          prev: '/api/images?limit=20&offset=20&sort=newest',
        },
      },
    });
  });

  test('includes HATEOAS links with only next when hasPrev is false', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const servicePayload = {
      items: [],
      total: 100,
      limit: 20,
      offset: 0,
      hasNext: true,
      hasPrev: false,
      nextOffset: 20,
      prevOffset: null,
    };
    mockListImages.mockResolvedValueOnce(servicePayload);

    const res = await request(app)
      .get('/api/images?limit=20&offset=0')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.pagination.links).toEqual({
      self: '/api/images?limit=20&offset=0&sort=newest',
      next: '/api/images?limit=20&offset=20&sort=newest',
    });
    expect(res.body.pagination.links.prev).toBeUndefined();
  });

  test('includes HATEOAS links with only prev when hasNext is false', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const servicePayload = {
      items: [],
      total: 50,
      limit: 20,
      offset: 40,
      hasNext: false,
      hasPrev: true,
      nextOffset: null,
      prevOffset: 20,
    };
    mockListImages.mockResolvedValueOnce(servicePayload);

    const res = await request(app)
      .get('/api/images?limit=20&offset=40&sort=oldest')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.pagination.links).toEqual({
      self: '/api/images?limit=20&offset=40&sort=oldest',
      prev: '/api/images?limit=20&offset=20&sort=oldest',
    });
    expect(res.body.pagination.links.next).toBeUndefined();
  });

  test('includes only self link when no next or prev', async () => {
    mockVerifyToken.mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const servicePayload = {
      items: [],
      total: 5,
      limit: 20,
      offset: 0,
      hasNext: false,
      hasPrev: false,
      nextOffset: null,
      prevOffset: null,
    };
    mockListImages.mockResolvedValueOnce(servicePayload);

    const res = await request(app)
      .get('/api/images')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.pagination.links).toEqual({
      self: '/api/images?limit=20&offset=0&sort=newest',
    });
    expect(res.body.pagination.links.next).toBeUndefined();
    expect(res.body.pagination.links.prev).toBeUndefined();
  });
});


