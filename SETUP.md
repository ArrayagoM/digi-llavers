# Digi Llavers — Setup

## Arrancar en 3 pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar .env si cambiás BASE_URL o el tamaño máximo de archivo

# 3. Correr en modo desarrollo
npm run dev
```

Abrí http://localhost:3000 y subí tu primer archivo.

---

## Tests

```bash
npm test              # Corre todos los tests
npm run test:coverage # Con reporte de cobertura
npm run test:watch    # Modo watch (útil al desarrollar)
```

**Cobertura esperada:** >90% en todos los módulos.

---

## Estructura del proyecto

```
digi-llavers/
├── src/
│   ├── app.js                   # Express app (sin listen)
│   ├── server.js                # Entry point
│   ├── config.js                # Toda la config desde .env
│   ├── routes/
│   │   ├── upload.js            # POST /upload
│   │   └── view.js              # GET /m/:id  y  GET /m/:id/raw
│   ├── services/
│   │   ├── storage.js           # Driver local (→ R2 ready)
│   │   └── qr.js                # Generación de QR PNG
│   └── middleware/
│       └── fileFilter.js        # Validación de tipo MIME
├── public/
│   └── index.html               # UI de carga
├── tests/
│   ├── storage.service.test.js
│   ├── qr.service.test.js
│   ├── upload.route.test.js
│   ├── view.route.test.js
│   └── fileFilter.middleware.test.js
├── uploads/                     # Archivos subidos (gitignoreado)
├── .env.example
└── package.json
```

---

## Escalar a Cloudflare R2 (cuando tengas usuarios)

1. `npm install @aws-sdk/client-s3`
2. Completar las vars `R2_*` en `.env`
3. Cambiar `STORAGE_DRIVER=r2`
4. Implementar los métodos en `src/services/storage.js` (el stub ya está)

Todo el resto del código queda igual — el driver es intercambiable.

---

## Deploy recomendado

| Servicio | Rol |
|----------|-----|
| **Railway** / **Render** | Backend Node.js |
| **Cloudflare R2** | Almacenamiento de archivos |
| **Cloudflare CDN** | Servir los archivos en `/raw` con caché global |

Con este stack el costo para las primeras miles de escaneos es prácticamente cero.
