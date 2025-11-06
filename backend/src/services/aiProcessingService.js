import { analyzeImage } from './openaiService.js';
import prisma from './prismaClient.js';

/**
 * @param {number} imageId
 * @param {string} userId
 * @param {Buffer} imageBuffer
 * @returns {Promise<void>}
 */
export async function processImageAI(imageId, userId, imageBuffer) {
  try {
    const { description, tags } = await analyzeImage(imageBuffer);
    await prisma.image_metadata.updateMany({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        description,
        tags,
        ai_processing_status: 'completed',
        updated_at: new Date(),
      },
    });
  } catch (error) {
    let failureReason = 'unknown';
    if (error.message?.includes('quota')) {
      failureReason = 'quota_exceeded';
    } else if (error.message?.includes('rate limit')) {
      failureReason = 'rate_limit';
    } else if (error.message?.includes('API key')) {
      failureReason = 'api_key_invalid';
    }
    try {
      await prisma.image_metadata.updateMany({
        where: {
          image_id: imageId,
          user_id: userId
        },
        data: {
          ai_processing_status: 'failed',
          updated_at: new Date(),
        },
      });
    } catch (dbError) {
      console.error(`Failed to update status for image ${imageId}:`, dbError);
    }
  }
}
