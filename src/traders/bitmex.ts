import * as ccxt from 'ccxt';
import { EMA } from 'technicalindicators';
import { Balance, Config, OrderIds, Position, Trader, Wallet } from '../types';
import { logger } from '../utils/logger';

interface OrderStatus {
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

interface BitmexPosition {
  contracts?: number;
  side: string;
}

interface BitmexOrder {
  id: string;
  status?: string;
  side: string;
  type: string;
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  timestamp: number;
}

interface BitmexOHLCV {
  [index: number]: number | undefined;
}

export class BitmexTrader implements Trader {
  private config: Config;
  private bitmex!: ccxt.Exchange;
  private symbol: string;
  private qty: number;
  private leverage: number;
  private profitTarget: number;
  private stopLoss: number;
  private maxPositions: number;
  private maxDailyLoss: number;
  private riskPerTrade: number;
  private interval: string;
  private factor: number;
  private readonly className = 'BitmexTrader';

  constructor(config: Config) {
    this.config = config;
    this.symbol = config.symbol || 'XBTUSD';
    this.qty = config.qty || 0.001;
    this.leverage = config.leverage || 10;
    this.profitTarget = config.profitTarget || 100;
    this.stopLoss = config.stopLoss || 50;
    this.maxPositions = config.maxPositions || 3;
    this.maxDailyLoss = config.maxDailyLoss || 500;
    this.riskPerTrade = config.riskPerTrade || 100;
    this.interval = config.interval || '5m';
    this.factor = config.factor || 5;
  }

  async initialize(): Promise<void> {
    try {
      this.bitmex = new ccxt.bitmex({
        apiKey: this.config.apiKey,
        secret: this.config.apiSecret,
        enableRateLimit: true,
        rateLimit: 1000,
        test: this.config.test || true,
      });

      if (this.config.test) {
        this.bitmex.setSandboxMode(true);
      }

      await this.bitmex.loadMarkets();
      logger.writeLog('注意：多資產賬戶不支持設置槓桿', this.className);
    } catch (error) {
      logger.writeLog(`初始化失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async setLeverage(): Promise<void> {
    try {
      await this.bitmex.setMarginMode('cross', this.symbol);
      await this.bitmex.setLeverage(this.leverage, this.symbol);
      logger.writeLog(`槓桿設置為 ${this.leverage}x (全倉模式)`, this.className);
    } catch (error) {
      logger.writeLog(`設置槓桿失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async getCurrentPrice(): Promise<number> {
    try {
      const ticker = await this.bitmex.fetchTicker(this.symbol);
      return Number(ticker.last) || 0;
    } catch (error) {
      logger.writeLog(`獲取價格失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async checkRiskControl(): Promise<boolean> {
    try {
      const balance = await this.bitmex.fetchBalance();
      const dailyPnL = this.calculateDailyPnL(balance);
      if (Math.abs(dailyPnL) > this.maxDailyLoss) {
        throw new Error(`日內虧損超過限制: ${dailyPnL} USD`);
      }

      const positions = (await this.bitmex.fetchPositions([this.symbol])) as BitmexPosition[];
      const openPositions = positions.filter(p => (p.contracts || 0) > 0);
      if (openPositions.length >= this.maxPositions) {
        throw new Error(`當前持倉數量達到上限: ${openPositions.length}`);
      }

      return true;
    } catch (error) {
      logger.writeLog(`風險控制檢查失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  private calculateDailyPnL(balance: any): number {
    // TODO: 實現具體的日內盈虧計算邏輯
    return 0;
  }

  async openPosition(orderType: 'long' | 'short'): Promise<OrderIds> {
    try {
      await this.checkRiskControl();

      const price = await this.getCurrentPrice();
      logger.writeLog(`當前價格: ${price}`, this.className);

      if (orderType === 'long') {
        logger.writeLog('開多單！', this.className);
        const buyOrder = await this.bitmex.createOrder(this.symbol, 'market', 'buy', this.qty);
        logger.writeLog(`買入訂單執行成功: ${JSON.stringify(buyOrder)}`, this.className);

        const takeProfitOrder = await this.bitmex.createOrder(
          this.symbol,
          'limit',
          'sell',
          this.qty,
          Math.round(price + this.profitTarget)
        );
        logger.writeLog(`止盈訂單設置成功: ${JSON.stringify(takeProfitOrder)}`, this.className);

        const stopLossOrder = await this.bitmex.createOrder(
          this.symbol,
          'stop',
          'sell',
          this.qty,
          Math.round(price - this.stopLoss),
          {
            stopPx: Math.round(price - this.stopLoss),
          }
        );
        logger.writeLog(`止損訂單設置成功: ${JSON.stringify(stopLossOrder)}`, this.className);

        return {
          mainOrderId: buyOrder.id,
          takeProfitOrderId: takeProfitOrder.id,
          stopLossOrderId: stopLossOrder.id,
        };
      } else {
        logger.writeLog('開空單！', this.className);
        const sellOrder = await this.bitmex.createOrder(this.symbol, 'market', 'sell', this.qty);
        logger.writeLog(`賣出訂單執行成功: ${JSON.stringify(sellOrder)}`, this.className);

        const takeProfitOrder = await this.bitmex.createOrder(
          this.symbol,
          'limit',
          'buy',
          this.qty,
          Math.round(price - this.profitTarget)
        );
        logger.writeLog(`止盈訂單設置成功: ${JSON.stringify(takeProfitOrder)}`, this.className);

        const stopLossOrder = await this.bitmex.createOrder(
          this.symbol,
          'stop',
          'buy',
          this.qty,
          Math.round(price + this.stopLoss),
          {
            stopPx: Math.round(price + this.stopLoss),
          }
        );
        logger.writeLog(`止損訂單設置成功: ${JSON.stringify(stopLossOrder)}`, this.className);

        return {
          mainOrderId: sellOrder.id,
          takeProfitOrderId: takeProfitOrder.id,
          stopLossOrderId: stopLossOrder.id,
        };
      }
    } catch (error) {
      logger.writeLog(`開倉失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async closePosition(): Promise<void> {
    try {
      const positions = (await this.bitmex.fetchPositions([this.symbol])) as BitmexPosition[];
      const position = positions.find(p => (p.contracts || 0) > 0);

      if (position && position.contracts) {
        const side = position.side === 'long' ? 'sell' : 'buy';
        await this.bitmex.createOrder(this.symbol, 'market', side, position.contracts);
        logger.writeLog('平倉成功', this.className);
      } else {
        logger.writeLog('沒有需要平倉的倉位', this.className);
      }
    } catch (error) {
      logger.writeLog(`平倉失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    try {
      const orders = (await this.bitmex.fetchOrders(this.symbol)) as BitmexOrder[];
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error(`找不到訂單 ${orderId}`);
      }
      return {
        id: order.id,
        status: order.status || 'unknown',
        side: order.side,
        type: order.type,
        price: order.price,
        amount: order.amount,
        filled: order.filled,
        remaining: order.remaining,
        timestamp: order.timestamp,
      };
    } catch (error) {
      logger.writeLog(`獲取訂單狀態失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async cancelAllOrders(): Promise<void> {
    try {
      await this.bitmex.cancelAllOrders(this.symbol);
      logger.writeLog('所有訂單已取消', this.className);
    } catch (error) {
      logger.writeLog(`取消訂單失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async getBalance(): Promise<Balance> {
    try {
      const balance = await this.bitmex.fetchBalance();
      return {
        total: balance.total as unknown as Wallet,
        used: balance.used as unknown as Wallet,
        free: balance.free as unknown as Wallet,
      };
    } catch (error) {
      logger.writeLog(`獲取餘額失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async getPreviousPrice(): Promise<number> {
    try {
      const ohlcv = await this.bitmex.fetchOHLCV(this.symbol, this.interval, undefined, 2);
      if (ohlcv && ohlcv.length >= 2) {
        return Number(ohlcv[0][4]) || 0;
      }
      throw new Error('無法獲取前一個 K 棒的價格');
    } catch (error) {
      logger.writeLog(`獲取前一個 K 棒價格失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async calculateEMA(period: number): Promise<number> {
    try {
      const ohlcv = (await this.bitmex.fetchOHLCV(
        this.symbol,
        this.interval,
        undefined,
        period * this.factor
      )) as BitmexOHLCV[];
      if (ohlcv && ohlcv.length >= period * this.factor) {
        const prices = ohlcv.map(candle => Number(candle[4]) || 0);
        const ema = new EMA({ period, values: prices });
        return ema.getResult()[ema.getResult().length - 1];
      }
      throw new Error('無法獲取足夠的數據來計算 EMA');
    } catch (error) {
      logger.writeLog(`計算 EMA 失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async calculatePreviousEMA(period: number): Promise<number> {
    try {
      const ohlcv = (await this.bitmex.fetchOHLCV(
        this.symbol,
        this.interval,
        undefined,
        period * this.factor + 1
      )) as BitmexOHLCV[];
      if (ohlcv && ohlcv.length >= period * this.factor + 1) {
        const prices = ohlcv.slice(0, -1).map(candle => Number(candle[4]) || 0);
        const ema = new EMA({ period, values: prices });
        return ema.getResult()[ema.getResult().length - 1];
      }
      throw new Error('無法獲取足夠的數據來計算前一個 K 棒的 EMA');
    } catch (error) {
      logger.writeLog(`計算前一個 K 棒 EMA 失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const positions = await this.bitmex.fetchPositions([this.symbol]);
      logger.writeLog(`當前持倉: ${JSON.stringify(positions, null, 2)}`, this.className);
      
      return positions
        .filter((p: any) => (p.contracts || 0) > 0)
        .map((p: any) => ({
          side: p.side,
          size: p.contracts || 0,
          entryPrice: p.entryPrice || 0,
          unrealizedPnl: p.unrealizedPnl || 0
        }));
    } catch (error) {
      logger.writeLog(`獲取持倉失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
      throw error;
    }
  }
}
