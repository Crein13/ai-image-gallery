import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { upload } from '../../middleware/upload.js';

describe('upload middleware configuration', () => {
  let app;

  beforeEach(() => {
    app = express();

    // Test route that uses upload middleware
    app.post('/test-upload', upload.array('images', 5), (req, res) => {
      const files = req.files || [];
      res.status(200).json({
        success: true,
        files: files.map(f => ({
          name: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
          hasBuffer: !!f.buffer,
        })),
      });
    });

    // Error handler for multer errors
    app.use((err, req, res, next) => {
      if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err.message && err.message.includes('Only JPEG, PNG, and WebP images are allowed')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    });
  });

  test('should use memoryStorage and attach buffer to req.file', async () => {
    const testData = Buffer.from('test-image-data');

    const response = await request(app)
      .post('/test-upload')
      .attach('images', testData, 'test.jpg');

    expect(response.status).toBe(200);
    expect(response.body.files[0].hasBuffer).toBe(true);
  });

  test('should accept up to 5 files (configured limit)', async () => {
    const response = await request(app)
      .post('/test-upload')
      .attach('images', Buffer.from('fake-jpeg-1'), 'test1.jpg')
      .attach('images', Buffer.from('fake-jpeg-2'), 'test2.jpg')
      .attach('images', Buffer.from('fake-jpeg-3'), 'test3.jpg')
      .attach('images', Buffer.from('fake-jpeg-4'), 'test4.jpg')
      .attach('images', Buffer.from('fake-jpeg-5'), 'test5.jpg');

    expect(response.status).toBe(200);
    expect(response.body.files).toHaveLength(5);
  });

  test('should enforce 10MB file size limit', async () => {
    // Create a buffer larger than 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

    const response = await request(app)
      .post('/test-upload')
      .attach('images', largeBuffer, 'large.jpg');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('File too large');
  });

  test('should enforce image type filter (JPEG/PNG/WebP only)', async () => {
    const response = await request(app)
      .post('/test-upload')
      .attach('images', Buffer.from('fake-pdf-data'), 'document.pdf');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Only JPEG, PNG, and WebP images are allowed');
  });

  test('should include file metadata (originalname, size, mimetype)', async () => {
    const testBuffer = Buffer.from('x'.repeat(1000)); // 1KB file

    const response = await request(app)
      .post('/test-upload')
      .attach('images', testBuffer, 'photo.jpg');

    expect(response.status).toBe(200);
    expect(response.body.files[0]).toMatchObject({
      name: 'photo.jpg',
      size: 1000,
      mimetype: 'image/jpeg',
    });
  });
});
