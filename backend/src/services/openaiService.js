import OpenAI from 'openai';

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{description: string, tags: string[]}>}
 */
export async function analyzeImage(imageBuffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const client = new OpenAI({ apiKey });
  const base64Image = imageBuffer.toString('base64');

  const response = await client.chat.completions.create({
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

  const content = response.choices?.[0]?.message?.content ?? '';

  function parseJsonFromContent(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Empty response from AI');
    }
    try {
      return JSON.parse(text);
    } catch (_) {
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch && fenceMatch[1]) {
        const inner = fenceMatch[1].trim();
        try {
          return JSON.parse(inner);
        } catch (_) {}
      }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const jsonSlice = text.slice(start, end + 1);
        try {
          return JSON.parse(jsonSlice);
        } catch (_) {}
      }
      throw new Error('AI response was not valid JSON');
    }
  }

  const result = parseJsonFromContent(content);

  const description = typeof result.description === 'string' ? result.description.trim() : '';
  let tags = Array.isArray(result.tags) ? result.tags : [];
  tags = tags
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim())
    .slice(0, 10);

  return {
    description,
    tags,
  };
}
