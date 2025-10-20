// ============================================
// FILE: src/models/Trade.js (UPDATED)
// ============================================
import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  signalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Signal' },
  pair: { type: String, required: true, index: true },
  type: { type: String, enum: ['LONG', 'SHORT'], required: true },
  
  // Entry
  entryPrice: { type: Number, required: true },
  openedAt: { type: Date, default: Date.now },
  
  // Exit
  exitPrice: { type: Number },
  closedAt: { type: Date },
  exitReason: { type: String, enum: ['target', 'stop_loss', 'reversal', 'manual'] },
  
  // Targets tracking
  targets: [{
    price: Number,
    percent: Number,
    hit: { type: Boolean, default: false },
    hitAt: Date
  }],
  targetsHit: [Number], // Which target numbers were hit (1, 2, 3...)
  closedPercent: { type: Number, default: 0 },
  
  // Stop loss
  stopLoss: { type: Number },
  leverage: { type: Number },
  
  // Metrics
  profit: { type: Number }, // Profit/Loss percentage
  confidence: { type: Number },
  indicators: { type: Object },
  
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true }
  
}, { timestamps: true });

tradeSchema.index({ pair: 1, status: 1 });
tradeSchema.index({ createdAt: -1 });

export const Trade = mongoose.model('Trade', tradeSchema);