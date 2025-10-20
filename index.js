// Update your index.js to include position monitoring

import cron from 'node-cron';
import { connectDatabase } from './src/config/database.js';
import { signalGenerator } from './src/trading/signalGenerator.js';
import { positionManager } from './src/trading/positionManager.js';
import { mlClient } from './src/services/mlClient.js';

async function start() {
  console.log('🚀 Starting Crypto Trading Bot');
  
  const connected = await connectDatabase();
  if (!connected) {
    console.error('Failed to connect to database.');
    process.exit(1);
  }

  const mlHealthy = await mlClient.healthCheck();
  if (!mlHealthy) {
    console.warn('⚠️ ML API is not responding.');
  } else {
    console.log('✅ ML API is healthy');
  }

  // Check for NEW signals every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await signalGenerator.checkForSignals();
  });

  // Monitor OPEN positions EVERY MINUTE (this is critical!)
  cron.schedule('* * * * *', async () => {
    await positionManager.monitorOpenPositions();
  });

  console.log('✅ Bot started');
  console.log('   Signals checked: Every 5 minutes');
  console.log('   Positions monitored: Every 1 minute');
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});