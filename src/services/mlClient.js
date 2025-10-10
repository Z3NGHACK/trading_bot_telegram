// ============================================
// FILE: src/services/mlClient.js
// ============================================
import axios from 'axios';
import { config } from '../config/index.js';

class MLClient {
  constructor() {
    this.baseUrl = config.mlApiUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000
    });
  }

  async analyzeSymbol(symbol, days = 7) {
    try {
      const response = await this.client.post('/api/analyze', {
        symbol,
        days
      });
      return response.data;
    } catch (error) {
      console.error(`ML API Error for ${symbol}:`, error.message);
      return null;
    }
  }

  async getIndicators(symbol) {
    try {
      const response = await this.client.get(`/api/indicators/${symbol}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

export const mlClient = new MLClient();
