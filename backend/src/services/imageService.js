import { supabase } from './supabaseClient.js';
import prisma from './prismaClient.js';
import { generateThumbnail } from '../utils/imageProcessor.js';
import { extractDominantColors } from '../utils/colorExtractor.js';

/**
 * Upload an image file to Supabase Storage and save metadata to database
 * @param {Object} file - Multer file object with buffer, originalname, mimetype, size
 * @param {string} userId - User ID for ownership
 * @returns {Promise<Object>} Created image record from database
 */
export async function uploadImage(file, userId) {
  // Validate file type (must be JPEG, PNG, or WebP)
  if (!file.mimetype || !/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) {
    const err = new Error('Only JPEG, PNG, and WebP images are allowed');
    err.status = 400;
    throw err;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    const err = new Error('File size must be under 10MB');
    err.status = 400;
    throw err;
  }

  // Validate required fields
  if (!file.buffer || !file.originalname) {
    const err = new Error('Only image files are allowed');
    err.status = 400;
    throw err;
  }

  try {
    // Generate unique filenames
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const originalFilename = `originals/${userId}/original-${timestamp}-${sanitizedName}`;
    const thumbFilename = `thumbnails/${userId}/thumb-${timestamp}-${sanitizedName}`;

    // Extract dominant colors (synchronous during upload)
    let colors = [];
    let dominantColor = null;
    try {
      colors = await extractDominantColors(file.buffer);
      dominantColor = colors.length > 0 ? colors[0] : null;
    } catch (error) {
      console.warn('Color extraction failed:', error);
      // Continue with upload even if color extraction fails
    }

    // Generate thumbnail using imageProcessor utility
    let thumbnailBuffer;
    try {
      const result = await generateThumbnail(file.buffer, 300);
      thumbnailBuffer = result.thumbnailBuffer;
    } catch (error) {
      console.error('Sharp thumbnail generation error:', error);
      const err = new Error('Failed to generate thumbnail');
      err.status = 500;
      throw err;
    }

    // Upload original image to Supabase Storage
    const { data: originalData, error: originalError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(originalFilename, file.buffer, {
        contentType: file.mimetype,
      });

    if (originalError || !originalData) {
      console.error('Supabase original upload error:', originalError);
      const err = new Error('Failed to upload original image');
      err.status = 500;
      throw err;
    }

    // Upload thumbnail to Supabase Storage
    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(thumbFilename, thumbnailBuffer, {
        contentType: file.mimetype,
      });

    if (thumbError || !thumbData) {
      console.error('Supabase thumbnail upload error:', thumbError);
      const err = new Error('Failed to upload thumbnail');
      err.status = 500;
      throw err;
    }

    // Save image metadata to database
    try {
      const imageRecord = await prisma.images.create({
        data: {
          user_id: userId,
          filename: file.originalname,
          original_path: originalData.path,
          thumbnail_path: thumbData.path,
          file_size: file.size,
          mime_type: file.mimetype,
        },
      });

      // TODO: Trigger AI processing in background (will implement later)
      // processImageAI(imageRecord.id, userId, file.buffer).catch(err => {
      //   console.error('AI processing failed:', err);
      // });

      // Return image record with color data
      return {
        ...imageRecord,
        colors,
        dominant_color: dominantColor,
        ai_processing_status: 'pending', // Will be updated by AI processing
      };
    } catch (error) {
      console.error('Prisma create error:', error);
      const err = new Error('Failed to save image record');
      err.status = 500;
      throw err;
    }
  } catch (error) {
    // Re-throw if already has status
    if (error.status) {
      throw error;
    }
    // Wrap unexpected errors
    const err = new Error('Image upload failed');
    err.status = 500;
    throw err;
  }
}
