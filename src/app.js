const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');
const viewRouter = require('./routes/view');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Header que bypasea la pantalla de advertencia de ngrok (plan free)
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', '1');
  next();
});

// Rutas
app.use('/upload', uploadRouter);
app.use('/m', viewRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'No encontrado' });
});

// Error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(status).json({ error: message });
});

module.exports = app;
