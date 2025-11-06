import { supabase } from './supabaseClient.js';
import prisma from './prismaClient.js';
import { generateThumbnail } from '../utils/imageProcessor.js';
import { extractDominantColors } from '../utils/colorExtractor.js';
import { processImageAI } from './aiProcessingService.js';

/**
 * @param {Object} params
 * @param {number} params.imageId
 * @param {string} params.userId
 * @returns {Promise<Object|null>}
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
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {('newest'|'oldest')} [params.sort='newest']
 * @returns {Promise<{items: Array, total: number, limit: number, offset: number}>}
 */
export async function listImages({ userId, limit = 20, offset = 0, sort = 'newest' }) {
  try {
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
  } catch (error) {
    return {
      items: [],
      total: 0,
      limit: safeLimit || 20,
      offset: safeOffset || 0,
      hasNext: false,
      hasPrev: false,
      nextOffset: null,
      prevOffset: null,
    };
  }
}

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} [params.query]
 * @param {string} [params.color]
 * @param {boolean} [params.dominantOnly=false]
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {('newest'|'oldest')} [params.sort='newest']
 * @returns {Promise<Object>}
 */
export async function searchImages({
  userId,
  query,
  color,
  dominantOnly = false,
  limit = 20,
  offset = 0,
  sort = 'newest',
}) {
  if (color) {
    const colorRegex = /^#[0-9a-f]{6}$/i;
    if (!colorRegex.test(color)) {
      throw new Error('Invalid color format. Expected hex color like #ff0000');
    }
    color = color.toLowerCase();
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const orderBy = sort === 'oldest' ? { uploaded_at: 'asc' } : { uploaded_at: 'desc' };

  const where = {
    user_id: userId,
  };

  const metadataFilters = [];
  if (query && query.trim()) {
    metadataFilters.push({
      OR: [
        { tags: { has: query.trim() } },
        {
          description: {
            contains: query.trim(),
            mode: 'insensitive'
          }
        },
      ],
    });
  }

  if (color) {
    if (dominantOnly) {
      metadataFilters.push({
        dominant_color: color,
      });
    } else {
      metadataFilters.push({
        colors: { has: color },
      });
    }
  }
  if (metadataFilters.length > 0) {
    where.image_metadata = {
      some: metadataFilters.length === 1 ? metadataFilters[0] : { AND: metadataFilters },
    };
  }
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
 * @param {string} originalName
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getUniqueFilename(originalName, userId) {
  const existingImage = await prisma.images.findFirst({
    where: {
      user_id: userId,
      filename: originalName,
    },
  });

  if (!existingImage) {
    return originalName;
  }

  const lastDotIndex = originalName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';
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
 * @param {Object} file
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function uploadImage(file, userId) {
  if (!file.mimetype || !/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) {
    const err = new Error('Only JPEG, PNG, and WebP images are allowed');
    err.status = 400;
    throw err;
  }

  if (file.size > 10 * 1024 * 1024) {
    const err = new Error('File size must be under 10MB');
    err.status = 400;
    throw err;
  }

  if (!file.buffer || !file.originalname) {
    const err = new Error('Only image files are allowed');
    err.status = 400;
    throw err;
  }

  try {
    const uniqueFilename = await getUniqueFilename(file.originalname, userId);

    const timestamp = Date.now();
    const sanitizedName = uniqueFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const originalFilename = `originals/${userId}/original-${timestamp}-${sanitizedName}`;
    const thumbFilename = `thumbnails/${userId}/thumb-${timestamp}-${sanitizedName}`;

    let colors = [];
    let dominantColor = null;
    try {
      colors = await extractDominantColors(file.buffer);
      dominantColor = colors.length > 0 ? colors[0] : null;
    } catch (error) {
      // Continue with upload even if color extraction fails
    }
    let thumbnailBuffer;
    try {
      const result = await generateThumbnail(file.buffer, 300);
      thumbnailBuffer = result.thumbnailBuffer;
    } catch (error) {
      const err = new Error('Failed to generate thumbnail');
      err.status = 500;
      throw err;
    }
    const { data: originalData, error: originalError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(originalFilename, file.buffer, {
        contentType: file.mimetype,
      });

    if (originalError || !originalData) {
      const err = new Error('Failed to upload original image');
      err.status = 500;
      throw err;
    }


    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(thumbFilename, thumbnailBuffer, {
        contentType: file.mimetype,
      });

    if (thumbError || !thumbData) {
      const err = new Error('Failed to upload thumbnail');
      err.status = 500;
      throw err;
    }

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


      await prisma.image_metadata.create({
        data: {
          image_id: imageRecord.id,
          user_id: userId,
          colors,
          dominant_color: dominantColor,
          ai_processing_status: 'pending',
        },
      });

      processImageAI(imageRecord.id, userId, file.buffer).catch(() => {
        // AI processing failed - will be retried later
      });
      return {
        ...imageRecord,
        colors,
        dominant_color: dominantColor,
        ai_processing_status: 'pending',
      };
    } catch (error) {
      const err = new Error('Failed to save image record');
      err.status = 500;
      throw err;
    }
  } catch (error) {
    if (error.status) {
      throw error;
    }
    const err = new Error('Image upload failed');
    err.status = 500;
    throw err;
  }
}

/**
 * @param {Object} params
 * @param {number} params.imageId
 * @param {string} params.userId
 * @param {number} [params.limit=20]
 * @returns {Promise<Object>}
 */
export async function findSimilarToImage({ imageId, userId, limit = 20 }) {
  const sourceImage = await prisma.images.findFirst({
    where: {
      id: imageId,
      user_id: userId,
    },
    include: {
      image_metadata: true,
    },
  });

  if (!sourceImage) {
    const err = new Error('Image not found');
    err.status = 404;
    throw err;
  }

  const metadata = Array.isArray(sourceImage.image_metadata)
    ? sourceImage.image_metadata[0]
    : null;

  if (!metadata) {
    const err = new Error('Image has no metadata');
    err.status = 400;
    throw err;
  }

  const sourceTags = metadata.tags || [];
  const sourceColors = metadata.colors || [];
  const orConditions = [];

  if (sourceTags.length > 0) {
    orConditions.push({
      image_metadata: {
        some: {
          tags: { hasSome: sourceTags },
        },
      },
    });
  }

  if (sourceColors.length > 0) {
    orConditions.push({
      image_metadata: {
        some: {
          colors: { hasSome: sourceColors },
        },
      },
    });
  }

  if (orConditions.length === 0) {
    return {
      items: [],
      total: 0,
      limit,
    };
  }

  const similarImages = await prisma.images.findMany({
    where: {
      user_id: userId,
      id: { not: imageId },
      OR: orConditions,
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
    take: limit,
    orderBy: {
      uploaded_at: 'desc',
    },
  });

  const formattedImages = similarImages.map((image) => {
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
  });

  return {
    items: formattedImages,
    total: formattedImages.length,
    limit,
  };
}

/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {number|null} [params.limit=null]
 * @returns {Promise<Object>}
 */
export async function getDistinctColors({ userId, limit = null }) {
  try {
    const result = await prisma.image_metadata.findMany({
      where: {
        user_id: userId,
        ai_processing_status: 'completed',
        OR: [
          { colors: { not: { equals: [] } } },
          { dominant_color: { not: null } }
        ]
      },
      select: {
        colors: true,
        dominant_color: true
      }
    });

    const colorSet = new Set();

    if (result && Array.isArray(result)) {
      result.forEach(metadata => {
        if (metadata.colors && Array.isArray(metadata.colors)) {
          metadata.colors.forEach(color => {
            if (color && typeof color === 'string' && color.match(/^#[0-9A-Fa-f]{6}$/)) {
              colorSet.add(color.toLowerCase());
            }
          });
        }

        if (metadata.dominant_color && typeof metadata.dominant_color === 'string' && metadata.dominant_color.match(/^#[0-9A-Fa-f]{6}$/)) {
          colorSet.add(metadata.dominant_color.toLowerCase());
        }
      });
    }

    const colors = Array.from(colorSet);

    return {
      colors: limit ? colors.slice(0, limit) : colors,
      total: colors.length
    };
  } catch (error) {
    return {
      colors: [],
      total: 0
    };
  }
}

/**
 * @param {Object} params
 * @param {number} params.imageId
 * @param {string} params.userId
 * @returns {Promise<Object>}
 */
export async function retryAIProcessing({ imageId, userId }) {
  const image = await prisma.images.findFirst({
    where: {
      id: imageId,
      user_id: userId,
    },
  });

  if (!image) {
    const error = new Error('Image not found');
    error.status = 404;
    throw error;
  }

  const metadata = await prisma.image_metadata.findFirst({
    where: { image_id: imageId },
  });

  if (!metadata) {
    const error = new Error('Image metadata not found');
    error.status = 404;
    throw error;
  }

  if (metadata.ai_processing_status === 'completed') {
    const error = new Error('AI processing already completed');
    error.status = 400;
    throw error;
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .download(image.original_path);

  if (downloadError || !fileData) {
    const error = new Error('Failed to download image from storage');
    error.status = 500;
    throw error;
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  processImageAI(image.id, userId, buffer).catch(() => {
    // AI processing retry failed - will be handled appropriately
  });

  return {
    success: true,
    message: 'AI processing retry initiated',
    image_id: image.id,
  };
}
