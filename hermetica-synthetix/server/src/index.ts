import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { env } from './lib/env.js';
import { attachUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import entitiesRoutes from './routes/entities.js';
import integrationsRoutes from './routes/integrations.js';
import functionsRoutes from './routes/functions/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: env.WEB_ORIGIN === '*' ? true : env.WEB_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(attachUser);

// Locally-stored uploads (when STORAGE_DRIVER=local, the default)
fs.mkdirSync(env.STORAGE_LOCAL_DIR, { recursive: true });
app.use('/uploads', express.static(path.resolve(env.STORAGE_LOCAL_DIR)));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/entities', entitiesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/functions', functionsRoutes);

// Serve the built frontend (web/dist) in production, with SPA fallback.
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.listen(env.PORT, () => {
  console.log(`hermetica-synthetix server listening on :${env.PORT}`);
});
