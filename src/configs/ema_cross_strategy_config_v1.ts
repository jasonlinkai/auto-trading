import dotenv from 'dotenv';
import { Config } from '../types';

// 載入 .env 檔案
dotenv.config();

const config: Config = {
  platform: 'bitmex',
  apiKey: process.env.BITMEX_API_KEY || '',
  apiSecret: process.env.BITMEX_API_SECRET || '',
  test: true, // 使用測試網
  symbol: 'XBTUSD',
  qty: 10,
  leverage: 100,
  profitTarget: 9,
  stopLoss: 3,
  maxPositions: 1,
  maxDailyLoss: 10,
  riskPerTrade: 10,
  // EMA 策略參數
  fastPeriod: 20, // 快速 EMA 週期
  slowPeriod: 120, // 慢速 EMA 週期
  interval: '5m',
  factor: 5,
};

export { config as ema_cross_strategy_config_v1 }; 