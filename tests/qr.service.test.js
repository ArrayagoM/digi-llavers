/**
 * Tests unitarios — servicio de generación de QR
 */

jest.mock('../src/config', () => ({
  baseUrl: 'http://localhost:3000',
  storage: { driver: 'local', uploadDir: '/tmp/dl-test' },
  upload: { allowedMimetypes: [], maxFileSizeBytes: 0 },
  port: 3000,
}));

const { generateQR, mediaUrl } = require('../src/services/qr');

describe('mediaUrl', () => {
  test('construye la URL correctamente', () => {
    expect(mediaUrl('abc123')).toBe('http://localhost:3000/m/abc123');
  });
});

describe('generateQR', () => {
  test('devuelve un Buffer', async () => {
    const buf = await generateQR('abc123');
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  test('el buffer es un PNG válido (magic bytes)', async () => {
    const buf = await generateQR('testid');
    // PNG: 89 50 4E 47
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  test('genera QRs de tamaño razonable (> 1KB)', async () => {
    const buf = await generateQR('testid');
    expect(buf.length).toBeGreaterThan(1024);
  });

  test('IDs distintos generan QRs distintos', async () => {
    const a = await generateQR('id-uno');
    const b = await generateQR('id-dos');
    expect(a.equals(b)).toBe(false);
  });
});
