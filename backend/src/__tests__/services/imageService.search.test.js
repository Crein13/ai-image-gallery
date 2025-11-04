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
const mockPrismaQueryRaw = jest.fn();

jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: {
    images: {
      findMany: mockPrismaFindMany,
      count: mockPrismaCount,
    },
    $queryRaw: mockPrismaQueryRaw,
  },
}));

const { searchImages } = await import('../../services/imageService.js');

describe('imageService.searchImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fuzzy Text Search via Stored Procedure', () => {
    test('uses stored procedure for text-only search with fuzzy matching', async () => {
      // Mock stored procedure results
      const mockSearchResults = [
        {
          id: 1,
          image_id: 101,
          description: 'A beautiful sunset at the beach',
          tags: ['beach', 'sunset', 'ocean'],
          colors: ['#ff6b35'],
          dominant_color: '#ff6b35',
          ai_processing_status: 'completed',
          match_score: 0.85,
        },
      ];

      const mockCountResult = [{ count: BigInt(1) }];

      const mockImageData = [
        {
          id: 101,
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

      // Setup mocks for stored procedure path
      mockPrismaQueryRaw
        .mockResolvedValueOnce(mockSearchResults) // First call: search results
        .mockResolvedValueOnce(mockCountResult); // Second call: count

      mockPrismaFindMany.mockResolvedValueOnce(mockImageData);

      const result = await searchImages({
        userId: 'user-123',
        query: 'beach',
        limit: 20,
        offset: 0,
      });

      // Verify stored procedure was called
      expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(2);
      
      // Verify results
      expect(result.items).toHaveLength(1);
      expect(result.items[0].metadata.tags).toContain('beach');
      expect(result.total).toBe(1);
    });

    test('returns empty results when stored procedure finds no matches', async () => {
      mockPrismaQueryRaw
        .mockResolvedValueOnce([]) // Empty search results
        .mockResolvedValueOnce([{ count: BigInt(0) }]); // Zero count

      const result = await searchImages({
        userId: 'user-123',
        query: 'nonexistent',
        limit: 20,
        offset: 0,
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('handles pagination with stored procedure', async () => {
      const mockSearchResults = [
        {
          id: 1,
          image_id: 101,
          description: 'Test image',
          tags: ['test'],
          colors: [],
          dominant_color: null,
          ai_processing_status: 'completed',
          match_score: 0.9,
        },
      ];

      mockPrismaQueryRaw
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce([{ count: BigInt(50) }]);

      mockPrismaFindMany.mockResolvedValueOnce([
        {
          id: 101,
          user_id: 'user-123',
          filename: 'test.jpg',
          original_path: 'test.jpg',
          thumbnail_path: 'test-thumb.jpg',
          file_size: 1000,
          mime_type: 'image/jpeg',
          uploaded_at: new Date(),
          image_metadata: [mockSearchResults[0]],
        },
      ]);

      const result = await searchImages({
        userId: 'user-123',
        query: 'test',
        limit: 10,
        offset: 20,
      });

      expect(result.total).toBe(50);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('Prisma-based Search (with color or oldest sort)', () => {
    test('uses Prisma when color filter is provided', async () => {
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

      // Should use Prisma, not stored procedure
      expect(mockPrismaQueryRaw).not.toHaveBeenCalled();
      expect(mockPrismaFindMany).toHaveBeenCalled();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].metadata.colors).toContain('#0000ff');
    });

    test('uses Prisma when sort=oldest is specified', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-123',
        query: 'test',
        sort: 'oldest',
      });

      // Should use Prisma with oldest sort
      expect(mockPrismaQueryRaw).not.toHaveBeenCalled();
      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { uploaded_at: 'asc' },
        })
      );
    });

    test('combines text and color filters with Prisma', async () => {
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

      expect(mockPrismaQueryRaw).not.toHaveBeenCalled();
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

    test('filters by dominant color only', async () => {
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
  });

  describe('Validation and Edge Cases', () => {
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

    test('handles empty query string without color (returns all images)', async () => {
      mockPrismaCount.mockResolvedValueOnce(10);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      const result = await searchImages({
        userId: 'user-123',
        query: '   ', // Whitespace only
      });

      // Should not use stored procedure for empty query
      expect(mockPrismaFindMany).toHaveBeenCalled();
    });

    test('enforces user ownership in all searches', async () => {
      mockPrismaCount.mockResolvedValueOnce(0);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-456',
        color: '#ff0000',
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

  describe('Pagination', () => {
    test('respects limit and offset parameters', async () => {
      mockPrismaCount.mockResolvedValueOnce(50);
      mockPrismaFindMany.mockResolvedValueOnce([]);

      await searchImages({
        userId: 'user-123',
        color: '#ff0000', // Force Prisma path
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
        color: '#ff0000', // Force Prisma path
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
        color: '#ff0000', // Force Prisma path
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
        color: '#ff0000', // Force Prisma path
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
        color: '#ff0000', // Force Prisma path
      });

      expect(result.items[0].metadata).toBeNull();
    });
  });
});
