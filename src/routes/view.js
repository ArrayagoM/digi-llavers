/**
 * GET /m/:id      → reproductor aislado (solo ese archivo)
 * GET /m/:id/raw  → binario crudo para el player interno
 */

const express = require('express');
const storage = require('../services/storage');

const router = express.Router();

const AUDIO_TYPES = ['audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/mp4'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function playerPage(id, mimetype) {
  const isAudio = AUDIO_TYPES.includes(mimetype);
  const isVideo = VIDEO_TYPES.includes(mimetype);
  const dataUrl = `/m/${id}/raw`;

  if (isAudio) {
    return /* html */`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>🔑 Digi Llavers</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: #0d0d0d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 40px 32px;
      background: #1a1a1a;
      border-radius: 20px;
      box-shadow: 0 24px 64px rgba(0,0,0,.6);
      max-width: 380px;
      width: 90vw;
    }
    .icon { font-size: 56px; line-height: 1; }
    .label { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #666; }
    audio { width: 100%; accent-color: #e8c87e; border-radius: 8px; }
    .brand { font-size: 11px; color: #333; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎵</div>
    <span class="label">Audio</span>
    <audio controls autoplay src="${dataUrl}"></audio>
    <span class="brand">Digi Llavers</span>
  </div>
</body>
</html>`;
  }

  if (isVideo) {
    return /* html */`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>🔑 Digi Llavers</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #000; display: flex; align-items: center; justify-content: center; }
    video { max-width: 100vw; max-height: 100vh; display: block; }
  </style>
</head>
<body>
  <video controls autoplay playsinline src="${dataUrl}"></video>
</body>
</html>`;
  }

  return null;
}

function validateId(id) {
  return /^[A-Za-z0-9_-]{1,20}$/.test(id);
}

// GET /m/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateId(id)) return res.status(400).json({ error: 'ID inválido' });

    const file = await storage.get(id);
    if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

    const page = playerPage(id, file.mimetype);
    if (page) return res.type('html').send(page);

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', 'attachment');
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
});

// GET /m/:id/raw
router.get('/:id/raw', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateId(id)) return res.status(400).json({ error: 'ID inválido' });

    const file = await storage.get(id);
    if (!file) return res.status(404).send('Not found');

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
