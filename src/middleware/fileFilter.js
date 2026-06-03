/**
 * Middleware de validación de archivos para Multer.
 * Acepta solo los MIME types configurados en .env.
 */

const config = require('../config');

function fileFilter(req, file, cb) {
  if (config.upload.allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Tipo de archivo no permitido: ${file.mimetype}. ` +
      `Aceptados: ${config.upload.allowedMimetypes.join(', ')}`
    );
    err.status = 415;
    cb(err, false);
  }
}

module.exports = fileFilter;
