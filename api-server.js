// ============================================
// FILE: api-server.js
// ============================================
import app from './src/api/server.js';
import { connectDatabase } from './src/config/database.js';
import { config } from './src/config/index.js';

async function startAPIServer() {
  console.log('🌐 Starting API Server');
  
  await connectDatabase();
  
  app.listen(config.api.port, () => {
    console.log(`✅ API Server running on http://localhost:${config.api.port}`);
    console.log(`📊 Health: http://localhost:${config.api.port}/health`);
    console.log(`📈 Signals: http://localhost:${config.api.port}/api/signals/active`);
    console.log(`💼 Trades: http://localhost:${config.api.port}/api/trades`);
    console.log(`📉 Performance: http://localhost:${config.api.port}/api/performance/overall`);
  });
}

startAPIServer().catch(error => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});
