import { jest } from '@jest/globals';

// Mock dependencies before importing the service
const uploadMock = jest.fn();
const fromMock = jest.fn(() => ({ upload: uploadMock }));

const createMock = jest.fn();
const prismaMock = {
  images: { create: createMock },
};

const generateThumbnailMock = jest.fn();

// Mock Supabase client to simulate storage bucket operations (upload original and thumbnail)
jest.unstable_mockModule('../../../src/services/supabaseClient.js', () => ({
  supabase: {
    storage: { from: fromMock },
  },
}));

// Mock Prisma client to simulate database insert operations for image records
jest.unstable_mockModule('../../../src/services/prismaClient.js', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

// Mock imageProcessor utility for thumbnail generation
jest.unstable_mockModule('../../../src/utils/imageProcessor.js', () => ({
  generateThumbnail: generateThumbnailMock,
}));

// Import service after mocks
const { uploadImage } = await import('../../../src/services/imageService.js');

describe('imageService - uploadImage', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const mockFile = {
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 500000,
    buffer: Buffer.from('fake-image-data'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects non-image files', async () => {
    const badFile = { ...mockFile, mimetype: 'application/pdf' };
    await expect(uploadImage(badFile, userId)).rejects.toThrow('Only JPEG, PNG, and WebP images are allowed');
  });

  test('rejects files over 10MB', async () => {
    const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };
    await expect(uploadImage(largeFile, userId)).rejects.toThrow('File size must be under 10MB');
  });

  test('rejects unsupported image types (must be JPEG/PNG/WebP)', async () => {
    const gifFile = { ...mockFile, mimetype: 'image/gif' };
    await expect(uploadImage(gifFile, userId)).rejects.toThrow('Only JPEG, PNG, and WebP images are allowed');
  });

  test('uploads original and thumbnail to Supabase Storage, creates DB record', async () => {
    // Mock thumbnail generation
    generateThumbnailMock.mockResolvedValueOnce({
      thumbnailBuffer: Buffer.from('thumbnail-data'),
      width: 300,
      height: 225,
    });

    // Mock Supabase storage uploads
    uploadMock
      .mockResolvedValueOnce({ data: { path: 'original.jpg' }, error: null }) // Original
      .mockResolvedValueOnce({ data: { path: 'thumb.jpg' }, error: null }); // Thumbnail

    // Mock Prisma create
    createMock.mockResolvedValueOnce({
      id: 1,
      user_id: userId,
      filename: 'test.jpg',
      original_path: 'original.jpg',
      thumbnail_path: 'thumb.jpg',
      file_size: 500000,
      mime_type: 'image/jpeg',
    });

    const result = await uploadImage(mockFile, userId);

    // Verify generateThumbnail was called
    expect(generateThumbnailMock).toHaveBeenCalledWith(mockFile.buffer, 300);

    // Verify Supabase storage uploads
    expect(fromMock).toHaveBeenCalledWith('images');
    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(uploadMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('original-'),
      mockFile.buffer,
      { contentType: 'image/jpeg' }
    );
    expect(uploadMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('thumb-'),
      expect.any(Buffer),
      { contentType: 'image/jpeg' }
    );

    // Verify Prisma DB insert
    expect(createMock).toHaveBeenCalledWith({
      data: {
        user_id: userId,
        filename: 'test.jpg',
        original_path: 'original.jpg',
        thumbnail_path: 'thumb.jpg',
        file_size: 500000,
        mime_type: 'image/jpeg',
      },
    });

    // Verify result
    expect(result).toMatchObject({
      id: 1,
      filename: 'test.jpg',
      original_path: 'original.jpg',
      thumbnail_path: 'thumb.jpg',
    });
  });

  test('throws error if Supabase storage upload fails', async () => {
    generateThumbnailMock.mockResolvedValueOnce({
      thumbnailBuffer: Buffer.from('thumbnail-data'),
      width: 300,
      height: 225,
    });
    uploadMock.mockResolvedValueOnce({ data: null, error: new Error('Storage full') });

    await expect(uploadImage(mockFile, userId)).rejects.toThrow('Failed to upload original image');
  });

  test('throws error if thumbnail generation fails', async () => {
    generateThumbnailMock.mockRejectedValueOnce(new Error('Sharp processing failed'));

    await expect(uploadImage(mockFile, userId)).rejects.toThrow('Failed to generate thumbnail');
  });

  test('throws error if DB insert fails', async () => {
    generateThumbnailMock.mockResolvedValueOnce({
      thumbnailBuffer: Buffer.from('thumbnail-data'),
      width: 300,
      height: 225,
    });
    uploadMock
      .mockResolvedValueOnce({ data: { path: 'original.jpg' }, error: null })
      .mockResolvedValueOnce({ data: { path: 'thumb.jpg' }, error: null });

    createMock.mockRejectedValueOnce(new Error('DB constraint violation'));

    await expect(uploadImage(mockFile, userId)).rejects.toThrow('Failed to save image record');
  });
});
