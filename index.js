// ============================================
// FILE: index.js
// ============================================
import cron from 'node-cron';
import { connectDatabase } from './src/config/database.js';
import { signalGenerator } from './src/trading/signalGenerator.js';
import { mlClient } from './src/services/mlClient.js';

async function start() {
  console.log('🚀 Starting Crypto Trading Bot');
  
  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Check ML API health
  const mlHealthy = await mlClient.healthCheck();
  if (!mlHealthy) {
    console.warn('⚠️  ML API is not responding. Signals may not work.');
  } else {
    console.log('✅ ML API is healthy');
  }

  // Run initial check
  await signalGenerator.checkForSignals();

  // Schedule signal checks every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await signalGenerator.checkForSignals();
  });

  console.log('✅ Bot is running. Checking for signals every 5 minutes.\n');
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});