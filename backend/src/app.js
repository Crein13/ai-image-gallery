import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import { listEndpointsForRouter, printEndpoints } from './utils/routePrinter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

// Log registered routes (dev aid)
printEndpoints([
  { method: 'GET', path: '/health', methods: ['GET'] },
  ...listEndpointsForRouter('/api/auth', authRoutes),
  ...listEndpointsForRouter('/api/images', imageRoutes),
]);

// Error handlers (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
