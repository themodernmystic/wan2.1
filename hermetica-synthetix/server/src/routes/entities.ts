import { Router } from 'express';
import { createBase44Compat } from '../base44Compat.js';
import { HttpError } from '../lib/httpError.js';
import { ENTITY_NAMES } from '../entityMeta.generated.js';

const router = Router();

function checkEntityName(name: string) {
  if (!ENTITY_NAMES.includes(name)) throw new HttpError(404, `Unknown entity "${name}"`);
}

// GET /api/entities/:name?sort=-created_date&limit=50&filter={"status":"active"}
router.get('/:name', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    const client = base44.entities[req.params.name];
    const sort = req.query.sort as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const filterRaw = req.query.filter as string | undefined;

    const rows = filterRaw ? await client.filter(JSON.parse(filterRaw), sort, limit) : await client.list(sort, limit);
    res.json(rows);
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});

// GET /api/entities/:name/:id
router.get('/:name/:id', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    const row = await base44.entities[req.params.name].get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});

// POST /api/entities/:name
router.post('/:name', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    const row = await base44.entities[req.params.name].create(req.body || {});
    res.status(201).json(row);
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});

// POST /api/entities/:name/bulk  { items: [...] }
router.post('/:name/bulk', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    const rows = await base44.entities[req.params.name].bulkCreate(req.body?.items || []);
    res.status(201).json(rows);
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});

// PUT/PATCH /api/entities/:name/:id
router.put('/:name/:id', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    const row = await base44.entities[req.params.name].update(req.params.id, req.body || {});
    res.json(row);
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});
router.patch('/:name/:id', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    const row = await base44.entities[req.params.name].update(req.params.id, req.body || {});
    res.json(row);
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});

// DELETE /api/entities/:name/:id
router.delete('/:name/:id', async (req, res) => {
  try {
    checkEntityName(req.params.name);
    const base44 = createBase44Compat(req.currentUser ?? null);
    await base44.entities[req.params.name].delete(req.params.id);
    res.status(204).end();
  } catch (error: any) {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  }
});

export default router;
