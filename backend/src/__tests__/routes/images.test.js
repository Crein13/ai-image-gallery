import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies before importing route
const mockUploadImage = jest.fn();
jest.unstable_mockModule('../../services/imageService.js', () => ({
  uploadImage: mockUploadImage,
}));

const mockVerifyToken = jest.fn();
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  verifyToken: mockVerifyToken,
}));

// Import route after mocking
const { default: imagesRouter } = await import('../../routes/images.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/images', imagesRouter);

// Add error handler for multer fileFilter errors
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('Only JPEG, PNG, and WebP images are allowed')) {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

describe('POST /api/images/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject unauthenticated requests', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      res.status(401).json({ error: 'Unauthorized' });
    });

    const response = await request(app)
      .post('/api/images/upload')
      .attach('images', Buffer.from('fake image'), 'test.jpg');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  test('should reject requests with no files', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const response = await request(app)
      .post('/api/images/upload')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No files uploaded');
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  test('should upload single image successfully', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImageRecord = {
      id: 'img-456',
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'original-123-test.jpg',
      thumbnail_path: 'thumb-123-test.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      created_at: new Date(),
    };

    mockUploadImage.mockResolvedValue(mockImageRecord);

    const response = await request(app)
      .post('/api/images/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('images', Buffer.from('fake image content'), 'test.jpg');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.images).toHaveLength(1);
    expect(response.body.images[0]).toMatchObject({
      id: mockImageRecord.id,
      user_id: mockImageRecord.user_id,
      filename: mockImageRecord.filename,
      original_path: mockImageRecord.original_path,
      thumbnail_path: mockImageRecord.thumbnail_path,
      file_size: mockImageRecord.file_size,
      mime_type: mockImageRecord.mime_type,
    });
    expect(mockUploadImage).toHaveBeenCalledTimes(1);
    expect(mockUploadImage).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'test.jpg',
        buffer: expect.any(Buffer),
      }),
      'user-123'
    );
  });

  test('should upload multiple images successfully', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImageRecord1 = {
      id: 'img-456',
      user_id: 'user-123',
      filename: 'test1.jpg',
      original_path: 'original-123-test1.jpg',
      thumbnail_path: 'thumb-123-test1.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      created_at: new Date(),
    };

    const mockImageRecord2 = {
      id: 'img-789',
      user_id: 'user-123',
      filename: 'test2.png',
      original_path: 'original-456-test2.png',
      thumbnail_path: 'thumb-456-test2.png',
      file_size: 2048,
      mime_type: 'image/png',
      created_at: new Date(),
    };

    mockUploadImage
      .mockResolvedValueOnce(mockImageRecord1)
      .mockResolvedValueOnce(mockImageRecord2);

    const response = await request(app)
      .post('/api/images/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('images', Buffer.from('fake image 1'), 'test1.jpg')
      .attach('images', Buffer.from('fake image 2'), 'test2.png');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.images).toHaveLength(2);
    expect(response.body.images[0]).toMatchObject({
      id: mockImageRecord1.id,
      user_id: mockImageRecord1.user_id,
      filename: mockImageRecord1.filename,
    });
    expect(response.body.images[1]).toMatchObject({
      id: mockImageRecord2.id,
      user_id: mockImageRecord2.user_id,
      filename: mockImageRecord2.filename,
    });
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
  });

  test('should handle service errors gracefully', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const error = new Error('Only JPEG, PNG, and WebP images are allowed');
    error.status = 400;
    mockUploadImage.mockRejectedValue(error);

    const response = await request(app)
      .post('/api/images/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('images', Buffer.from('fake pdf'), 'test.pdf');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Only JPEG, PNG, and WebP images are allowed');
    // Note: uploadImage is NOT called because multer's fileFilter rejects the file first
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  test('should handle partial upload failures', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImageRecord1 = {
      id: 'img-456',
      user_id: 'user-123',
      filename: 'test1.jpg',
      original_path: 'original-123-test1.jpg',
      thumbnail_path: 'thumb-123-test1.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      created_at: new Date(),
    };

    const error = new Error('Failed to upload original image');
    error.status = 500;

    mockUploadImage
      .mockResolvedValueOnce(mockImageRecord1)
      .mockRejectedValueOnce(error);

    const response = await request(app)
      .post('/api/images/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('images', Buffer.from('fake image 1'), 'test1.jpg')
      .attach('images', Buffer.from('fake image 2'), 'test2.jpg');

    expect(response.status).toBe(207); // Multi-status
    expect(response.body.success).toBe(true);
    expect(response.body.images).toHaveLength(1);
    expect(response.body.images[0]).toMatchObject({
      id: mockImageRecord1.id,
      user_id: mockImageRecord1.user_id,
      filename: mockImageRecord1.filename,
    });
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0]).toEqual({
      filename: 'test2.jpg',
      error: 'Failed to upload original image',
    });
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
  });

  test('should handle all uploads failing', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const error = new Error('Storage service unavailable');
    error.status = 500;
    mockUploadImage.mockRejectedValue(error);

    const response = await request(app)
      .post('/api/images/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('images', Buffer.from('fake image 1'), 'test1.jpg')
      .attach('images', Buffer.from('fake image 2'), 'test2.jpg');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('All uploads failed');
    expect(response.body.errors).toHaveLength(2);
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
  });
});
