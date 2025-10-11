// ============================================
// FILE: src/telegram/messageFormatter.js
// ============================================
import { config } from '../config/index.js';

export class MessageFormatter {
  formatNewSignal(analysis) {
    const emoji = analysis.signal_type === 'LONG' ? '🟢' : '🔴';
    const currentPrice = analysis.indicators.price;
    
    const entryMin = (currentPrice * 0.98).toFixed(2);
    const entryMax = (currentPrice * 1.02).toFixed(2);
    
    const targets = this.calculateTargets(currentPrice, analysis.signal_type);
    const stopLoss = this.calculateStopLoss(currentPrice, analysis.signal_type);
    
    const targetText = targets.map((t, i) => 
      `${i + 1}) 🎯 $${t.price} (${t.percent}%)`
    ).join('\n');
    
    const patternText = analysis.patterns && analysis.patterns.length > 0
      ? `\n🔍 Patterns: ${analysis.patterns.map(p => p.type).join(', ')}`
      : '';
    
    return `
🚀 NEW SIGNAL DETECTED 🚀

Pair: #${analysis.symbol}/USDT
Position: Scalp ${analysis.signal_type} ${emoji}
Position: Scalp ${analysis.signal} ${emoji}
Leverage: Cross ${config.trading.leverageDefault}x

💰 Entry Zone: $${entryMin} - $${entryMax}

🎯 Targets:
${targetText}

🚨 Stop Loss: $${stopLoss} (${config.risk.stopLossPercent}%)

⚡ Confidence: ${analysis.confidence}%
📊 RSI: ${analysis.indicators.rsi.toFixed(2)}
📈 MACD: ${analysis.indicators.macd.toFixed(2)}${patternText}

⏰ ${new Date().toISOString()}

---
⚠️ Manual execution on Binance Testnet
    `.trim();
  }

  calculateTargets(price, type) {
    return config.targets.map(percent => {
      const multiplier = type === 'LONG' ? 1 + (percent / 100) : 1 - (percent / 100);
      return {
        price: (price * multiplier).toFixed(2),
        percent: percent
      };
    });
  }

  calculateStopLoss(price, type) {
    const slPercent = config.risk.stopLossPercent / 100;
    const multiplier = type === 'LONG' ? 1 - slPercent : 1 + slPercent;
    return (price * multiplier).toFixed(2);
  }

  formatPositionUpdate(signal, currentPrice) {
    const profit = this.calculateProfit(signal, currentPrice);
    
    return `
✅ POSITION UPDATE ✅

Pair: #${signal.pair}/USDT
Status: Ready to Close 🔴

Entry: $${signal.entry.min}
Current: $${currentPrice}
Profit: ${profit > 0 ? '+' : ''}${profit.toFixed(2)}%

You can close position manually now.
    `.trim();
  }

  calculateProfit(signal, currentPrice) {
    const entry = (signal.entry.min + signal.entry.max) / 2;
    if (signal.type === 'LONG') {
      return ((currentPrice - entry) / entry) * 100;
    } else {
      return ((entry - currentPrice) / entry) * 100;
    }
  }
}

export const messageFormatter = new MessageFormatter();