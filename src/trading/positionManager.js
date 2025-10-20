// ============================================
// FILE: src/trading/positionManager.js
// ============================================
import { Trade } from '../models/Trade.js';
import { Signal } from '../models/Signal.js';
import { telegramService } from '../telegram/bot.js';
import { mlClient } from '../services/mlClient.js';
import { config } from '../config/index.js';

export class PositionManager {
  async openPosition(signal, entryPrice) {
    // """Open a new position from a signal"""
    try {
      console.log(`\n📈 Opening ${signal.type} position for ${signal.pair}`);

      const trade = new Trade({
        signalId: signal._id,
        pair: signal.pair,
        type: signal.type,
        entryPrice: entryPrice,
        leverage: signal.leverage,
        
        // Track targets
        targets: signal.targets.map(t => ({
          price: t.price,
          percent: t.percent,
          hit: false,
          hitAt: null
        })),
        
        stopLoss: signal.stopLoss,
        
        // Track partial closes
        closedPercent: 0,
        targetsHit: [],
        
        status: 'open',
        openedAt: new Date(),
        confidence: signal.confidence,
        indicators: signal.indicators
      });

      await trade.save();

      // Send confirmation
      const confirmMessage = `
✅ POSITION OPENED

Pair: ${signal.pair}
Type: ${signal.type}
Entry: $${entryPrice.toFixed(2)}
Leverage: ${signal.leverage}x

📍 Targets:
${signal.targets.map((t, i) => `${i + 1}) $${t.price.toFixed(2)} (${t.percent}%)`).join('\n')}

🛑 Stop Loss: $${signal.stopLoss.toFixed(2)}

⏰ Time: ${new Date().toISOString()}
      `.trim();

      await telegramService.sendMessage(confirmMessage);

      console.log(`✅ Position opened and saved. ID: ${trade._id}`);
      return trade;

    } catch (error) {
      console.error(`Error opening position: ${error.message}`);
      throw error;
    }
  }

  async monitorOpenPositions() {
    // """Monitor all open positions for TP/SL hits"""
    try {
      const openTrades = await Trade.find({ status: 'open' });

      if (openTrades.length === 0) {
        console.log('No open positions to monitor');
        return;
      }

      console.log(`\n📊 Monitoring ${openTrades.length} open position(s)...`);

      for (const trade of openTrades) {
        await this.checkPosition(trade);
      }

    } catch (error) {
      console.error(`Error monitoring positions: ${error.message}`);
    }
  }

  async checkPosition(trade) {
    // """Check a single position for TP/SL hits and reversals"""
    try {
      // Get current price
      const indicators = await mlClient.getIndicators(trade.pair.replace('USDT', ''));

      if (!indicators || !indicators.indicators) {
        console.log(`⚠️  Could not get current price for ${trade.pair}`);
        return;
      }

      const currentPrice = indicators.indicators.price;
      const currentRSI = indicators.indicators.rsi;

      console.log(`\n💰 ${trade.pair} | Entry: $${trade.entryPrice.toFixed(2)} | Current: $${currentPrice.toFixed(2)}`);

      let action = null;

      // Check LONG position
      if (trade.type === 'LONG') {
        // Check for SL
        if (currentPrice <= trade.stopLoss) {
          action = 'STOP_LOSS';
        }
        // Check for TPs
        else if (currentPrice > trade.entryPrice) {
          // Check each target
          for (let i = 0; i < trade.targets.length; i++) {
            const target = trade.targets[i];
            
            if (currentPrice >= target.price && !target.hit) {
              target.hit = true;
              target.hitAt = new Date();
              trade.targetsHit.push(i + 1);
              trade.closedPercent += (100 / trade.targets.length);

              // Send TP alert
              const tpMessage = `
🎯 TARGET ${i + 1} HIT

Pair: ${trade.pair}
Target: $${target.price.toFixed(2)} (${target.percent}%)
Current: $${currentPrice.toFixed(2)}

✅ Close ${(100 / trade.targets.length).toFixed(0)}% here
Remaining: ${(100 - trade.closedPercent).toFixed(0)}%

⏰ ${new Date().toISOString()}
              `.trim();

              await telegramService.sendMessage(tpMessage);
              console.log(`✅ TARGET ${i + 1} HIT at $${target.price.toFixed(2)}`);
            }
          }
        }
      }

      // Check SHORT position
      else if (trade.type === 'SHORT') {
        // Check for SL
        if (currentPrice >= trade.stopLoss) {
          action = 'STOP_LOSS';
        }
        // Check for TPs
        else if (currentPrice < trade.entryPrice) {
          // Check each target
          for (let i = 0; i < trade.targets.length; i++) {
            const target = trade.targets[i];
            
            if (currentPrice <= target.price && !target.hit) {
              target.hit = true;
              target.hitAt = new Date();
              trade.targetsHit.push(i + 1);
              trade.closedPercent += (100 / trade.targets.length);

              // Send TP alert
              const tpMessage = `
🎯 TARGET ${i + 1} HIT

Pair: ${trade.pair}
Target: $${target.price.toFixed(2)} (${target.percent}%)
Current: $${currentPrice.toFixed(2)}

✅ Close ${(100 / trade.targets.length).toFixed(0)}% here
Remaining: ${(100 - trade.closedPercent).toFixed(0)}%

⏰ ${new Date().toISOString()}
              `.trim();

              await telegramService.sendMessage(tpMessage);
              console.log(`✅ TARGET ${i + 1} HIT at $${target.price.toFixed(2)}`);
            }
          }
        }
      }

      // Check for SL hit
      if (action === 'STOP_LOSS') {
        const slMessage = `
🚨 STOP LOSS HIT

Pair: ${trade.pair}
Entry: $${trade.entryPrice.toFixed(2)}
Stop Loss: $${trade.stopLoss.toFixed(2)}
Current: $${currentPrice.toFixed(2)}

❌ CLOSE ENTIRE POSITION IMMEDIATELY

Loss: ${((currentPrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(2)}%

⏰ ${new Date().toISOString()}
        `.trim();

        await telegramService.sendMessage(slMessage);
        console.log(`🛑 STOP LOSS HIT at $${currentPrice.toFixed(2)}`);

        // Mark as closed
        trade.exitPrice = currentPrice;
        trade.exitReason = 'stop_loss';
        trade.status = 'closed';
        await trade.save();
        return;
      }

      // Check for reversal signal (opposite of entry signal)
      // This would close remaining position
      if (trade.targetsHit.length > 0 && trade.closedPercent < 100) {
        const reversalThreshold = trade.type === 'LONG' ? 55 : 45;
        
        if (currentRSI > reversalThreshold) {
          const reversalMessage = `
⚠️ TREND REVERSAL DETECTED

Pair: ${trade.pair}
RSI: ${currentRSI.toFixed(2)}
Current Price: $${currentPrice.toFixed(2)}

📍 Close remaining ${(100 - trade.closedPercent).toFixed(0)}% of position

Reason: Market reversing, ${trade.targets.length - trade.targetsHit.length} targets still open

⏰ ${new Date().toISOString()}
          `.trim();

          await telegramService.sendMessage(reversalMessage);
          console.log(`⚠️ Reversal signal - close remaining position`);
        }
      }

      // Save updated trade
      await trade.save();

    } catch (error) {
      console.error(`Error checking position: ${error.message}`);
    }
  }

  async closePosition(tradeId, exitPrice, reason) {
    // """Manually close a position"""
    try {
      const trade = await Trade.findById(tradeId);

      if (!trade || trade.status === 'closed') {
        console.log('Position already closed or not found');
        return;
      }

      trade.exitPrice = exitPrice;
      trade.exitReason = reason;
      trade.status = 'closed';
      trade.closedAt = new Date();

      // Calculate P&L
      let profitLoss = 0;
      if (trade.type === 'LONG') {
        profitLoss = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
      } else {
        profitLoss = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
      }

      trade.profit = profitLoss;

      await trade.save();

      const closeMessage = `
✅ POSITION CLOSED

Pair: ${trade.pair}
Type: ${trade.type}
Entry: $${trade.entryPrice.toFixed(2)}
Exit: $${exitPrice.toFixed(2)}
Reason: ${reason}

📊 Result: ${profitLoss > 0 ? '✅ +' : '❌ '}${profitLoss.toFixed(2)}%

Targets Hit: ${trade.targetsHit.length}/${trade.targets.length}

⏰ ${new Date().toISOString()}
      `.trim();

      await telegramService.sendMessage(closeMessage);

      console.log(`✅ Position closed with ${profitLoss.toFixed(2)}% P&L`);
      return trade;

    } catch (error) {
      console.error(`Error closing position: ${error.message}`);
      throw error;
    }
  }

  async getOpenPositions() {
    // """Get all open positions"""
    try {
      return await Trade.find({ status: 'open' });
    } catch (error) {
      console.error(`Error getting open positions: ${error.message}`);
      return [];
    }
  }

  async getPositionStats() {
    // """Get stats on all closed positions"""
    try {
      const closedTrades = await Trade.find({ status: 'closed' });

      if (closedTrades.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          avgProfit: 0,
          totalProfit: 0
        };
      }

      const winningTrades = closedTrades.filter(t => t.profit > 0);
      const winRate = (winningTrades.length / closedTrades.length) * 100;
      const avgProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0) / closedTrades.length;
      const totalProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0);

      return {
        totalTrades: closedTrades.length,
        winRate: winRate.toFixed(2),
        avgProfit: avgProfit.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        bestTrade: Math.max(...closedTrades.map(t => t.profit)).toFixed(2),
        worstTrade: Math.min(...closedTrades.map(t => t.profit)).toFixed(2)
      };
    } catch (error) {
      console.error(`Error getting stats: ${error.message}`);
      return {};
    }
  }
}

export const positionManager = new PositionManager();