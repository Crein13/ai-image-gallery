import { jest } from '@jest/globals';

// Mock Prisma
const mockFindFirst = jest.fn();
const prismaMock = {
  images: {
    findFirst: mockFindFirst,
  },
};

jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: prismaMock,
}));

// Mock Supabase
jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

const { getImageById } = await import('../../services/imageService.js');

describe('imageService.getImageById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('queries Prisma with correct parameters and includes metadata', async () => {
    const mockImage = {
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2025-10-27T10:00:00Z'),
      image_metadata: [
        {
          description: 'A sunset',
          tags: ['sunset'],
          colors: ['#ff6b35'],
          dominant_color: '#ff6b35',
          ai_processing_status: 'completed',
        },
      ],
    };

    mockFindFirst.mockResolvedValueOnce(mockImage);

    await getImageById({ imageId: 10, userId: 'user-123' });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: 10,
        user_id: 'user-123',
      },
      include: {
        image_metadata: {
          select: {
            description: true,
            tags: true,
            colors: true,
            dominant_color: true,
            ai_processing_status: true,
          },
        },
      },
    });
  });

  test('returns formatted image with metadata when found', async () => {
    const mockImage = {
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2025-10-27T10:00:00Z'),
      image_metadata: [
        {
          description: 'A beautiful sunset',
          tags: ['sunset', 'nature'],
          colors: ['#ff6b35', '#f7931e'],
          dominant_color: '#ff6b35',
          ai_processing_status: 'completed',
        },
      ],
    };

    mockFindFirst.mockResolvedValueOnce(mockImage);

    const result = await getImageById({ imageId: 10, userId: 'user-123' });

    expect(result).toEqual({
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: mockImage.uploaded_at,
      metadata: {
        description: 'A beautiful sunset',
        tags: ['sunset', 'nature'],
        colors: ['#ff6b35', '#f7931e'],
        dominant_color: '#ff6b35',
        ai_processing_status: 'completed',
      },
    });
  });

  test('returns null when image not found', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await getImageById({ imageId: 999, userId: 'user-123' });

    expect(result).toBeNull();
  });

  test('returns null when image belongs to different user', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await getImageById({ imageId: 10, userId: 'different-user' });

    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: 10,
        user_id: 'different-user',
      },
      include: expect.any(Object),
    });
  });

  test('returns image with null metadata when metadata is empty', async () => {
    const mockImage = {
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2025-10-27T10:00:00Z'),
      image_metadata: [],
    };

    mockFindFirst.mockResolvedValueOnce(mockImage);

    const result = await getImageById({ imageId: 10, userId: 'user-123' });

    expect(result.metadata).toBeNull();
  });

  test('handles metadata with null values correctly', async () => {
    const mockImage = {
      id: 10,
      user_id: 'user-123',
      filename: 'test.jpg',
      original_path: 'originals/user-123/test.jpg',
      thumbnail_path: 'thumbnails/user-123/test.jpg',
      file_size: 5000,
      mime_type: 'image/jpeg',
      uploaded_at: new Date('2025-10-27T10:00:00Z'),
      image_metadata: [
        {
          description: null,
          tags: null,
          colors: null,
          dominant_color: null,
          ai_processing_status: 'pending',
        },
      ],
    };

    mockFindFirst.mockResolvedValueOnce(mockImage);

    const result = await getImageById({ imageId: 10, userId: 'user-123' });

    expect(result.metadata).toEqual({
      description: null,
      tags: [],
      colors: [],
      dominant_color: null,
      ai_processing_status: 'pending',
    });
  });
});
