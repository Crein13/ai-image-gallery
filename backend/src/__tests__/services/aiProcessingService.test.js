import { jest } from '@jest/globals';

// Mock dependencies before importing
const mockAnalyzeImage = jest.fn();

jest.unstable_mockModule('../../services/openaiService.js', () => ({
  analyzeImage: mockAnalyzeImage,
}));

const updateMock = jest.fn();
const updateManyMock = jest.fn();
const createMock = jest.fn();
const prismaMock = {
  image_metadata: {
    update: updateMock,
    updateMany: updateManyMock,
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

    // Mock Prisma updateMany
    updateManyMock.mockResolvedValueOnce({ count: 1 });

    await processImageAI(imageId, userId, mockBuffer);

    // Verify OpenAI calls
    expect(mockAnalyzeImage).toHaveBeenCalledWith(mockBuffer);

    // Verify database update
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        description: 'A beautiful sunset over the ocean',
        tags: ['sunset', 'ocean', 'nature', 'landscape'],
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
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        ai_processing_status: 'failed',
        updated_at: expect.any(Date),
      },
    });

    consoleErrorSpy.mockRestore();
  });

  test('should categorize quota exceeded errors', async () => {
    const quotaError = new Error('You exceeded your current quota, please check your plan and billing details.');
    mockAnalyzeImage.mockRejectedValueOnce(quotaError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await processImageAI(imageId, userId, mockBuffer);

    // Verify error logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `AI processing failed for image ${imageId}:`,
      expect.any(Error)
    );

    // Verify status updated to failed
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        ai_processing_status: 'failed',
        updated_at: expect.any(Date),
      },
    });

    consoleErrorSpy.mockRestore();
  });

  test('should categorize rate limit errors', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    mockAnalyzeImage.mockRejectedValueOnce(rateLimitError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await processImageAI(imageId, userId, mockBuffer);

    // Verify error logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `AI processing failed for image ${imageId}:`,
      expect.any(Error)
    );

    // Verify status updated to failed
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        ai_processing_status: 'failed',
        updated_at: expect.any(Date),
      },
    });

    consoleErrorSpy.mockRestore();
  });

  test('should categorize API key errors', async () => {
    const apiKeyError = new Error('Invalid API key provided');
    mockAnalyzeImage.mockRejectedValueOnce(apiKeyError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await processImageAI(imageId, userId, mockBuffer);

    // Verify error logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `AI processing failed for image ${imageId}:`,
      expect.any(Error)
    );

    // Verify status updated to failed
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
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

    // Mock database update succeeds
    updateManyMock.mockResolvedValueOnce({ count: 1 });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await processImageAI(imageId, userId, mockBuffer);

    // Should successfully update with description/tags
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        description: 'A mountain landscape',
        tags: ['mountain', 'landscape'],
        ai_processing_status: 'completed',
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

    updateManyMock.mockResolvedValueOnce({ count: 1 });

    await processImageAI(imageId, userId, mockBuffer);

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        description: 'An image',
        tags: [],
        ai_processing_status: 'completed',
        updated_at: expect.any(Date),
      },
    });
  });
});
