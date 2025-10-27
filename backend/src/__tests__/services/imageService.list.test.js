import { jest } from '@jest/globals';

// Mock Supabase to prevent client initialization
const mockDownload = jest.fn();
const mockFrom = jest.fn(() => ({ download: mockDownload }));
jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: { storage: { from: mockFrom } },
}));

// Mock Prisma
const prismaImagesFindMany = jest.fn();
const prismaImagesCount = jest.fn();
jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: {
    images: {
      findMany: prismaImagesFindMany,
      count: prismaImagesCount,
    },
  },
  prisma: {
    images: {
      findMany: prismaImagesFindMany,
      count: prismaImagesCount,
    },
  },
}));

// Import module after mocks (listImages may not exist yet under TDD)
const imageServiceModule = await import('../../services/imageService.js');

describe('imageService.listImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('queries prisma and maps metadata', async () => {
    const { listImages } = imageServiceModule;
    const userId = 'user-123';
    const args = { userId, limit: 20, offset: 0, sort: 'newest' };

    prismaImagesCount.mockResolvedValueOnce(2);
    prismaImagesFindMany.mockResolvedValueOnce([
      {
        id: 1,
        user_id: userId,
        filename: 'a.jpg',
        original_path: 'orig/a.jpg',
        thumbnail_path: 'thumb/a.jpg',
        file_size: 100,
        mime_type: 'image/jpeg',
        uploaded_at: new Date(),
        image_metadata: [
          {
            description: 'hello',
            tags: ['t1'],
            colors: ['#000000'],
            dominant_color: '#000000',
            ai_processing_status: 'completed',
          },
        ],
      },
    ]);

  // Expect listImages to be implemented; calling will fail until then
  const result = await listImages(args);

    expect(prismaImagesCount).toHaveBeenCalledWith({ where: { user_id: userId } });
    expect(prismaImagesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: userId },
        orderBy: { uploaded_at: 'desc' },
        take: 20,
        skip: 0,
        include: expect.any(Object),
      })
    );

    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      filename: 'a.jpg',
      metadata: {
        description: 'hello',
        tags: ['t1'],
        colors: ['#000000'],
        dominant_color: '#000000',
        ai_processing_status: 'completed',
      },
    });
  });

  test('normalizes params: clamps limit 1..50, offset>=0, sort mapping', async () => {
    const { listImages } = imageServiceModule;
    const userId = 'user-123';

    prismaImagesCount.mockResolvedValueOnce(0);
    prismaImagesFindMany.mockResolvedValueOnce([]);

    await listImages({ userId, limit: 999, offset: -5, sort: 'oldest' });

    expect(prismaImagesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 0,
        orderBy: { uploaded_at: 'asc' },
      })
    );
  });

  test('computes pagination helpers for middle page', async () => {
    const { listImages } = imageServiceModule;
    const userId = 'user-123';

    prismaImagesCount.mockResolvedValueOnce(100);
    prismaImagesFindMany.mockResolvedValueOnce([]);

    const result = await listImages({ userId, limit: 10, offset: 30, sort: 'newest' });

    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(true);
    expect(result.nextOffset).toBe(40);
    expect(result.prevOffset).toBe(20);
  });

  test('computes pagination helpers for first page', async () => {
    const { listImages } = imageServiceModule;
    const userId = 'user-123';

    prismaImagesCount.mockResolvedValueOnce(50);
    prismaImagesFindMany.mockResolvedValueOnce([]);

    const result = await listImages({ userId, limit: 20, offset: 0, sort: 'newest' });

    expect(result.hasPrev).toBe(false);
    expect(result.prevOffset).toBe(null);
    expect(result.hasNext).toBe(true);
    expect(result.nextOffset).toBe(20);
  });

  test('computes pagination helpers for last page', async () => {
    const { listImages } = imageServiceModule;
    const userId = 'user-123';

    prismaImagesCount.mockResolvedValueOnce(25);
    prismaImagesFindMany.mockResolvedValueOnce([]);

    const result = await listImages({ userId, limit: 20, offset: 20, sort: 'newest' });

    expect(result.hasNext).toBe(false);
    expect(result.nextOffset).toBe(null);
    expect(result.hasPrev).toBe(true);
    expect(result.prevOffset).toBe(0);
  });

  test('computes pagination helpers for empty results', async () => {
    const { listImages } = imageServiceModule;
    const userId = 'user-123';

    prismaImagesCount.mockResolvedValueOnce(0);
    prismaImagesFindMany.mockResolvedValueOnce([]);

    const result = await listImages({ userId, limit: 20, offset: 0, sort: 'newest' });

    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
    expect(result.nextOffset).toBe(null);
    expect(result.prevOffset).toBe(null);
  });
});