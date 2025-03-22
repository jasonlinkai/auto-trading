import { Config, Position, OrderIds, Balance } from '../types';
import { logger } from '../utils/logger';

interface Trader {
  initialize(): Promise<void>;
  getBalance(): Promise<Balance>;
  getCurrentPrice(): Promise<number>;
  calculateEMA(period: number): Promise<number>;
  getPreviousPrice(): Promise<number>;
  calculatePreviousEMA(period: number): Promise<number>;
  openPosition(side: 'long' | 'short'): Promise<OrderIds>;
  getOrderStatus(orderId: string): Promise<any>;
  getPositions(): Promise<Position[]>;
}

export class EmaCrossStrategy {
  private config: Config;
  private trader: Trader;
  private readonly className = 'EmaCrossStrategy';

  constructor(config: Config, trader: Trader) {
    this.config = config;
    this.trader = trader;
  }

  async execute(): Promise<void> {
    try {
      logger.writeLog('開始執行交易策略...', this.className);

      // 獲取賬戶餘額
      const balance = await this.trader.getBalance();
      logger.writeLog(`賬戶餘額: ${JSON.stringify(balance)}`, this.className);

      // 獲取當前價格
      const currentPrice = await this.trader.getCurrentPrice();
      logger.writeLog(`當前價格: ${currentPrice}`, this.className);

      // 計算 EMA
      const emaFast = await this.trader.calculateEMA(this.config.fastPeriod);
      const emaSlow = await this.trader.calculateEMA(this.config.slowPeriod);

      // 獲取前一個 K 棒的價格和 EMA 值
      const previousPrice = await this.trader.getPreviousPrice();
      const previousEmaFast = await this.trader.calculatePreviousEMA(this.config.fastPeriod);
      const previousEmaSlow = await this.trader.calculatePreviousEMA(this.config.slowPeriod);

      // 執行交易
      try {
        logger.writeLog(`價格: ${currentPrice}`, this.className);
        logger.writeLog(`EMA 快線: ${emaFast}`, this.className);
        logger.writeLog(`EMA 慢線: ${emaSlow}`, this.className);
        logger.writeLog(`前一個價格: ${previousPrice}`, this.className);
        logger.writeLog(`前一個 EMA 快線: ${previousEmaFast}`, this.className);
        logger.writeLog(`前一個 EMA 慢線: ${previousEmaSlow}`, this.className);

        // 判斷是否發生金叉（價格從下方穿過快線，且價格在慢線上方）
        const isGoldenCross =
          currentPrice > emaFast && previousPrice <= previousEmaFast && currentPrice > emaSlow;

        // 判斷是否發生死叉（價格從上方穿過快線，且價格在慢線下方）
        const isDeathCross =
          currentPrice < emaFast && previousPrice >= previousEmaFast && currentPrice < emaSlow;

        logger.writeLog('\n交易條件檢查:', this.className);
        logger.writeLog('金叉條件:', this.className);
        logger.writeLog(`- 當前價格 > EMA20: ${currentPrice > emaFast}`, this.className);
        logger.writeLog(`- 前一個價格 <= 前一個 EMA20: ${previousPrice <= previousEmaFast}`, this.className);
        logger.writeLog(`- 當前價格 > EMA120: ${currentPrice > emaSlow}`, this.className);
        logger.writeLog(`金叉信號: ${isGoldenCross}`, this.className);

        logger.writeLog('死叉條件:', this.className);
        logger.writeLog(`- 當前價格 < EMA20: ${currentPrice < emaFast}`, this.className);
        logger.writeLog(`- 前一個價格 >= 前一個 EMA20: ${previousPrice >= previousEmaFast}`, this.className);
        logger.writeLog(`- 當前價格 < EMA120: ${currentPrice < emaSlow}`, this.className);
        logger.writeLog(`死叉信號: ${isDeathCross}`, this.className);

        // 執行開多倉
        if (isGoldenCross) {
          logger.writeLog('\n執行開多倉...', this.className);
          const orderIds = await this.trader.openPosition('long');
          logger.writeLog(`開倉訂單 ID: ${JSON.stringify(orderIds)}`, this.className);

          // 等待 5 秒後檢查訂單狀態
          await new Promise(resolve => setTimeout(resolve, 5000));

          if (orderIds) {
            logger.writeLog('\n檢查主訂單狀態...', this.className);
            const mainOrderStatus = await this.trader.getOrderStatus(orderIds.mainOrderId);
            logger.writeLog(`主訂單狀態: ${JSON.stringify(mainOrderStatus)}`, this.className);

            logger.writeLog('\n檢查止盈訂單狀態...', this.className);
            const takeProfitStatus = await this.trader.getOrderStatus(orderIds.takeProfitOrderId);
            logger.writeLog(`止盈訂單狀態: ${JSON.stringify(takeProfitStatus)}`, this.className);

            logger.writeLog('\n檢查止損訂單狀態...', this.className);
            const stopLossStatus = await this.trader.getOrderStatus(orderIds.stopLossOrderId);
            logger.writeLog(`止損訂單狀態: ${JSON.stringify(stopLossStatus)}`, this.className);
          }
        }

        // 執行開空倉
        if (isDeathCross) {
          logger.writeLog('\n執行開空倉...', this.className);
          const orderIds = await this.trader.openPosition('short');
          logger.writeLog(`開倉訂單 ID: ${JSON.stringify(orderIds)}`, this.className);

          // 等待 5 秒後檢查訂單狀態
          await new Promise(resolve => setTimeout(resolve, 5000));

          if (orderIds) {
            logger.writeLog('\n檢查主訂單狀態...', this.className);
            const mainOrderStatus = await this.trader.getOrderStatus(orderIds.mainOrderId);
            logger.writeLog(`主訂單狀態: ${JSON.stringify(mainOrderStatus)}`, this.className);

            logger.writeLog('\n檢查止盈訂單狀態...', this.className);
            const takeProfitStatus = await this.trader.getOrderStatus(orderIds.takeProfitOrderId);
            logger.writeLog(`止盈訂單狀態: ${JSON.stringify(takeProfitStatus)}`, this.className);

            logger.writeLog('\n檢查止損訂單狀態...', this.className);
            const stopLossStatus = await this.trader.getOrderStatus(orderIds.stopLossOrderId);
            logger.writeLog(`止損訂單狀態: ${JSON.stringify(stopLossStatus)}`, this.className);
          }
        }
      } catch (error) {
        logger.writeLog(`交易執行錯誤: ${error instanceof Error ? error.message : String(error)}`, this.className);
        if (error && typeof error === 'object' && 'response' in error) {
          logger.writeLog(`錯誤詳情: ${JSON.stringify((error as any).response.data)}`, this.className);
        }
      }

      // 檢查當前持倉狀態
      const positions = await this.trader.getPositions();
      if (positions && positions.length > 0) {
        logger.writeLog('\n當前持倉狀態:', this.className);
        positions.forEach(position => {
          logger.writeLog(`- 方向: ${position.side}`, this.className);
          logger.writeLog(`- 數量: ${position.size}`, this.className);
          logger.writeLog(`- 開倉價格: ${position.entryPrice}`, this.className);
          logger.writeLog(`- 未實現盈虧: ${position.unrealizedPnl}`, this.className);
        });
      } else {
        logger.writeLog('\n當前沒有持倉', this.className);
      }

      logger.writeLog('策略執行完成\n', this.className);
    } catch (error) {
      console.error(error);
      logger.writeLog(`策略執行失敗: ${error instanceof Error ? error.message : String(error)}`, this.className);
    }
  }
} 