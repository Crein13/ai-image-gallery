/**
 * 404 Not Found handler
 */
export function notFoundHandler(_req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}

/**
 * Centralized error handler middleware
 * Must be registered after all routes
 */
export function errorHandler(err, _req, res, _next) {
  // Handle Multer errors explicitly as bad requests
  if (err && err.name === 'MulterError') {
    console.error('MulterError:', err.code, err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    return res.status(400).json({ error: err.message, code: err.code });
  }

  // Handle fileFilter errors (from multer fileFilter callback)
  if (err && err.message && err.message.includes('Only JPEG, PNG, and WebP images are allowed')) {
    console.error('FileFilter Error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  // Log error for debugging
  console.error('Error:', err);

  // Return appropriate status and message
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
