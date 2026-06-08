/**
 * GET /m/:id            → reproductor (audio/video) o galería de fotos
 * GET /m/:id/raw        → binario crudo para el player de audio/video
 * GET /m/:id/photo/:i   → binario crudo de la foto i de una galería
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

// ─── Página de galería de fotos ───────────────────────────────────────────────
function galleryPage(id, count) {
  const photos = Array.from({ length: count }, (_, i) => `/m/${id}/photo/${i}`);

  return /* html */`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="robots" content="noindex,nofollow">
  <title>🔑 Digi Llavers</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --gold: #c9a84c;
      --gold-light: #e8c87e;
      --bg: #0d0d0d;
      --surface: #161616;
    }

    html, body {
      height: 100%; width: 100%;
      background: var(--bg);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #f0f0f0;
      touch-action: pan-y;
    }

    /* ── Slider ── */
    .slider {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    .slides {
      display: flex;
      height: 100%;
      transition: transform .35s cubic-bezier(.4,0,.2,1);
      will-change: transform;
    }
    .slide {
      flex: 0 0 100vw;
      width: 100vw;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
    }
    .slide img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      border-radius: 4px;
      user-select: none;
      -webkit-user-drag: none;
    }

    /* ── Grid (si hay > 1 foto y se usa vista grid) ── */
    .grid-view .slides { flex-wrap: wrap; transition: none; }
    .grid-view .slide  { flex: 0 0 50%; height: 50vh; padding: 3px; }
    .grid-view .slide img { border-radius: 8px; }

    /* ── Navegación ── */
    .nav-btn {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,.08);
      border: none;
      color: #fff;
      font-size: 22px;
      width: 44px; height: 44px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(6px);
      transition: background .15s;
    }
    .nav-btn:hover { background: rgba(255,255,255,.18); }
    .nav-btn.prev { left: 12px; }
    .nav-btn.next { right: 12px; }
    .nav-btn:disabled { opacity: .25; pointer-events: none; }

    /* ── Dots ── */
    .dots {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 10;
    }
    .dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: rgba(255,255,255,.3);
      cursor: pointer;
      transition: background .2s, transform .2s;
    }
    .dot.active {
      background: var(--gold-light);
      transform: scale(1.35);
    }

    /* ── Contador ── */
    .counter {
      position: fixed;
      top: 16px;
      right: 16px;
      font-size: 12px;
      color: rgba(255,255,255,.45);
      z-index: 10;
      letter-spacing: .06em;
    }

    /* ── Toggle grid ── */
    .grid-toggle {
      position: fixed;
      top: 14px;
      left: 14px;
      background: rgba(255,255,255,.08);
      border: none;
      color: rgba(255,255,255,.6);
      font-size: 16px;
      width: 36px; height: 36px;
      border-radius: 8px;
      cursor: pointer;
      z-index: 10;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(6px);
      transition: background .15s;
    }
    .grid-toggle:hover { background: rgba(255,255,255,.16); color: #fff; }

    /* ── Brand ── */
    .brand {
      position: fixed;
      bottom: 52px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: rgba(255,255,255,.2);
      letter-spacing: .1em;
      text-transform: uppercase;
      z-index: 10;
      white-space: nowrap;
    }

    /* Ocultar nav si solo hay 1 foto */
    ${count === 1 ? '.nav-btn, .dots, .counter, .grid-toggle { display: none !important; }' : ''}
  </style>
</head>
<body>

${count > 1 ? `<button class="grid-toggle" id="gridToggle" title="Vista cuadrícula">⊞</button>` : ''}

<div class="slider" id="slider">
  <div class="slides" id="slides">
    ${photos.map((src, i) => `
    <div class="slide" data-index="${i}">
      <img src="${src}" alt="Foto ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">
    </div>`).join('')}
  </div>
</div>

${count > 1 ? `
<button class="nav-btn prev" id="prev">&#8249;</button>
<button class="nav-btn next" id="next">&#8250;</button>

<div class="dots" id="dots">
  ${photos.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-i="${i}"></span>`).join('')}
</div>

<div class="counter" id="counter">1 / ${count}</div>
` : ''}

<span class="brand">Digi Llavers</span>

<script>
  const total  = ${count};
  if (total <= 1) { /* nada que navegar */ }
  else {
    const slidesEl  = document.getElementById('slides');
    const prevBtn   = document.getElementById('prev');
    const nextBtn   = document.getElementById('next');
    const dots      = document.querySelectorAll('.dot');
    const counter   = document.getElementById('counter');
    const gridToggle= document.getElementById('gridToggle');
    const slider    = document.getElementById('slider');
    let current = 0;
    let isGrid  = false;

    function goTo(n) {
      current = Math.max(0, Math.min(n, total - 1));
      slidesEl.style.transform = 'translateX(-' + (current * 100) + 'vw)';
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
      counter.textContent = (current + 1) + ' / ' + total;
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
    }

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));
    goTo(0);

    // Swipe
    let tx = 0;
    slider.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // Grid toggle
    gridToggle.addEventListener('click', () => {
      isGrid = !isGrid;
      slider.classList.toggle('grid-view', isGrid);
      gridToggle.textContent = isGrid ? '▶' : '⊞';
      gridToggle.title = isGrid ? 'Vista slider' : 'Vista cuadrícula';
      // En modo grid, cada foto abre el slider en ese índice
      if (isGrid) {
        document.querySelectorAll('.slide').forEach(s => {
          s.style.cursor = 'pointer';
          s.onclick = () => { slider.classList.remove('grid-view'); isGrid = false; gridToggle.textContent = '⊞'; goTo(+s.dataset.index); };
        });
      }
    });

    // Teclado
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  goTo(current - 1);
      if (e.key === 'ArrowRight') goTo(current + 1);
    });
  }
</script>
</body>
</html>`;
}

// GET /m/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateId(id)) return res.status(400).json({ error: 'ID inválido' });

    // ¿Es una galería de fotos?
    const gallery = await storage.getGallery(id);
    if (gallery) {
      return res.type('html').send(galleryPage(id, gallery.length));
    }

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

// GET /m/:id/photo/:i  — binario crudo de la foto i
router.get('/:id/photo/:i', async (req, res, next) => {
  try {
    const { id } = req.params;
    const i = parseInt(req.params.i, 10);
    if (!validateId(id) || isNaN(i) || i < 0) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const gallery = await storage.getGallery(id);
    if (!gallery || i >= gallery.length) {
      return res.status(404).send('Not found');
    }

    const { buffer, mimetype } = gallery[i];
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
