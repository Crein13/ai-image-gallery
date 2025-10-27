export default function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const payload = { error: err.message || 'Internal Server Error' };
  // Optionally include validation details
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  res.status(status).json(payload);
}
