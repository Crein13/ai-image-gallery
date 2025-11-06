import { jest } from '@jest/globals';

// Mock OpenAI SDK before importing service
const mockCreate = jest.fn();
const mockOpenAI = jest.fn(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));

jest.unstable_mockModule('openai', () => ({
  default: mockOpenAI,
}));

// Import service after mocking
const { analyzeImage } = await import('../../services/openaiService.js');

describe('openaiService', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('analyzeImage', () => {
    test('should analyze image and return description and tags', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const base64Image = mockBuffer.toString('base64');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              description: 'A beautiful sunset over the ocean with vibrant orange and pink colors',
              tags: ['sunset', 'ocean', 'nature', 'landscape', 'colorful'],
            }),
          },
        }],
      });

      const result = await analyzeImage(mockBuffer);

      expect(result).toEqual({
        description: 'A beautiful sunset over the ocean with vibrant orange and pink colors',
        tags: ['sunset', 'ocean', 'nature', 'landscape', 'colorful'],
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide a concise description and 5-10 relevant tags (objects, colors, concepts, mood). Return JSON: {"description": "...", "tags": ["tag1", "tag2", ...]}',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });
    });

    test('should handle OpenAI API errors', async () => {
      const mockBuffer = Buffer.from('fake-image-data');

      mockCreate.mockRejectedValueOnce(new Error('OpenAI API rate limit exceeded'));

      await expect(analyzeImage(mockBuffer)).rejects.toThrow('OpenAI API rate limit exceeded');
    });

    test('should handle invalid JSON response', async () => {
      const mockBuffer = Buffer.from('fake-image-data');

      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Invalid JSON response',
          },
        }],
      });

      await expect(analyzeImage(mockBuffer)).rejects.toThrow();
    });

    test('should throw when OPENAI_API_KEY is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const mockBuffer = Buffer.from('fake-image-data');

      await expect(analyzeImage(mockBuffer)).rejects.toThrow('OPENAI_API_KEY not configured');
    });
  });
});
