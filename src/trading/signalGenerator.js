// ============================================
// FILE: src/trading/signalGenerator.js
// ============================================
import { mlClient } from '../services/mlClient.js';
import { Signal } from '../models/Signal.js';
import { telegramService } from '../telegram/bot.js';
import { messageFormatter } from '../telegram/messageFormatter.js';
import { config } from '../config/index.js';

export class SignalGenerator {
  async checkForSignals() {
    console.log('\n🔍 Checking for signals...');

    for (const symbol of config.trading.pairs) {
      await this.analyzeSymbol(symbol);
      await this.sleep(2000); // Avoid rate limits
    }
  }

  async analyzeSymbol(symbol) {
    try {
      console.log(`📊 Analyzing ${symbol}...`);
      
      const analysis = await mlClient.analyzeSymbol(symbol);
      
      if (!analysis || !analysis.signal_type) {
        console.log(`   No signal for ${symbol}`);
        return;
      }

      console.log(`   ✅ ${analysis.signal_type} signal - Confidence: ${analysis.confidence}%`);

      // Check if signal already exists
      const existing = await Signal.findOne({
        pair: `${symbol}USDT`,
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });

      if (existing) {
        console.log(`   ⚠️  Signal already exists`);
        return;
      }

      // Create signal
      const signal = await this.createSignal(analysis);

      // Send Telegram notification
      const message = messageFormatter.formatNewSignal(analysis);
      await telegramService.sendMessage(message);

      await Signal.findByIdAndUpdate(signal._id, { telegramSent: true });

    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error.message);
    }
  }

  async createSignal(analysis) {
    const currentPrice = analysis.indicators.price;
    const targets = messageFormatter.calculateTargets(currentPrice, analysis.signal_type);
    const stopLoss = messageFormatter.calculateStopLoss(currentPrice, analysis.signal_type);

    const signal = new Signal({
      pair: `${analysis.symbol}USDT`,
      type: analysis.signal_type,
      leverage: config.trading.leverageDefault,
      entry: {
        min: currentPrice * 0.98,
        max: currentPrice * 1.02
      },
      targets: targets.map(t => ({ price: parseFloat(t.price), percent: t.percent })),
      stopLoss: parseFloat(stopLoss),
      confidence: analysis.confidence,
      indicators: analysis.indicators,
      patterns: analysis.patterns || [],
      status: 'active'
    });

    await signal.save();
    return signal;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const signalGenerator = new SignalGenerator();