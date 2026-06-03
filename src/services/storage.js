/**
 * Servicio de almacenamiento con driver intercambiable.
 *
 * Interface pública (todas async):
 *   save(id, mimetype, buffer)  → Promise<void>
 *   get(id)                     → Promise<{ buffer, mimetype } | null>
 *   exists(id)                  → Promise<boolean>
 *   delete(id)                  → Promise<void>
 *
 * Drivers disponibles:
 *   STORAGE_DRIVER=local      → filesystem local (desarrollo)
 *   STORAGE_DRIVER=supabase   → Supabase Storage (producción)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// ─── Driver local ──────────────────────────────────────────────────────────────

function resolveDir() {
  const dir = path.resolve(config.storage.uploadDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const localDriver = {
  async save(id, mimetype, buffer) {
    const dir = resolveDir();
    fs.writeFileSync(path.join(dir, `${id}.bin`), buffer);
    fs.writeFileSync(path.join(dir, `${id}.meta.json`), JSON.stringify({ mimetype }));
  },

  async get(id) {
    const dir = resolveDir();
    const dp = path.join(dir, `${id}.bin`);
    const mp = path.join(dir, `${id}.meta.json`);
    if (!fs.existsSync(dp) || !fs.existsSync(mp)) return null;
    return {
      buffer: fs.readFileSync(dp),
      mimetype: JSON.parse(fs.readFileSync(mp, 'utf8')).mimetype,
    };
  },

  async exists(id) {
    const dir = resolveDir();
    return fs.existsSync(path.join(dir, `${id}.bin`));
  },

  async delete(id) {
    const dir = resolveDir();
    [`${id}.bin`, `${id}.meta.json`].forEach(f => {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  },
};

// ─── Driver Supabase ───────────────────────────────────────────────────────────

let _supabase = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;
  const { createClient } = require('@supabase/supabase-js');
  const { url, serviceKey } = config.storage.supabase;
  if (!url || !serviceKey) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  _supabase = createClient(url, serviceKey);
  return _supabase;
}

const BUCKET = 'media';

const supabaseDriver = {
  async save(id, mimetype, buffer) {
    const sb = getSupabaseClient();

    // Archivo binario
    const { error: errBin } = await sb.storage
      .from(BUCKET)
      .upload(id, buffer, { contentType: mimetype, upsert: true });
    if (errBin) throw new Error(`Supabase upload error: ${errBin.message}`);

    // Metadata (mimetype)
    const meta = Buffer.from(JSON.stringify({ mimetype }));
    const { error: errMeta } = await sb.storage
      .from(BUCKET)
      .upload(`${id}.meta`, meta, { contentType: 'application/json', upsert: true });
    if (errMeta) throw new Error(`Supabase meta upload error: ${errMeta.message}`);
  },

  async get(id) {
    const sb = getSupabaseClient();

    const [{ data: binData, error: errBin }, { data: metaData, error: errMeta }] =
      await Promise.all([
        sb.storage.from(BUCKET).download(id),
        sb.storage.from(BUCKET).download(`${id}.meta`),
      ]);

    if (errBin || errMeta || !binData || !metaData) return null;

    const [buffer, metaText] = await Promise.all([
      binData.arrayBuffer().then(Buffer.from),
      metaData.text(),
    ]);

    const { mimetype } = JSON.parse(metaText);
    return { buffer, mimetype };
  },

  async exists(id) {
    const sb = getSupabaseClient();
    const { data, error } = await sb.storage.from(BUCKET).list('', {
      search: id,
      limit: 1,
    });
    if (error) return false;
    return data.some(f => f.name === id);
  },

  async delete(id) {
    const sb = getSupabaseClient();
    await sb.storage.from(BUCKET).remove([id, `${id}.meta`]);
  },
};

// ─── Selección de driver ──────────────────────────────────────────────────────

const drivers = { local: localDriver, supabase: supabaseDriver };

function getDriver() {
  const driver = drivers[config.storage.driver];
  if (!driver) throw new Error(`Driver desconocido: ${config.storage.driver}`);
  return driver;
}

module.exports = {
  save:   (...args) => getDriver().save(...args),
  get:    (...args) => getDriver().get(...args),
  exists: (...args) => getDriver().exists(...args),
  delete: (...args) => getDriver().delete(...args),
};
