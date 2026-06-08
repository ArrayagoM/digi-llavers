require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
    },
  },

  upload: {
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024,
    allowedMimetypes: (
      process.env.ALLOWED_MIMETYPES ||
      'audio/ogg,audio/mpeg,audio/wav,audio/mp4,video/mp4,video/webm,video/quicktime'
    ).split(',').map(m => m.trim()),

    allowedImageMimetypes: (
      process.env.ALLOWED_IMAGE_MIMETYPES ||
      'image/jpeg,image/png,image/webp,image/gif'
    ).split(',').map(m => m.trim()),

    maxGalleryPhotos: parseInt(process.env.MAX_GALLERY_PHOTOS || '4', 10),
  },
};

module.exports = config;
