import { jest } from '@jest/globals';

// Mock dependencies before importing
const mockAnalyzeImage = jest.fn();
const mockGenerateEmbedding = jest.fn();
const mockGenerateTags = jest.fn();

jest.unstable_mockModule('../../services/openaiService.js', () => ({
  analyzeImage: mockAnalyzeImage,
  generateEmbedding: mockGenerateEmbedding,
  generateTags: mockGenerateTags,
}));

const updateMock = jest.fn();
const createMock = jest.fn();
const prismaMock = {
  image_metadata: {
    update: updateMock,
    create: createMock,
  },
};

jest.unstable_mockModule('../../services/prismaClient.js', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

// Import service after mocking
const { processImageAI } = await import('../../services/aiProcessingService.js');

describe('aiProcessingService - processImageAI', () => {
  const imageId = 123;
  const userId = 'user-abc-123';
  const mockBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should process image with AI and update metadata', async () => {
    // Mock OpenAI responses
    mockAnalyzeImage.mockResolvedValueOnce({
      description: 'A beautiful sunset over the ocean',
      tags: ['sunset', 'ocean', 'nature', 'landscape'],
    });

    mockGenerateEmbedding.mockResolvedValueOnce(
      Array(1536).fill(0.1) // Mock embedding vector
    );

    // Mock Prisma update
    updateMock.mockResolvedValueOnce({
      id: 1,
      image_id: imageId,
      description: 'A beautiful sunset over the ocean',
      tags: ['sunset', 'ocean', 'nature', 'landscape'],
      ai_processing_status: 'completed',
    });

    await processImageAI(imageId, userId, mockBuffer);

    // Verify OpenAI calls
    expect(mockAnalyzeImage).toHaveBeenCalledWith(mockBuffer);
    expect(mockGenerateEmbedding).toHaveBeenCalledWith('A beautiful sunset over the ocean');

    // Verify database update
    expect(updateMock).toHaveBeenCalledWith({
      where: { image_id: imageId },
      data: {
        description: 'A beautiful sunset over the ocean',
        tags: ['sunset', 'ocean', 'nature', 'landscape'],
        embedding: expect.any(Array),
        ai_processing_status: 'completed',
        updated_at: expect.any(Date),
      },
    });
  });

  test('should handle AI analysis failure and mark as failed', async () => {
    mockAnalyzeImage.mockRejectedValueOnce(new Error('OpenAI API error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await processImageAI(imageId, userId, mockBuffer);

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `AI processing failed for image ${imageId}:`,
      expect.any(Error)
    );

    // Verify status updated to failed
    expect(updateMock).toHaveBeenCalledWith({
      where: { image_id: imageId },
      data: {
        ai_processing_status: 'failed',
        updated_at: expect.any(Date),
      },
    });

    consoleErrorSpy.mockRestore();
  });

  test('should handle embedding generation failure gracefully', async () => {
    mockAnalyzeImage.mockResolvedValueOnce({
      description: 'A mountain landscape',
      tags: ['mountain', 'landscape'],
    });

    mockGenerateEmbedding.mockRejectedValueOnce(new Error('Embedding failed'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await processImageAI(imageId, userId, mockBuffer);

    // Should still update with description/tags but no embedding
    expect(updateMock).toHaveBeenCalledWith({
      where: { image_id: imageId },
      data: {
        ai_processing_status: 'failed',
        updated_at: expect.any(Date),
      },
    });

    consoleErrorSpy.mockRestore();
  });

  test('should not throw error if processing fails (fire-and-forget)', async () => {
    mockAnalyzeImage.mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Should not throw - async processing is fire-and-forget
    await expect(processImageAI(imageId, userId, mockBuffer)).resolves.toBeUndefined();

    consoleErrorSpy.mockRestore();
  });

  test('should process minimal AI response', async () => {
    mockAnalyzeImage.mockResolvedValueOnce({
      description: 'An image',
      tags: [],
    });

    mockGenerateEmbedding.mockResolvedValueOnce(Array(1536).fill(0));

    updateMock.mockResolvedValueOnce({});

    await processImageAI(imageId, userId, mockBuffer);

    expect(updateMock).toHaveBeenCalledWith({
      where: { image_id: imageId },
      data: {
        description: 'An image',
        tags: [],
        embedding: expect.any(Array),
        ai_processing_status: 'completed',
        updated_at: expect.any(Date),
      },
    });
  });
});
