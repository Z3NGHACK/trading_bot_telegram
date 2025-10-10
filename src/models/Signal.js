// ============================================
// FILE: src/models/Signal.js
// ============================================
import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  pair: { type: String, required: true },
  type: { type: String, enum: ['LONG', 'SHORT'], required: true },
  leverage: { type: Number, required: true },
  entry: { min: Number, max: Number },
  targets: [{ price: Number, percent: Number }],
  stopLoss: { type: Number, required: true },
  confidence: { type: Number, required: true },
  indicators: { type: Object },
  patterns: [{ type: Object }],
  status: { type: String, default: 'active' },
  telegramSent: { type: Boolean, default: false }
}, { timestamps: true });

export const Signal = mongoose.model('Signal', signalSchema);
