import { supabase } from './supabaseClient.js';
import prisma from './prismaClient.js';
import { generateThumbnail } from '../utils/imageProcessor.js';
import { extractDominantColors } from '../utils/colorExtractor.js';
import { processImageAI } from './aiProcessingService.js';

/**
 * Get a single image by ID with metadata
 * Enforces ownership - only returns image if it belongs to the requesting user
 *
 * @param {Object} params
 * @param {number} params.imageId - ID of the image to retrieve
 * @param {string} params.userId - ID of the requesting user
 * @returns {Promise<Object|null>} Image with metadata, or null if not found/not owned
 */
export async function getImageById({ imageId, userId }) {
  const image = await prisma.images.findFirst({
    where: {
      id: imageId,
      user_id: userId,
    },
    include: {
      image_metadata: {
        select: {
          description: true,
          tags: true,
          colors: true,
          dominant_color: true,
          ai_processing_status: true,
        },
      },
    },
  });

  if (!image) {
    return null;
  }

  // Format metadata same way as listImages
  const md = Array.isArray(image.image_metadata) ? image.image_metadata[0] : null;

  return {
    id: image.id,
    user_id: image.user_id,
    filename: image.filename,
    original_path: image.original_path,
    thumbnail_path: image.thumbnail_path,
    file_size: image.file_size,
    mime_type: image.mime_type,
    uploaded_at: image.uploaded_at,
    metadata: md
      ? {
          description: md.description ?? null,
          tags: md.tags ?? [],
          colors: md.colors ?? [],
          dominant_color: md.dominant_color ?? null,
          ai_processing_status: md.ai_processing_status ?? 'pending',
        }
      : null,
  };
}

/**
 * List images for a user with pagination and basic sorting
 * No business logic in routes: called by routes/images.js
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {('newest'|'oldest')} [params.sort='newest']
 * @returns {Promise<{items: Array, total: number, limit: number, offset: number}>}
 */
export async function listImages({ userId, limit = 20, offset = 0, sort = 'newest' }) {
  // Normalize params
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const orderBy = sort === 'oldest' ? { uploaded_at: 'asc' } : { uploaded_at: 'desc' };

  const where = { user_id: userId };

  const [total, rows] = await Promise.all([
    prisma.images.count({ where }),
    prisma.images.findMany({
      where,
      orderBy,
      take: safeLimit,
      skip: safeOffset,
      include: {
        image_metadata: {
          select: {
            description: true,
            tags: true,
            colors: true,
            dominant_color: true,
            ai_processing_status: true,
          },
        },
      },
    }),
  ]);

  const items = rows.map((img) => {
    const md = Array.isArray(img.image_metadata) ? img.image_metadata[0] : null;
    return {
      id: img.id,
      user_id: img.user_id,
      filename: img.filename,
      original_path: img.original_path,
      thumbnail_path: img.thumbnail_path,
      file_size: img.file_size,
      mime_type: img.mime_type,
      uploaded_at: img.uploaded_at,
      metadata: md
        ? {
            description: md.description ?? null,
            tags: md.tags ?? [],
            colors: md.colors ?? [],
            dominant_color: md.dominant_color ?? null,
            ai_processing_status: md.ai_processing_status ?? 'pending',
          }
        : null,
    };
  });

  // Compute pagination helpers
  const hasNext = safeOffset + safeLimit < total;
  const hasPrev = safeOffset > 0;
  const nextOffset = hasNext ? safeOffset + safeLimit : null;
  const prevOffset = hasPrev ? Math.max(0, safeOffset - safeLimit) : null;

  return {
    items,
    total,
    limit: safeLimit,
    offset: safeOffset,
    hasNext,
    hasPrev,
    nextOffset,
    prevOffset,
  };
}

/**
 * Check for existing filename and generate unique version if needed
 * @param {string} originalName - Original filename
 * @param {string} userId - User ID for ownership
 * @returns {Promise<string>} Unique filename (with number suffix if needed)
 */
async function getUniqueFilename(originalName, userId) {
  // Check if filename already exists for this user
  const existingImage = await prisma.images.findFirst({
    where: {
      user_id: userId,
      filename: originalName,
    },
  });

  // If no conflict, return original name
  if (!existingImage) {
    return originalName;
  }

  // Extract name and extension
  const lastDotIndex = originalName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';

  // Try incrementing numbers until we find an available filename
  let counter = 1;
  let newFilename;
  let exists = true;

  while (exists) {
    newFilename = `${name} (${counter})${extension}`;
    const check = await prisma.images.findFirst({
      where: {
        user_id: userId,
        filename: newFilename,
      },
    });

    if (!check) {
      exists = false;
    } else {
      counter++;
    }
  }

  return newFilename;
}

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
    // Check for duplicate filename and get unique version if needed
    const uniqueFilename = await getUniqueFilename(file.originalname, userId);

    // Generate storage filenames
    const timestamp = Date.now();
    const sanitizedName = uniqueFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
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
          filename: uniqueFilename,
          original_path: originalData.path,
          thumbnail_path: thumbData.path,
          file_size: file.size,
          mime_type: file.mimetype,
        },
      });

      // Create image_metadata record with initial color data
      await prisma.image_metadata.create({
        data: {
          image_id: imageRecord.id,
          user_id: userId,
          colors,
          dominant_color: dominantColor,
          ai_processing_status: 'pending',
        },
      });

      // Trigger AI processing in background (fire-and-forget)
      processImageAI(imageRecord.id, userId, file.buffer).catch((err) => {
        console.error('AI processing failed:', err);
      });

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
