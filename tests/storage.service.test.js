/**
 * Tests unitarios — servicio de almacenamiento (driver local, async)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const mockTestDir = path.join(os.tmpdir(), 'digi-llavers-test-storage');

jest.mock('../src/config', () => ({
  storage: { driver: 'local', uploadDir: mockTestDir },
  upload: { allowedMimetypes: ['audio/mpeg'], maxFileSizeBytes: 10 * 1024 * 1024 },
  port: 3000,
  baseUrl: 'http://localhost:3000',
}));

const storage = require('../src/services/storage');

beforeEach(() => {
  if (fs.existsSync(mockTestDir)) fs.rmSync(mockTestDir, { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(mockTestDir)) fs.rmSync(mockTestDir, { recursive: true });
});

describe('storage.save + storage.get', () => {
  test('guarda y recupera un archivo correctamente', async () => {
    const id = 'test-id-01';
    const mimetype = 'audio/mpeg';
    const buffer = Buffer.from('fake mp3 data');

    await storage.save(id, mimetype, buffer);
    const result = await storage.get(id);

    expect(result).not.toBeNull();
    expect(result.mimetype).toBe(mimetype);
    expect(result.buffer.equals(buffer)).toBe(true);
  });

  test('devuelve null para un ID inexistente', async () => {
    expect(await storage.get('id-que-no-existe')).toBeNull();
  });

  test('sobreescribe si se guarda el mismo ID dos veces', async () => {
    const id = 'dup-id';
    await storage.save(id, 'audio/mpeg', Buffer.from('v1'));
    await storage.save(id, 'audio/ogg', Buffer.from('v2'));
    const result = await storage.get(id);
    expect(result.buffer.toString()).toBe('v2');
    expect(result.mimetype).toBe('audio/ogg');
  });
});

describe('storage.exists', () => {
  test('devuelve true cuando el archivo existe', async () => {
    await storage.save('exist-test', 'audio/mpeg', Buffer.from('x'));
    expect(await storage.exists('exist-test')).toBe(true);
  });

  test('devuelve false cuando no existe', async () => {
    expect(await storage.exists('no-existe')).toBe(false);
  });
});

describe('storage.delete', () => {
  test('elimina los archivos del disco', async () => {
    const id = 'to-delete';
    await storage.save(id, 'audio/mpeg', Buffer.from('borrame'));
    expect(await storage.exists(id)).toBe(true);

    await storage.delete(id);
    expect(await storage.exists(id)).toBe(false);
    expect(await storage.get(id)).toBeNull();
  });

  test('no lanza error si el archivo ya no existe', async () => {
    await expect(storage.delete('fantasma')).resolves.not.toThrow();
  });
});
