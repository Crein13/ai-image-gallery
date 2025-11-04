/**
 * Unit Tests for findSimilarToImage - Simple tag/color overlap matching
 * Follows TODO requirement: "For similarity: cosine similarity on tags/colors"
 */
import { jest } from '@jest/globals';

// Mock Prisma client
const findFirstMock = jest.fn();
const findManyMock = jest.fn();

const prismaMock = {
  images: {
    findFirst: findFirstMock,
    findMany: findManyMock,
  },
  image_metadata: {
    findFirst: findFirstMock,
  },
};

jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: prismaMock,
}));

// Mock Supabase client
const getPublicUrlMock = jest.fn();
const supabaseMock = {
  storage: {
    from: jest.fn(() => ({
      getPublicUrl: getPublicUrlMock,
    })),
  },
};

jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: supabaseMock,
}));

// Import service after mocking
const { findSimilarToImage } = await import('../../services/imageService.js');

describe('imageService - findSimilarToImage (tag/color overlap)', () => {
  const userId = 'user-123';
  const imageId = 42;

  beforeEach(() => {
    jest.clearAllMocks();
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://example.com/image.jpg' },
    });
  });

  test('should find images with shared tags', async () => {
    // Mock source image lookup
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'sunset.jpg',
      original_path: 'images/sunset.jpg',
      thumbnail_path: 'thumbs/sunset.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2024-01-01'),
      image_metadata: [{
        description: 'Beautiful sunset over the ocean',
        tags: ['sunset', 'ocean', 'beach'],
        colors: ['#ff6b35', '#f7931e'],
        dominant_color: '#ff6b35',
        ai_processing_status: 'completed',
      }],
    });

    // Mock similar images with tag overlap
    findManyMock.mockResolvedValueOnce([
      {
        id: 10,
        user_id: userId,
        filename: 'beach.jpg',
        original_path: 'images/beach.jpg',
        thumbnail_path: 'thumbs/beach.jpg',
        file_size: 2048000,
        mime_type: 'image/jpeg',
        uploaded_at: new Date('2024-01-02'),
        image_metadata: [{
          description: 'Tropical beach',
          tags: ['beach', 'tropical', 'sand'], // shares 'beach'
          colors: ['#f39c12', '#3498db'],
          dominant_color: '#f39c12',
          ai_processing_status: 'completed',
        }],
      },
      {
        id: 15,
        user_id: userId,
        filename: 'ocean.jpg',
        original_path: 'images/ocean.jpg',
        thumbnail_path: 'thumbs/ocean.jpg',
        file_size: 1500000,
        mime_type: 'image/jpeg',
        uploaded_at: new Date('2024-01-03'),
        image_metadata: [{
          description: 'Ocean waves',
          tags: ['ocean', 'waves', 'water'], // shares 'ocean'
          colors: ['#3498db', '#2c3e50'],
          dominant_color: '#3498db',
          ai_processing_status: 'completed',
        }],
      },
    ]);

    const result = await findSimilarToImage({ imageId, userId, limit: 10 });

    // Verify source image was fetched
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: imageId,
        user_id: userId,
      },
      include: {
        image_metadata: true,
      },
    });

    // Verify query for similar images
    expect(findManyMock).toHaveBeenCalled();

    // Verify results
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 10,
      filename: 'beach.jpg',
    });
    expect(result.items[1]).toMatchObject({
      id: 15,
      filename: 'ocean.jpg',
    });
    expect(result.total).toBe(2);
  });

  test('should find images with shared colors', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'sunset.jpg',
      original_path: 'images/sunset.jpg',
      thumbnail_path: 'thumbs/sunset.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [{
        description: 'Sunset',
        tags: ['sunset'],
        colors: ['#ff6b35', '#f7931e'],
        dominant_color: '#ff6b35',
        ai_processing_status: 'completed',
      }],
    });

    findManyMock.mockResolvedValueOnce([
      {
        id: 20,
        user_id: userId,
        filename: 'orange.jpg',
        original_path: 'images/orange.jpg',
        thumbnail_path: 'thumbs/orange.jpg',
        file_size: 1000000,
        mime_type: 'image/jpeg',
        uploaded_at: new Date(),
        image_metadata: [{
          description: 'Orange flower',
          tags: ['flower', 'orange'],
          colors: ['#ff6b35', '#2ecc71'], // shares color
          dominant_color: '#ff6b35',
          ai_processing_status: 'completed',
        }],
      },
    ]);

    const result = await findSimilarToImage({ imageId, userId, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(20);
  });

  test('should exclude the source image from results', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'test.jpg',
      original_path: 'images/test.jpg',
      thumbnail_path: 'thumbs/test.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [{
        description: 'Test',
        tags: ['test'],
        colors: ['#000000'],
        dominant_color: '#000000',
        ai_processing_status: 'completed',
      }],
    });

    findManyMock.mockResolvedValueOnce([]);

    await findSimilarToImage({ imageId, userId, limit: 10 });

    // Verify findMany excludes source image
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: imageId },
        }),
      })
    );
  });

  test('should throw error if source image not found', async () => {
    findFirstMock.mockResolvedValueOnce(null);

    await expect(
      findSimilarToImage({ imageId: 999, userId, limit: 10 })
    ).rejects.toThrow('Image not found');
  });

  test('should throw error if source image has no metadata', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'test.jpg',
      original_path: 'images/test.jpg',
      thumbnail_path: 'thumbs/test.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [], // No metadata
    });

    await expect(
      findSimilarToImage({ imageId, userId, limit: 10 })
    ).rejects.toThrow('Image has no metadata');
  });

  test('should enforce user ownership', async () => {
    findFirstMock.mockResolvedValueOnce(null);

    await expect(
      findSimilarToImage({ imageId, userId: 'different-user', limit: 10 })
    ).rejects.toThrow('Image not found');

    // Verify ownership check in query
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: imageId,
        user_id: 'different-user',
      },
      include: {
        image_metadata: true,
      },
    });
  });

  test('should respect limit parameter', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'test.jpg',
      original_path: 'images/test.jpg',
      thumbnail_path: 'thumbs/test.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [{
        description: 'Test',
        tags: ['test'],
        colors: ['#000000'],
        dominant_color: '#000000',
        ai_processing_status: 'completed',
      }],
    });

    findManyMock.mockResolvedValueOnce([]);

    await findSimilarToImage({ imageId, userId, limit: 5 });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      })
    );
  });

  test('should return empty array when no similar images found', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'unique.jpg',
      original_path: 'images/unique.jpg',
      thumbnail_path: 'thumbs/unique.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [{
        description: 'Unique image',
        tags: ['unique', 'rare'],
        colors: ['#123456'],
        dominant_color: '#123456',
        ai_processing_status: 'completed',
      }],
    });

    findManyMock.mockResolvedValueOnce([]);

    const result = await findSimilarToImage({ imageId, userId, limit: 10 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('should format metadata consistently', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'test.jpg',
      original_path: 'images/test.jpg',
      thumbnail_path: 'thumbs/test.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [{
        description: 'Test',
        tags: ['test'],
        colors: ['#000000'],
        dominant_color: '#000000',
        ai_processing_status: 'completed',
      }],
    });

    findManyMock.mockResolvedValueOnce([
      {
        id: 50,
        user_id: userId,
        filename: 'similar.jpg',
        original_path: 'images/similar.jpg',
        thumbnail_path: 'thumbs/similar.jpg',
        file_size: 2000000,
        mime_type: 'image/jpeg',
        uploaded_at: new Date(),
        image_metadata: [{
          description: 'Similar image',
          tags: ['test', 'sample'],
          colors: ['#000000', '#ffffff'],
          dominant_color: '#000000',
          ai_processing_status: 'completed',
        }],
      },
    ]);

    const result = await findSimilarToImage({ imageId, userId, limit: 10 });

    expect(result.items[0].metadata).toEqual({
      description: 'Similar image',
      tags: ['test', 'sample'],
      colors: ['#000000', '#ffffff'],
      dominant_color: '#000000',
      ai_processing_status: 'completed',
    });
  });

  test('should handle images with empty tags gracefully', async () => {
    findFirstMock.mockResolvedValueOnce({
      id: imageId,
      user_id: userId,
      filename: 'test.jpg',
      original_path: 'images/test.jpg',
      thumbnail_path: 'thumbs/test.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(),
      image_metadata: [{
        description: 'Test',
        tags: [], // No tags
        colors: ['#ff0000'],
        dominant_color: '#ff0000',
        ai_processing_status: 'completed',
      }],
    });

    findManyMock.mockResolvedValueOnce([]);

    const result = await findSimilarToImage({ imageId, userId, limit: 10 });

    // Should still work, matching by colors only
    expect(result).toBeDefined();
    expect(result.items).toEqual([]);
  });
});
