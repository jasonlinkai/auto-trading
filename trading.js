const ccxt = require("ccxt");
const { EMA } = require("technicalindicators");
require("dotenv").config();

class BitmexTrader {
  constructor(config) {
    this.config = config;
    this.symbol = config.symbol || "XBTUSD";
    this.qty = config.qty || 0.001;
    this.leverage = config.leverage || 10;
    this.profitTarget = config.profitTarget || 100;
    this.stopLoss = config.stopLoss || 50;
    this.maxPositions = config.maxPositions || 3;
    this.maxDailyLoss = config.maxDailyLoss || 500;
    this.riskPerTrade = config.riskPerTrade || 100;
    this.interval = config.interval || "5m";
  }

  // 初始化交易所
  async initialize() {
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
      // 多資產賬戶不支持設置槓桿，所以我們跳過這一步
      console.log("注意：多資產賬戶不支持設置槓桿");
    } catch (error) {
      console.error("初始化失敗:", error);
      throw error;
    }
  }

  // 設置槓桿
  async setLeverage() {
    try {
      // 先設置為全倉模式
      await this.bitmex.setMarginMode("cross", this.symbol);
      // 然後設置槓桿
      await this.bitmex.setLeverage(this.leverage, this.symbol);
      console.log(`槓桿設置為 ${this.leverage}x (全倉模式)`);
    } catch (error) {
      console.error("設置槓桿失敗:", error);
      throw error;
    }
  }

  // 獲取當前市場價格
  async getCurrentPrice() {
    try {
      const ticker = await this.bitmex.fetchTicker(this.symbol);
      return ticker.last;
    } catch (error) {
      console.error("獲取價格失敗:", error);
      throw error;
    }
  }

  // 檢查風險控制
  async checkRiskControl() {
    try {
      // 檢查日內虧損
      const balance = await this.bitmex.fetchBalance();
      const dailyPnL = this.calculateDailyPnL(balance);
      if (Math.abs(dailyPnL) > this.maxDailyLoss) {
        throw new Error(`日內虧損超過限制: ${dailyPnL} USD`);
      }

      // 檢查當前持倉數量
      const positions = await this.bitmex.fetchPositions([this.symbol]);
      const openPositions = positions.filter((p) => p.contracts > 0);
      if (openPositions.length >= this.maxPositions) {
        throw new Error(`當前持倉數量達到上限: ${openPositions.length}`);
      }

      return true;
    } catch (error) {
      console.error("風險控制檢查失敗:", error);
      throw error;
    }
  }

  // 計算日內盈虧
  calculateDailyPnL(balance) {
    // 這裡需要根據實際的餘額數據結構進行計算
    return 0; // 臨時返回0，需要實現具體計算邏輯
  }

  // 開倉
  async openPosition(orderType) {
    try {
      // 風險控制檢查
      await this.checkRiskControl();

      const price = await this.getCurrentPrice();
      console.log(`當前價格: ${price}`);

      if (orderType === "long") {
        console.log("開多單！");
        // 市價買入
        const buyOrder = await this.bitmex.createOrder(
          this.symbol,
          "market",
          "buy",
          this.qty
        );
        console.log("買入訂單執行成功:", buyOrder);

        // 設置止盈限價賣單
        const takeProfitOrder = await this.bitmex.createOrder(
          this.symbol,
          "limit",
          "sell",
          this.qty,
          Math.round(price + this.profitTarget) // 四捨五入到整數
        );
        console.log("止盈訂單設置成功:", takeProfitOrder);

        // 設置止損單
        const stopLossOrder = await this.bitmex.createOrder(
          this.symbol,
          "stop",
          "sell",
          this.qty,
          Math.round(price - this.stopLoss), // 四捨五入到整數
          {
            stopPx: Math.round(price - this.stopLoss), // 四捨五入到整數
          }
        );
        console.log("止損訂單設置成功:", stopLossOrder);

        return {
          mainOrderId: buyOrder.id,
          takeProfitOrderId: takeProfitOrder.id,
          stopLossOrderId: stopLossOrder.id,
        };
      } else if (orderType === "short") {
        console.log("開空單！");
        // 市價賣出
        const sellOrder = await this.bitmex.createOrder(
          this.symbol,
          "market",
          "sell",
          this.qty
        );
        console.log("賣出訂單執行成功:", sellOrder);

        // 設置止盈限價買單
        const takeProfitOrder = await this.bitmex.createOrder(
          this.symbol,
          "limit",
          "buy",
          this.qty,
          Math.round(price - this.profitTarget) // 四捨五入到整數
        );
        console.log("止盈訂單設置成功:", takeProfitOrder);

        // 設置止損單
        const stopLossOrder = await this.bitmex.createOrder(
          this.symbol,
          "stop",
          "buy",
          this.qty,
          Math.round(price + this.stopLoss), // 四捨五入到整數
          {
            stopPx: Math.round(price + this.stopLoss), // 四捨五入到整數
          }
        );
        console.log("止損訂單設置成功:", stopLossOrder);

        return {
          mainOrderId: sellOrder.id,
          takeProfitOrderId: takeProfitOrder.id,
          stopLossOrderId: stopLossOrder.id,
        };
      }
    } catch (error) {
      console.error("開倉失敗:", error);
      throw error;
    }
  }

  // 平倉
  async closePosition() {
    try {
      const positions = await this.bitmex.fetchPositions([this.symbol]);
      const position = positions.find((p) => p.contracts > 0);

      if (position) {
        const side = position.side === "long" ? "sell" : "buy";
        await this.bitmex.createOrder(
          this.symbol,
          "market",
          side,
          position.contracts
        );
        console.log("平倉成功");
      } else {
        console.log("沒有需要平倉的倉位");
      }
    } catch (error) {
      console.error("平倉失敗:", error);
      throw error;
    }
  }

  // 獲取訂單狀態
  async getOrderStatus(orderId) {
    try {
      const orders = await this.bitmex.fetchOrders(this.symbol);
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        throw new Error(`找不到訂單 ${orderId}`);
      }
      return {
        id: order.id,
        status: order.status,
        side: order.side,
        type: order.type,
        price: order.price,
        amount: order.amount,
        filled: order.filled,
        remaining: order.remaining,
        timestamp: order.timestamp,
      };
    } catch (error) {
      console.error("獲取訂單狀態失敗:", error.message);
      throw error;
    }
  }

  // 取消所有訂單
  async cancelAllOrders() {
    try {
      await this.bitmex.cancelAllOrders(this.symbol);
      console.log("所有訂單已取消");
    } catch (error) {
      console.error("取消訂單失敗:", error);
      throw error;
    }
  }

  // 獲取賬戶餘額
  async getBalance() {
    try {
      const balance = await this.bitmex.fetchBalance();
      return {
        total: balance.total,
        used: balance.used,
        free: balance.free,
      };
    } catch (error) {
      console.error("獲取餘額失敗:", error);
      throw error;
    }
  }

  // 獲取前一個 K 棒的價格
  async getPreviousPrice() {
    try {
      const ohlcv = await this.bitmex.fetchOHLCV(
        this.symbol,
        this.interval,
        undefined,
        2
      );
      if (ohlcv && ohlcv.length >= 2) {
        return ohlcv[0][4]; // 返回前一個 K 棒的收盤價
      }
      throw new Error("無法獲取前一個 K 棒的價格");
    } catch (error) {
      console.error("獲取前一個 K 棒價格失敗:", error);
      throw error;
    }
  }

  // 計算 EMA
  async calculateEMA(period) {
    try {
      const ohlcv = await this.bitmex.fetchOHLCV(
        this.symbol,
        this.interval,
        undefined,
        period + 1
      );
      if (ohlcv && ohlcv.length >= period + 1) {
        const prices = ohlcv.map((candle) => candle[4]); // 使用收盤價
        const ema = new EMA({ period, values: prices });
        return ema.getResult()[ema.getResult().length - 1];
      }
      throw new Error("無法獲取足夠的數據來計算 EMA");
    } catch (error) {
      console.error("計算 EMA 失敗:", error);
      throw error;
    }
  }

  // 計算前一個 K 棒的 EMA
  async calculatePreviousEMA(period) {
    try {
      const ohlcv = await this.bitmex.fetchOHLCV(
        this.symbol,
        this.interval,
        undefined,
        period + 2
      );
      if (ohlcv && ohlcv.length >= period + 2) {
        // 使用前一個 K 棒的數據計算 EMA
        const prices = ohlcv.slice(0, -1).map((candle) => candle[4]); // 使用收盤價
        const ema = new EMA({ period, values: prices });
        return ema.getResult()[ema.getResult().length - 1];
      }
      throw new Error("無法獲取足夠的數據來計算前一個 K 棒的 EMA");
    } catch (error) {
      console.error("計算前一個 K 棒 EMA 失敗:", error);
      throw error;
    }
  }

  // 獲取當前持倉信息
  async getPositions() {
    try {
      const positions = await this.bitmex.fetchPositions([this.symbol]);
      return positions.filter(p => p.contracts > 0);
    } catch (error) {
      console.error("獲取持倉信息失敗:", error);
      return [];
    }
  }
}

module.exports = BitmexTrader;
