// ============================================
// FILE: src/config/index.js
// ============================================
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    mongodbUri: process.env.MONGODB_URI,
    mlApiUrl: process.env.ML_API_URL || 'http://localhost:5000',
    
    trading: {
        capital: parseFloat(process.env.CAPITAL) || 100,
        pairs: (process.env.TRADING_PAIRS || 'BTC,ETH,SOL,BNB,ADA').split(','),
        leverageDefault: parseInt(process.env.LEVERAGE_DEFAULT) || 20
    },
    
    targets: [
        parseFloat(process.env.TARGET_1_PERCENT) || 2.5,
        parseFloat(process.env.TARGET_2_PERCENT) || 5.2,
        parseFloat(process.env.TARGET_3_PERCENT) || 12.6,
        parseFloat(process.env.TARGET_4_PERCENT) || 17.5,
        parseFloat(process.env.TARGET_5_PERCENT) || 22.1
    ],
    
    risk: {
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || 5
    },
    
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
    },
    
    api: {
        port: parseInt(process.env.API_PORT) || 4000
    }
};