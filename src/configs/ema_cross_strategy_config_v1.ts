import dotenv from 'dotenv';
import { Config } from '../types';

// 載入 .env 檔案
dotenv.config();

const config: Config = {
  platform: 'bitmex',
  apiKey: process.env.BITMEX_API_KEY || '',
  apiSecret: process.env.BITMEX_API_SECRET || '',
  test: process.env.TEST === 'true',
  symbol: process.env.SYMBOL || 'XBTUSD',
  qty: Number(process.env.EMA_CROSS_V1_QTY) || 10,
  leverage: Number(process.env.EMA_CROSS_V1_LEVERAGE) || 100,
  profitTarget: Number(process.env.EMA_CROSS_V1_PROFIT_TARGET) || 9,
  stopLoss: Number(process.env.EMA_CROSS_V1_STOP_LOSS) || 3,
  maxPositions: Number(process.env.EMA_CROSS_V1_MAX_POSITIONS) || 1,
  maxDailyLoss: Number(process.env.EMA_CROSS_V1_MAX_DAILY_LOSS) || 10,
  riskPerTrade: Number(process.env.EMA_CROSS_V1_RISK_PER_TRADE) || 10,
  fastPeriod: Number(process.env.EMA_CROSS_V1_FAST_PERIOD) || 20, // 快速 EMA 週期
  slowPeriod: Number(process.env.EMA_CROSS_V1_SLOW_PERIOD) || 120, // 慢速 EMA 週期
  interval: process.env.EMA_CROSS_V1_INTERVAL || '5m',
  factor: Number(process.env.EMA_CROSS_V1_FACTOR) || 5,
};

export { config as ema_cross_strategy_config_v1 }; 