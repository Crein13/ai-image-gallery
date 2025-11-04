/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';

// Mock Supabase client
jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn(),
        upload: jest.fn(),
        remove: jest.fn(),
      })),
    },
  },
}));

// Mock Prisma
const mockPrismaFindMany = jest.fn();
const mockPrismaCount = jest.fn();

jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: {
    images: {
      findMany: mockPrismaFindMany,
      count: mockPrismaCount,
    },
  },
}));

const { searchImages } = await import('../../services/imageService.js');

describe('imageService.searchImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Search (tags and description)', () => {
    test('searches by query term in tags (case-insensitive)', async () => {
      const mockResults = [
        {
          id: 1,
          user_id: 'user-123',
          filename: 'beach.jpg',
          original_path: 'originals/user-123/beach.jpg',
          thumbnail_path: 'thumbnails/user-123/beach.jpg',
          file_size: 1024000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-01'),
          image_metadata: [
            {
              description: 'A beautiful sunset at the beach',
              tags: ['beach', 'sunset', 'ocean'],
              colors: ['#ff6b35'],
              dominant_color: '#ff6b35',
              ai_processing_status: 'completed',
            },
          ],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        query: 'beach',
        limit: 20,
        offset: 0,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            image_metadata: expect.objectContaining({
              some: expect.objectContaining({
                OR: expect.arrayContaining([
                  { tags: { has: 'beach' } },
                  { description: { contains: 'beach', mode: 'insensitive' } },
                ]),
              }),
            }),
          }),
        })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].metadata.tags).toContain('beach');
      expect(result.total).toBe(1);
    });

    test('searches by query term in description (case-insensitive)', async () => {
      const mockResults = [
        {
          id: 2,
          user_id: 'user-123',
          filename: 'sunset.jpg',
          original_path: 'originals/user-123/sunset.jpg',
          thumbnail_path: 'thumbnails/user-123/sunset.jpg',
          file_size: 2048000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-02'),
          image_metadata: [
            {
              description: 'Golden hour at the mountain peak',
              tags: ['mountain', 'golden-hour'],
              colors: ['#ffa500'],
              dominant_color: '#ffa500',
              ai_processing_status: 'completed',
            },
          ],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        query: 'mountain',
        limit: 20,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].metadata.description).toContain('mountain');
      expect(result.total).toBe(1);
    });

    test('returns empty array when no results match query', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      const result = await searchImages({
        userId: 'user-123',
        query: 'nonexistent',
        limit: 20,
        offset: 0,
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('enforces user ownership in search', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-456',
        query: 'test',
        limit: 20,
        offset: 0,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-456',
          }),
        })
      );
    });
  });

  describe('Color Filtering', () => {
    test('filters by exact color match in colors array', async () => {
      const mockResults = [
        {
          id: 3,
          user_id: 'user-123',
          filename: 'blue-sky.jpg',
          original_path: 'originals/user-123/blue-sky.jpg',
          thumbnail_path: 'thumbnails/user-123/blue-sky.jpg',
          file_size: 1500000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-03'),
          image_metadata: [
            {
              description: 'Clear blue sky',
              tags: ['sky', 'blue'],
              colors: ['#0000ff', '#87ceeb'],
              dominant_color: '#0000ff',
              ai_processing_status: 'completed',
            },
          ],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        color: '#0000ff',
        limit: 20,
        offset: 0,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            image_metadata: expect.objectContaining({
              some: expect.objectContaining({
                colors: { has: '#0000ff' },
              }),
            }),
          }),
        })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].metadata.colors).toContain('#0000ff');
    });

    test('filters by dominant color', async () => {
      const mockResults = [
        {
          id: 4,
          user_id: 'user-123',
          filename: 'red-flower.jpg',
          original_path: 'originals/user-123/red-flower.jpg',
          thumbnail_path: 'thumbnails/user-123/red-flower.jpg',
          file_size: 1800000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-04'),
          image_metadata: [
            {
              description: 'Red rose in bloom',
              tags: ['flower', 'red', 'rose'],
              colors: ['#ff0000', '#8b0000'],
              dominant_color: '#ff0000',
              ai_processing_status: 'completed',
            },
          ],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        color: '#ff0000',
        dominantOnly: true,
        limit: 20,
        offset: 0,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            image_metadata: expect.objectContaining({
              some: expect.objectContaining({
                dominant_color: '#ff0000',
              }),
            }),
          }),
        })
      );

      expect(result.items[0].metadata.dominant_color).toBe('#ff0000');
    });

    test('returns empty array when no images match color', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      const result = await searchImages({
        userId: 'user-123',
        color: '#123456',
        limit: 20,
        offset: 0,
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Combined Search (text + color)', () => {
    test('combines query and color filters with AND logic', async () => {
      const mockResults = [
        {
          id: 5,
          user_id: 'user-123',
          filename: 'blue-ocean.jpg',
          original_path: 'originals/user-123/blue-ocean.jpg',
          thumbnail_path: 'thumbnails/user-123/blue-ocean.jpg',
          file_size: 2200000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-05'),
          image_metadata: [
            {
              description: 'Blue ocean waves',
              tags: ['ocean', 'blue', 'water'],
              colors: ['#0000ff', '#1e90ff'],
              dominant_color: '#0000ff',
              ai_processing_status: 'completed',
            },
          ],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        query: 'ocean',
        color: '#0000ff',
        limit: 20,
        offset: 0,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            image_metadata: expect.objectContaining({
              some: expect.objectContaining({
                AND: expect.arrayContaining([
                  expect.objectContaining({
                    OR: expect.arrayContaining([
                      { tags: { has: 'ocean' } },
                      { description: { contains: 'ocean', mode: 'insensitive' } },
                    ]),
                  }),
                  { colors: { has: '#0000ff' } },
                ]),
              }),
            }),
          }),
        })
      );

      expect(result.items).toHaveLength(1);
    });
  });

  describe('Pagination', () => {
    test('respects limit and offset parameters', async () => {
      mockPrismaCount.mockResolvedValueOnce(50);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-123',
        query: 'test',
        limit: 10,
        offset: 20,
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    test('defaults to limit 20 and offset 0', async () => {
      mockPrismaCount.mockResolvedValueOnce(5);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-123',
        query: 'test',
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });

    test('computes pagination metadata correctly', async () => {
      mockPrismaCount.mockResolvedValueOnce(100);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      const result = await searchImages({
        userId: 'user-123',
        query: 'test',
        limit: 20,
        offset: 40,
      });

      expect(result.total).toBe(100);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(40);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
      expect(result.nextOffset).toBe(60);
      expect(result.prevOffset).toBe(20);
    });
  });

  describe('Sorting', () => {
    test('sorts by newest (default)', async () => {
      mockPrismaCount.mockResolvedValueOnce(2);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-123',
        query: 'test',
        sort: 'newest',
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { uploaded_at: 'desc' },
        })
      );
    });

    test('sorts by oldest when specified', async () => {
      mockPrismaCount.mockResolvedValueOnce(2);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-123',
        query: 'test',
        sort: 'oldest',
      });

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { uploaded_at: 'asc' },
        })
      );
    });
  });

  describe('Metadata Formatting', () => {
    test('formats metadata with defaults for null values', async () => {
      const mockResults = [
        {
          id: 6,
          user_id: 'user-123',
          filename: 'pending.jpg',
          original_path: 'originals/user-123/pending.jpg',
          thumbnail_path: 'thumbnails/user-123/pending.jpg',
          file_size: 1000000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-06'),
          image_metadata: [
            {
              description: null,
              tags: null,
              colors: null,
              dominant_color: null,
              ai_processing_status: 'pending',
            },
          ],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        query: 'pending',
      });

      expect(result.items[0].metadata).toEqual({
        description: null,
        tags: [],
        colors: [],
        dominant_color: null,
        ai_processing_status: 'pending',
      });
    });

    test('handles images with no metadata', async () => {
      const mockResults = [
        {
          id: 7,
          user_id: 'user-123',
          filename: 'no-meta.jpg',
          original_path: 'originals/user-123/no-meta.jpg',
          thumbnail_path: 'thumbnails/user-123/no-meta.jpg',
          file_size: 800000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date('2025-01-07'),
          image_metadata: [],
        },
      ];

      mockPrismaCount.mockResolvedValueOnce(1);
      mockPrismaFindMany.mockResolvedValueOnce(mockResults);

      const result = await searchImages({
        userId: 'user-123',
        query: 'test',
      });

      expect(result.items[0].metadata).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty query string', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      const result = await searchImages({
        userId: 'user-123',
        query: '',
      });

      // Should not add query filter if empty
      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
          }),
        })
      );

      expect(result.items).toHaveLength(0);
    });

    test('validates and normalizes color format', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      // Test with uppercase hex
      await searchImages({
        userId: 'user-123',
        color: '#FF0000',
      });

      // Should normalize to lowercase
      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            image_metadata: expect.objectContaining({
              some: expect.objectContaining({
                colors: { has: '#ff0000' },
              }),
            }),
          }),
        })
      );
    });

    test('throws error for invalid color format', async () => {
      await expect(
        searchImages({
          userId: 'user-123',
          color: 'invalid-color',
        })
      ).rejects.toThrow('Invalid color format');
    });
  });
});
