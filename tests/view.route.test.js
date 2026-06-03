/**
 * Tests de integración — ruta GET /m/:id y GET /m/:id/raw
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const TEST_DIR = path.join(os.tmpdir(), 'digi-llavers-test-view');

jest.mock('../src/config', () => ({
  storage: { driver: 'local', uploadDir: TEST_DIR },
  upload: {
    allowedMimetypes: ['audio/mpeg', 'audio/ogg', 'video/mp4'],
    maxFileSizeBytes: 5 * 1024 * 1024,
  },
  port: 3000,
  baseUrl: 'http://localhost:3000',
}));

const request = require('supertest');
const app = require('../src/app');
const storage = require('../src/services/storage');

const TEST_ID = 'viewtest01';
const AUDIO_BUFFER = Buffer.from('fake audio data');
const VIDEO_BUFFER = Buffer.from('fake video data');

beforeAll(async () => {
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  await storage.save(TEST_ID, 'audio/mpeg', AUDIO_BUFFER);
  await storage.save('videotest0', 'video/mp4', VIDEO_BUFFER);
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
});

describe('GET /m/:id — player page', () => {
  test('200 — devuelve HTML con reproductor para audio', async () => {
    const res = await request(app).get(`/m/${TEST_ID}`);
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toContain('<audio');
  });

  test('200 — devuelve HTML con reproductor para video', async () => {
    const res = await request(app).get('/m/videotest0');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<video');
  });

  test('404 — ID que no existe', async () => {
    const res = await request(app).get('/m/noexiste001');
    expect(res.status).toBe(404);
  });

  test('400 — ID con caracteres inválidos', async () => {
    const res = await request(app).get('/m/invalid!@#');
    expect([400, 404]).toContain(res.status);
  });

  test('la página NO expone otras rutas ni navegación', async () => {
    const res = await request(app).get(`/m/${TEST_ID}`);
    expect(res.text).not.toContain('/upload');
    expect(res.text).not.toContain('href="/');
  });

  test('la página contiene noindex', async () => {
    const res = await request(app).get(`/m/${TEST_ID}`);
    expect(res.text).toContain('noindex');
  });
});

describe('GET /m/:id/raw — binario crudo', () => {
  test('200 — devuelve el binario con content-type correcto', async () => {
    const res = await request(app).get(`/m/${TEST_ID}/raw`);
    expect(res.status).toBe(200);
    expect(res.type).toBe('audio/mpeg');
  });

  test('el contenido coincide con lo guardado', async () => {
    const res = await request(app).get(`/m/${TEST_ID}/raw`);
    expect(Buffer.from(res.body).equals(AUDIO_BUFFER)).toBe(true);
  });

  test('404 — raw para ID inexistente', async () => {
    const res = await request(app).get('/m/fantasma/raw');
    expect(res.status).toBe(404);
  });

  test('tiene Cache-Control para CDN', async () => {
    const res = await request(app).get(`/m/${TEST_ID}/raw`);
    expect(res.headers['cache-control']).toMatch(/max-age/);
  });
});
