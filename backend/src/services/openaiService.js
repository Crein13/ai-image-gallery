/**
 * OpenAI Service - AI-powered image analysis and embedding generation
 * Provides description, tags, and semantic search vectors for images
 */
import OpenAI from 'openai';

/**
 * Analyze an image and generate description + tags using GPT-4o Vision
 * @param {Buffer} imageBuffer - Image data as buffer
 * @returns {Promise<{description: string, tags: string[]}>}
 * @throws {Error} If API key not configured or OpenAI API fails
 */
export async function analyzeImage(imageBuffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const client = new OpenAI({ apiKey });

  // Convert buffer to base64 for OpenAI Vision API
  const base64Image = imageBuffer.toString('base64');

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this image and provide a concise description and 3-7 relevant tags (objects, colors, concepts, mood). Return JSON: {"description": "...", "tags": ["tag1", "tag2", ...]}',
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

  // Parse JSON response from GPT
  const content = response.choices[0].message.content;
  const result = JSON.parse(content);

  return {
    description: result.description,
    tags: result.tags,
  };
}

/**
 * Generate embedding vector for semantic search
 * @param {string} text - Text to embed (usually image description)
 * @returns {Promise<number[]>} 1536-dimension embedding vector
 * @throws {Error} If API key not configured or OpenAI API fails
 */
export async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const client = new OpenAI({ apiKey });

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}
