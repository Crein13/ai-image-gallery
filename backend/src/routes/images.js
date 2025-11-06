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

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const offsetParam = req.query.offset ? parseInt(req.query.offset, 10) : NaN;
    const limit = Number.isFinite(limitParam) ? limitParam : 20;
    const offset = Number.isFinite(offsetParam) ? offsetParam : 0;
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

    const result = await listImages({ userId, limit, offset, sort });

    const links = buildPaginationLinks({
      basePath: '/api/images',
      result,
      sort,
    });

    return res.status(200).json(buildPaginatedResponse({
      items: result.items,
      result,
      links,
    }));
  } catch (error) {
    console.error('List images error:', error);
    return res.status(500).json({ error: 'Failed to retrieve images' });
  }
});

router.post('/upload', verifyToken, upload.array('images', 5), async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const userId = req.user.id;
  const uploadResults = [];
  const uploadErrors = [];

  for (const file of files) {
    try {
      const imageRecord = await uploadImage(file, userId);
      uploadResults.push(imageRecord);
    } catch (error) {
      uploadErrors.push({
        filename: file.originalname,
        error: error.message,
      });

      if (files.length === 1) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    }
  }

  if (uploadResults.length === 0) {
    return res.status(500).json({
      error: 'All uploads failed',
      errors: uploadErrors,
    });
  }

  if (uploadErrors.length > 0) {
    return res.status(207).json({
      success: true,
      images: uploadResults,
      errors: uploadErrors,
    });
  }

  return res.status(201).json({
    success: true,
    images: uploadResults,
  });
});

router.get('/search', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q || req.query.query;
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

router.get('/colors', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const limit = Number.isFinite(limitParam) ? limitParam : null;

    const result = await getDistinctColors({ userId, limit });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get colors error:', error);
    return res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = parseInt(req.params.id, 10);

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

router.post('/:imageId/retry-ai', verifyToken, async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const userId = req.user.id;

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
