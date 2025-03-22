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
  qty: 100, // 修改為最小訂單數量
  leverage: 1,
  profitTarget: 900,
  stopLoss: 300,
  maxPositions: 1,
  maxDailyLoss: 500,
  riskPerTrade: 100,
  // EMA 策略參數
  fastPeriod: 20, // 快速 EMA 週期
  slowPeriod: 120, // 慢速 EMA 週期
  interval: '5m',
};

export { config as ema_cross_strategy_config_v1 }; 