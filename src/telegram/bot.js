// ============================================
// FILE: src/telegram/bot.js
// ============================================
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/index.js';

class TelegramService {
  constructor() {
    if (!config.telegram.token || !config.telegram.chatId) {
      console.warn('⚠️  Telegram not configured');
      this.enabled = false;
      return;
    }
    
    this.bot = new TelegramBot(config.telegram.token, { polling: false });
    this.chatId = config.telegram.chatId;
    this.enabled = true;
  }

  async sendMessage(message) {
    if (!this.enabled) {
      console.log('📱 Telegram disabled, message:', message.substring(0, 100));
      return;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      console.log('✅ Telegram message sent');
    } catch (error) {
      console.error('❌ Telegram error:', error.message);
    }
  }
}

export const telegramService = new TelegramService();