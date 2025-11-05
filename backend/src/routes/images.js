import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { verifyToken } from '../middleware/auth.js';
import {
  uploadImage,
  listImages,
  getImageById,
  searchImages,
  findSimilarToImage,
  getDistinctColors,
  retryAIProcessing
} from '../services/imageService.js';
import { buildPaginationLinks, buildPaginatedResponse } from '../utils/hateoas.js';

const router = Router();

// GET /api/images
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const offsetParam = req.query.offset ? parseInt(req.query.offset, 10) : NaN;
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const offset = Number.isFinite(offsetParam) ? offsetParam : 0;
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

    const result = await listImages({ userId, limit, offset, sort });

    // Build HATEOAS pagination links
    const links = buildPaginationLinks({
      basePath: '/api/images',
      result,
      sort,
    });

    // Return HATEOAS-compliant response
    return res.status(200).json(buildPaginatedResponse({
      items: result.items,
      result,
      links,
    }));
  } catch (error) {
    console.error('List images error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to list images' });
  }
});

// POST /api/images/upload
router.post('/upload', verifyToken, upload.array('images', 5), async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const userId = req.user.id;
  const uploadResults = [];
  const uploadErrors = [];

  // Process each file
  for (const file of files) {
    try {
      const imageRecord = await uploadImage(file, userId);
      uploadResults.push(imageRecord);
    } catch (error) {
      uploadErrors.push({
        filename: file.originalname,
        error: error.message,
      });

      // If it's the only file and it fails, return error immediately
      if (files.length === 1) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    }
  }

  // If all uploads failed
  if (uploadResults.length === 0) {
    return res.status(500).json({
      error: 'All uploads failed',
      errors: uploadErrors,
    });
  }

  // If some uploads succeeded
  if (uploadErrors.length > 0) {
    return res.status(207).json({
      success: true,
      images: uploadResults,
      errors: uploadErrors,
    });
  }

  // All uploads succeeded
  return res.status(201).json({
    success: true,
    images: uploadResults,
  });
});

// GET /api/images/search?q=...&color=...&dominantOnly=...&limit=...&offset=...&sort=...
router.get('/search', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q || req.query.query; // Accept both 'q' and 'query' parameters
    const color = req.query.color;
    const dominantOnly = req.query.dominantOnly === 'true' ? true : undefined;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const offsetParam = req.query.offset ? parseInt(req.query.offset, 10) : NaN;
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const offset = Number.isFinite(offsetParam) ? offsetParam : 0;
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

    const result = await searchImages({
      userId,
      query,
      color,
      dominantOnly,
      limit,
      offset,
      sort,
    });

    // Build HATEOAS pagination links
    const queryParams = {};
    if (query) queryParams.q = query;
    if (color) queryParams.color = color;
    if (dominantOnly) queryParams.dominantOnly = 'true';

    const links = buildPaginationLinks({
      basePath: '/api/images/search',
      result,
      sort,
      queryParams,
    });

    return res.status(200).json(buildPaginatedResponse({
      items: result.items,
      result,
      links,
    }));
  } catch (error) {
    console.error('Search error:', error);
    const statusCode = error.message?.includes('Invalid color format') ? 400 : 500;
    return res.status(statusCode).json({
      error: error.message?.includes('Invalid color format') ? error.message : 'Search failed',
    });
  }
});

// GET /api/images/colors - Get distinct colors from user's images
router.get('/colors', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const limit = Number.isFinite(limitParam) ? limitParam : 20;

    const result = await getDistinctColors({ userId, limit });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get colors error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

// GET /api/images/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = parseInt(req.params.id, 10);

    // Validate image ID
    if (!Number.isFinite(imageId) || imageId <= 0) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const image = await getImageById({ imageId, userId });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    return res.status(200).json(image);
  } catch (error) {
    console.error('Get image error:', error);
    return res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

// POST /api/images/:imageId/retry-ai
router.post('/:imageId/retry-ai', verifyToken, async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const userId = req.user.id;

    // Validate image ID
    if (!Number.isFinite(imageId) || imageId <= 0) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const result = await retryAIProcessing({ imageId, userId });
    return res.status(202).json(result);
  } catch (error) {
    console.error('Retry AI processing error:', error);

    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to retry AI processing' });
  }
});

// GET /api/images/:id/similar - Find similar images based on tags/colors
router.get('/:id/similar', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = parseInt(req.params.id, 10);

    if (!Number.isFinite(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const limit = Number.isFinite(limitParam) ? limitParam : 20;

    const result = await findSimilarToImage({ imageId, userId, limit });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Find similar images error:', error);

    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to find similar images' });
  }
});

export default router;
