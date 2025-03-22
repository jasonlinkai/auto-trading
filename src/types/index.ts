export interface Config {
  platform: string;
  apiKey: string;
  apiSecret: string;
  test: boolean;
  symbol: string;
  qty: number;
  leverage: number;
  profitTarget: number;
  stopLoss: number;
  maxPositions: number;
  maxDailyLoss: number;
  riskPerTrade: number;
  fastPeriod: number;
  slowPeriod: number;
  interval: string;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  side: string;
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
}

export interface OrderIds {
  mainOrderId: string;
  takeProfitOrderId: string;
  stopLossOrderId: string;
}

export interface Balance {
  total: Wallet;
  used: Wallet;
  free: Wallet;
}

export interface Wallet {
  [key: string]: number;
}

export interface Trader {
  initialize(): Promise<void>;
  setLeverage(): Promise<void>;
  getCurrentPrice(): Promise<number>;
  checkRiskControl(): Promise<boolean>;
  openPosition(orderType: 'long' | 'short'): Promise<OrderIds>;
  closePosition(): Promise<void>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  cancelAllOrders(): Promise<void>;
  getBalance(): Promise<Balance>;
  getPreviousPrice(): Promise<number>;
  calculateEMA(period: number): Promise<number>;
  calculatePreviousEMA(period: number): Promise<number>;
  getPositions(): Promise<Position[]>;
}

export interface OrderStatus {
  id: string;
  status: string;
  side: string;
  type: string;
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  timestamp: number;
} 