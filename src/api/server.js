// ============================================
// FILE: src/api/server.js
// ============================================
import express from 'express';
import cors from 'cors';
import { Signal } from '../models/Signal.js';
import { Trade } from '../models/Trade.js';
import { mlClient } from '../services/mlClient.js';
import { config } from '../config/index.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Get active signals
app.get('/api/signals/active', async (req, res) => {
  try {
    const signals = await Signal.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, count: signals.length, data: signals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get signal history
app.get('/api/signals/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const signals = await Signal.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json({ success: true, count: signals.length, data: signals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trades
app.get('/api/trades', async (req, res) => {
  try {
    const status = req.query.status;
    const query = status ? { status } : {};
    
    const trades = await Trade.find(query)
      .populate('signalId')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ success: true, count: trades.length, data: trades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record manual trade
app.post('/api/trades/record', async (req, res) => {
  try {
    const { signalId, action, price, quantity } = req.body;
    
    if (action === 'open') {
      const trade = new Trade({
        signalId,
        pair: req.body.pair,
        type: req.body.type,
        entryPrice: price,
        status: 'open'
      });
      await trade.save();
      res.json({ success: true, data: trade });
    } else if (action === 'close') {
      const trade = await Trade.findById(req.body.tradeId);
      trade.exitPrice = price;
      trade.profit = ((price - trade.entryPrice) / trade.entryPrice) * 100;
      trade.status = 'closed';
      await trade.save();
      res.json({ success: true, data: trade });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get performance stats
app.get('/api/performance/overall', async (req, res) => {
  try {
    const trades = await Trade.find({ status: 'closed' });
    
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);
    
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length
      : 0;
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;
    
    res.json({
      success: true,
      data: {
        totalTrades,
        winRate: winRate.toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.profit || 0)).toFixed(2) : 0,
        worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.profit || 0)).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get live market data
app.get('/api/market/live', async (req, res) => {
  try {
    const pairs = req.query.pairs ? req.query.pairs.split(',') : config.trading.pairs;
    const results = {};
    
    for (const symbol of pairs) {
      const data = await mlClient.getIndicators(symbol);
      if (data) {
        results[`${symbol}USDT`] = data.indicators;
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System status
app.get('/api/status', async (req, res) => {
  try {
    const mlHealthy = await mlClient.healthCheck();
    const activeSignals = await Signal.countDocuments({ status: 'active' });
    const openTrades = await Trade.countDocuments({ status: 'open' });
    
    res.json({
      success: true,
      status: mlHealthy ? 'running' : 'degraded',
      mlEngine: mlHealthy ? 'healthy' : 'down',
      activeSignals,
      openTrades,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
