/**
 * Tests unitarios — middleware fileFilter
 */

jest.mock('../src/config', () => ({
  storage: { driver: 'local', uploadDir: '/tmp' },
  upload: {
    allowedMimetypes: ['audio/mpeg', 'audio/ogg', 'video/mp4'],
    maxFileSizeBytes: 5 * 1024 * 1024,
  },
  port: 3000,
  baseUrl: 'http://localhost:3000',
}));

const fileFilter = require('../src/middleware/fileFilter');

function makeFile(mimetype) {
  return { mimetype, originalname: 'test' };
}

describe('fileFilter', () => {
  test('acepta audio/mpeg', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('audio/mpeg'), cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('acepta audio/ogg', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('audio/ogg'), cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('acepta video/mp4', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('video/mp4'), cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('rechaza application/pdf con error 415', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('application/pdf'), cb);
    const [err, accepted] = cb.mock.calls[0];
    expect(accepted).toBe(false);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(415);
  });

  test('rechaza image/jpeg', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('image/jpeg'), cb);
    expect(cb.mock.calls[0][1]).toBe(false);
  });

  test('rechaza text/plain', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('text/plain'), cb);
    expect(cb.mock.calls[0][1]).toBe(false);
  });

  test('el mensaje de error incluye el tipo rechazado', () => {
    const cb = jest.fn();
    fileFilter({}, makeFile('application/exe'), cb);
    const [err] = cb.mock.calls[0];
    expect(err.message).toContain('application/exe');
  });
});
