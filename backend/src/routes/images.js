import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadImage } from '../services/imageService.js';

const router = Router();

// GET /api/images
router.get('/', async (_req, res) => {
  // TODO: Use Prisma to fetch images for the authenticated user (via Supabase JWT)
  res.status(200).json({ items: [], message: 'List images - implement DB query.' });
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

// GET /api/images/search?q=...&color=...
router.get('/search', async (_req, res) => {
  // TODO: Implement full-text search on description/tags and/or filter by color
  res.status(501).json({ items: [], message: 'Search not implemented yet.' });
});

export default router;
