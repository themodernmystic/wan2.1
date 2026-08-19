import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { invokeLLM } from '../integrations/llm.js';
import { generateImage } from '../integrations/image.js';
import { uploadFile, extractDataFromUploadedFile } from '../integrations/storage.js';
import { sendEmail } from '../integrations/email.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Frontend-facing equivalents of base44.integrations.Core.* — used directly by
// pages/components (not through a ported backend function).

router.post('/invoke-llm', requireAuth, async (req, res) => {
  try {
    res.json(await invokeLLM(req.body || {}));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-image', requireAuth, async (req, res) => {
  try {
    res.json(await generateImage(req.body || {}));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided (field name "file")' });
    const result = await uploadFile({ file: req.file.buffer, filename: req.file.originalname });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract-data', requireAuth, async (req, res) => {
  try {
    res.json(await extractDataFromUploadedFile(req.body || {}));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-email', requireAuth, async (req, res) => {
  try {
    res.json(await sendEmail(req.body || {}));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
