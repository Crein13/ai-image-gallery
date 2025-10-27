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
jest.unstable_mockModule('../../services/imageService.js', () => ({
  listImages: mockListImages,
  uploadImage: mockUploadImage,
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

    const payload = {
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
    };

    mockListImages.mockResolvedValueOnce(payload);

    const res = await request(app)
      .get('/api/images')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
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

    const payload = { items: [], total: 50, limit: 5, offset: 10 };
    mockListImages.mockResolvedValueOnce(payload);

    const res = await request(app)
      .get('/api/images?limit=5&offset=10&sort=oldest')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
    expect(mockListImages).toHaveBeenCalledWith({
      userId: 'user-123',
      limit: 5,
      offset: 10,
      sort: 'oldest',
    });
  });
});
