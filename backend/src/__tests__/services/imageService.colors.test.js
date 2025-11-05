import { jest } from '@jest/globals';

// Mock dependencies first
jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: {
    images: {
      findFirst: jest.fn(),
    },
    image_metadata: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        download: jest.fn(),
      })),
    },
  },
}));

jest.unstable_mockModule('../../services/aiProcessingService.js', () => ({
  processImageAI: jest.fn(),
}));

// Import after mocks
const { getDistinctColors, retryAIProcessing } = await import('../../services/imageService.js');
const { default: prisma } = await import('../../services/prismaClient.js');
const { supabase } = await import('../../services/supabaseClient.js');
const { processImageAI } = await import('../../services/aiProcessingService.js');

describe('imageService - getDistinctColors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return distinct colors from user images', async () => {
    // Mock metadata with colors
    const mockMetadata = [
      {
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        dominant_color: '#ff0000'
      },
      {
        colors: ['#ff0000', '#ffff00'], // Duplicate red
        dominant_color: '#ffff00'
      },
      {
        colors: null,
        dominant_color: '#000000'
      }
    ];

    prisma.image_metadata.findMany.mockResolvedValueOnce(mockMetadata);

    const result = await getDistinctColors({ userId: 'user-123', limit: 10 });

    expect(result).toEqual({
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#000000'],
      total: 5
    });

    expect(prisma.image_metadata.findMany).toHaveBeenCalledWith({
      where: {
        user_id: 'user-123',
        ai_processing_status: 'completed',
        OR: [
          { colors: { not: { equals: [] } } },
          { dominant_color: { not: null } }
        ]
      },
      select: {
        colors: true,
        dominant_color: true
      }
    });
  });

  it('should filter out invalid hex colors', async () => {
    const mockMetadata = [
      {
        colors: ['#ff0000', 'invalid-color', '#00ff00', '#xyz'],
        dominant_color: 'not-hex'
      }
    ];

    prisma.image_metadata.findMany.mockResolvedValueOnce(mockMetadata);

    const result = await getDistinctColors({ userId: 'user-123' });

    expect(result.colors).toEqual(['#ff0000', '#00ff00']);
    expect(result.total).toBe(2);
  });

  it('should respect the limit parameter', async () => {
    const mockMetadata = [
      {
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
        dominant_color: '#000000'
      }
    ];

    prisma.image_metadata.findMany.mockResolvedValueOnce(mockMetadata);

    const result = await getDistinctColors({ userId: 'user-123', limit: 3 });

    expect(result.colors).toHaveLength(3);
    expect(result.total).toBe(6); // Total unique colors
  });

  it('should handle empty results', async () => {
    prisma.image_metadata.findMany.mockResolvedValueOnce([]);

    const result = await getDistinctColors({ userId: 'user-123' });

    expect(result).toEqual({
      colors: [],
      total: 0
    });
  });
});

describe('imageService - retryAIProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retry AI processing for a valid image', async () => {
    const mockImage = {
      id: 1,
      user_id: 'user-123',
      original_path: 'path/to/image.jpg'
    };

    const mockMetadata = {
      image_id: 1,
      ai_processing_status: 'failed'
    };

    const mockFileBlob = new Blob(['image data']);
    const mockArrayBuffer = new ArrayBuffer(8);

    prisma.images.findFirst.mockResolvedValueOnce(mockImage);
    prisma.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);

    supabase.storage.from.mockReturnValueOnce({
      download: jest.fn().mockResolvedValueOnce({
        data: mockFileBlob,
        error: null
      })
    });

    // Mock blob methods
    mockFileBlob.arrayBuffer = jest.fn().mockResolvedValueOnce(mockArrayBuffer);
    processImageAI.mockResolvedValueOnce();

    const result = await retryAIProcessing({ imageId: 1, userId: 'user-123' });

    expect(result).toEqual({
      success: true,
      message: 'AI processing retry initiated',
      image_id: 1,
    });

    expect(prisma.images.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
        user_id: 'user-123',
      },
    });
  });

  it('should throw 404 error if image not found', async () => {
    prisma.images.findFirst.mockResolvedValueOnce(null);

    await expect(retryAIProcessing({ imageId: 1, userId: 'user-123' }))
      .rejects
      .toThrow('Image not found');
  });

  it('should throw 404 error if metadata not found', async () => {
    const mockImage = { id: 1, user_id: 'user-123' };

    prisma.images.findFirst.mockResolvedValueOnce(mockImage);
    prisma.image_metadata.findFirst.mockResolvedValueOnce(null);

    await expect(retryAIProcessing({ imageId: 1, userId: 'user-123' }))
      .rejects
      .toThrow('Image metadata not found');
  });

  it('should throw 400 error if AI processing already completed', async () => {
    const mockImage = { id: 1, user_id: 'user-123' };
    const mockMetadata = { image_id: 1, ai_processing_status: 'completed' };

    prisma.images.findFirst.mockResolvedValueOnce(mockImage);
    prisma.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);

    await expect(retryAIProcessing({ imageId: 1, userId: 'user-123' }))
      .rejects
      .toThrow('AI processing already completed');
  });

  it('should throw 500 error if download fails', async () => {
    const mockImage = {
      id: 1,
      user_id: 'user-123',
      original_path: 'path/to/image.jpg'
    };
    const mockMetadata = { image_id: 1, ai_processing_status: 'failed' };

    prisma.images.findFirst.mockResolvedValueOnce(mockImage);
    prisma.image_metadata.findFirst.mockResolvedValueOnce(mockMetadata);

    supabase.storage.from.mockReturnValueOnce({
      download: jest.fn().mockResolvedValueOnce({
        data: null,
        error: 'Download failed'
      })
    });

    await expect(retryAIProcessing({ imageId: 1, userId: 'user-123' }))
      .rejects
      .toThrow('Failed to download image from storage');
  });
});