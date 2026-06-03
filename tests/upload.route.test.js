/**
 * Tests de integración — ruta POST /upload
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const TEST_DIR = path.join(os.tmpdir(), 'digi-llavers-test-upload');

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

beforeEach(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
});

// Buffer falso que simula un audio mp3 (los primeros bytes no importan aquí)
const fakeAudioBuffer = Buffer.alloc(1024, 0xff);

describe('POST /upload', () => {
  test('201 — sube un archivo de audio válido', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', fakeAudioBuffer, { filename: 'nota.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      url: expect.stringMatching(/^http:\/\/localhost:3000\/m\//),
      qr: expect.stringMatching(/^data:image\/png;base64,/),
      mimetype: 'audio/mpeg',
      originalName: 'nota.mp3',
    });
  });

  test('415 — rechaza un tipo de archivo no permitido', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('fake'), { filename: 'doc.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/no permitido/i);
  });

  test('400 — responde error si no se envía ningún archivo', async () => {
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('201 — el ID generado es alfanumérico y de largo correcto', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', fakeAudioBuffer, { filename: 'song.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[A-Za-z0-9_-]{10}$/);
  });

  test('201 — el archivo queda guardado en storage', async () => {
    const storage = require('../src/services/storage');

    const res = await request(app)
      .post('/upload')
      .attach('file', fakeAudioBuffer, { filename: 'audio.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(201);
    expect(storage.exists(res.body.id)).toBe(true);
  });
});
