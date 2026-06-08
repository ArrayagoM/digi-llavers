/**
 * POST /upload
 */

const express = require('express');
const multer = require('multer');
const { nanoid } = require('nanoid');
const storage = require('../services/storage');
const { generateQR, mediaUrl } = require('../services/qr');
const fileFilter = require('../middleware/fileFilter');
const config = require('../config');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSizeBytes },
  fileFilter,
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `Archivo demasiado grande. Máximo: ${config.upload.maxFileSizeBytes / 1024 / 1024} MB`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  next(err);
}

router.post(
  '/',
  upload.single('file'),
  handleMulterError,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo (campo: "file")' });
      }

      const id = nanoid(10);
      const { mimetype, originalname, buffer } = req.file;

      await storage.save(id, mimetype, buffer);

      const qrBuffer = await generateQR(id);
      const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;

      return res.status(201).json({
        id,
        url: mediaUrl(id),
        qr: qrBase64,
        mimetype,
        originalName: originalname,
      });
    } catch (err) {
      next(err);
    }
  },
  handleMulterError
);

// ─── POST /upload/presign ─────────────────────────────────────────────────────
// Solicita una URL firmada de Supabase para subir directo desde el browser.
// Responde { id, uploadUrl } o 404 si el driver no soporta direct upload.
router.post('/presign', async (req, res, next) => {
  try {
    const { mimetype } = req.body;
    if (!mimetype || !config.upload.allowedMimetypes.includes(mimetype)) {
      return res.status(415).json({
        error: `Tipo no permitido: ${mimetype}. Aceptados: ${config.upload.allowedMimetypes.join(', ')}`,
      });
    }

    const id = nanoid(10);
    const uploadUrl = await storage.getUploadUrl(id);

    if (!uploadUrl) {
      return res.status(404).json({ error: 'direct-upload no disponible para este driver' });
    }

    return res.json({ id, uploadUrl });
  } catch (err) {
    next(err);
  }
});

// ─── POST /upload/complete ────────────────────────────────────────────────────
// El browser ya subió el binario directo a Supabase.
// El servidor guarda el metadata y genera el QR.
router.post('/complete', async (req, res, next) => {
  try {
    const { id, mimetype, originalName } = req.body;
    if (!id || !mimetype) {
      return res.status(400).json({ error: 'Faltan campos: id, mimetype' });
    }

    await storage.saveMetadata(id, mimetype);

    const qrBuffer = await generateQR(id);
    const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;

    return res.status(201).json({
      id,
      url:          mediaUrl(id),
      qr:           qrBase64,
      mimetype,
      originalName: originalName || id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
