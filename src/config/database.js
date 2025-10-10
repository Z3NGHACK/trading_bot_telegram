// ============================================
// FILE: src/config/database.js
// ============================================
import mongoose from 'mongoose';
import { config } from './index.js';

export const connectDatabase = async () => {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('✅ MongoDB Connected');
        return true;
    } catch (error) {
        console.error('❌ MongoDB Error:', error.message);
        return false;
    }
};
