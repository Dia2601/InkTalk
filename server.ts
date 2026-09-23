import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  console.log('[InkTalk] Initializing server...');
  console.log(`[InkTalk] Environment: ${process.env.NODE_ENV || 'production (default)'}`);
  console.log(`[InkTalk] Configured PORT: ${PORT}`);
  console.log(`[InkTalk] Configured HOST: ${HOST}`);

  // 1. Core Health check endpoint (for Cloud Run and container readiness probes)
  // Must return 200 immediately, never call Gemini or block on external services
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Support JSON payloads including image uploads up to 15MB
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Persistent uploads static route
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Mount API router
  app.use('/api', apiRouter);

  // Determine whether to serve pre-built production static files or mount Vite dev middleware
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(distIndexPath));

  if (!isProduction) {
    console.log('[InkTalk] Mounting Vite development middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log(`[InkTalk] Serving production build from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
      } else {
        res.status(404).send('Production build not found. Please run npm run build.');
      }
    });
  }

  // Start listening on 0.0.0.0:PORT
  const server = app.listen(PORT, HOST, () => {
    console.log(`[InkTalk] Production server listening on http://${HOST}:${PORT}`);
    console.log(`[InkTalk] Health check available at http://${HOST}:${PORT}/health`);
  });

  server.on('error', (err: any) => {
    console.error('[InkTalk] Server fatal error:', err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('[InkTalk] Failed to start server:', err);
  process.exit(1);
});
