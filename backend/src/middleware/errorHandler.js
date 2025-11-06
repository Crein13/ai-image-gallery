export function notFoundHandler(_req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, _req, res, _next) {
  if (err && err.name === 'MulterError') {
    console.error('MulterError:', err.code, err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name. Use "images" as the field name in form-data' });
    }
    return res.status(400).json({ error: err.message, code: err.code });
  }

  if (err && err.message && err.message.includes('Only JPEG, PNG, and WebP images are allowed')) {
    console.error('FileFilter Error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
