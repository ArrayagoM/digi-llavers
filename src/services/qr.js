/**
 * Genera un QR code como PNG (Buffer) apuntando a la URL pública del archivo.
 */

const QRCode = require('qrcode');
const config = require('../config');

/**
 * @param {string} id  — ID único del archivo
 * @returns {Promise<Buffer>}  PNG del QR listo para guardar / mostrar
 */
async function generateQR(id) {
  const url = `${config.baseUrl}/m/${id}`;

  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'H',   // Alta corrección: aguanta impresión en resina
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return buffer;
}

/**
 * Devuelve la URL pública a la que apuntará el QR.
 * Útil para tests y para mostrarla en el frontend sin regenerar el QR.
 */
function mediaUrl(id) {
  return `${config.baseUrl}/m/${id}`;
}

module.exports = { generateQR, mediaUrl };
