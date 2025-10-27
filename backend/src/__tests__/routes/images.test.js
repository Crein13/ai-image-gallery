import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies before importing route
const mockUploadImage = jest.fn();
const mockProcessImageAI = jest.fn();

jest.unstable_mockModule('../../services/imageService.js', () => ({
  uploadImage: mockUploadImage,
}));

jest.unstable_mockModule('../../services/aiProcessingService.js', () => ({
  processImageAI: mockProcessImageAI,
}));

const mockVerifyToken = jest.fn();
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  verifyToken: mockVerifyToken,
}));

// Mock Supabase client
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

// Mock Prisma client
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();

const prismaMock = {
  images: {
    findFirst: mockFindFirst,
  },
  image_metadata: {
    findFirst: jest.fn(),
    update: mockUpdate,
  },
};

jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: prismaMock,
  prisma: prismaMock,
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

describe('POST /api/images/:imageId/retry-ai', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject unauthenticated requests', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      res.status(401).json({ error: 'Unauthorized' });
    });

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .send();

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  test('should return 404 if image not found', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    mockFindFirst.mockResolvedValueOnce(null); // No image found

    const response = await request(app)
      .post('/api/images/999/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Image not found');
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: 999,
        user_id: 'user-123',
      },
    });
  });

  test('should return 404 if metadata not found', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImage = {
      id: 123,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/original-123-test.jpg',
    };

    mockFindFirst.mockResolvedValueOnce(mockImage); // Image found
    prismaMock.image_metadata.findFirst.mockResolvedValueOnce(null); // No metadata

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Image metadata not found');
  });

  test('should return 400 if AI processing already completed', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImage = {
      id: 123,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/original-123-test.jpg',
    };

    const mockMetadata = {
      id: 1,
      image_id: 123,
      ai_processing_status: 'completed',
    };

    mockFindFirst.mockResolvedValueOnce(mockImage);
    prismaMock.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('AI processing already completed');
  });

  test('should successfully retry AI processing for failed image', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImage = {
      id: 123,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/original-123-test.jpg',
    };

    const mockMetadata = {
      id: 1,
      image_id: 123,
      ai_processing_status: 'failed',
    };

    // Mock image file download
    const mockBlob = new Blob([Buffer.from('fake image data')]);
    mockFindFirst.mockResolvedValueOnce(mockImage);
    prismaMock.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);
    mockDownload.mockResolvedValueOnce({
      data: mockBlob,
      error: null,
    });

    // Mock AI processing (fire-and-forget, returns promise)
    mockProcessImageAI.mockReturnValue(Promise.resolve());

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      success: true,
      message: 'AI processing retry initiated',
      image_id: 123,
    });

    expect(mockFrom).toHaveBeenCalledWith(process.env.SUPABASE_BUCKET);
    expect(mockDownload).toHaveBeenCalledWith('originals/user-123/original-123-test.jpg');
    expect(mockProcessImageAI).toHaveBeenCalledWith(
      123,
      'user-123',
      expect.any(Buffer)
    );
  });

  test('should successfully retry AI processing for pending image', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImage = {
      id: 123,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/original-123-test.jpg',
    };

    const mockMetadata = {
      id: 1,
      image_id: 123,
      ai_processing_status: 'pending', // Can retry pending too
    };

    const mockBlob = new Blob([Buffer.from('fake image data')]);
    mockFindFirst.mockResolvedValueOnce(mockImage);
    prismaMock.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);
    mockDownload.mockResolvedValueOnce({
      data: mockBlob,
      error: null,
    });

    mockProcessImageAI.mockReturnValue(Promise.resolve());

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
  });

  test('should handle storage download failure', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    const mockImage = {
      id: 123,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/original-123-test.jpg',
    };

    const mockMetadata = {
      id: 1,
      image_id: 123,
      ai_processing_status: 'failed',
    };

    mockFindFirst.mockResolvedValueOnce(mockImage);
    prismaMock.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);
    mockDownload.mockResolvedValueOnce({
      data: null,
      error: new Error('File not found in storage'),
    });

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to download image from storage');
    expect(mockProcessImageAI).not.toHaveBeenCalled();
  });

  test('should prevent users from retrying other users images', async () => {
    mockVerifyToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    // Image belongs to different user
    mockFindFirst.mockResolvedValueOnce(null); // No image found for this user

    const response = await request(app)
      .post('/api/images/123/retry-ai')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Image not found');
    expect(mockProcessImageAI).not.toHaveBeenCalled();
  });
});
