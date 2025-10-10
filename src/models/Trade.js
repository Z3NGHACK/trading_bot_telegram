// ============================================
// FILE: src/models/Trade.js
// ============================================
import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  signalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Signal' },
  pair: { type: String, required: true },
  type: { type: String, enum: ['LONG', 'SHORT'] },
  entryPrice: { type: Number },
  exitPrice: { type: Number },
  profit: { type: Number },
  status: { type: String, enum: ['open', 'closed'], default: 'open' }
}, { timestamps: true });

export const Trade = mongoose.model('Trade', tradeSchema);