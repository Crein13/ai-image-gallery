/**
 * AI Processing Service - Orchestrates AI analysis workflow
 * Handles image analysis, embedding generation, and database updates
 * Uses fire-and-forget pattern for non-blocking async processing
 */
import { analyzeImage, generateEmbedding } from './openaiService.js';
import prisma from './prismaClient.js';

/**
 * Process image with AI and update metadata in database
 * Fire-and-forget: Never throws errors, logs them instead
 *
 * @param {number} imageId - Database ID of the image
 * @param {string} userId - User ID for the image
 * @param {Buffer} imageBuffer - Image data as buffer
 * @returns {Promise<void>}
 */
export async function processImageAI(imageId, userId, imageBuffer) {
  try {
    // Step 1: Analyze image with GPT-4o Vision
    const { description, tags } = await analyzeImage(imageBuffer);

    // Step 2: Generate embedding for semantic search
    const embedding = await generateEmbedding(description);

    // Step 3: Update database with AI results
    await prisma.image_metadata.updateMany({
      where: {
        image_id: imageId,
        user_id: userId
      },
      data: {
        description,
        tags,
        embedding,
        ai_processing_status: 'completed',
        updated_at: new Date(),
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error(`AI processing failed for image ${imageId}:`, error);

    // Determine failure reason for better user feedback
    let failureReason = 'unknown';
    if (error.message?.includes('quota')) {
      failureReason = 'quota_exceeded';
    } else if (error.message?.includes('rate limit')) {
      failureReason = 'rate_limit';
    } else if (error.message?.includes('API key')) {
      failureReason = 'api_key_invalid';
    }

    // Mark as failed in database
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
      // If database update fails, just log - don't throw
      console.error(`Failed to update status for image ${imageId}:`, dbError);
    }
  }
}
