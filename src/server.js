const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`🔑 Digi Llavers corriendo en ${config.baseUrl}`);
  console.log(`   Storage: ${config.storage.driver}`);
});
