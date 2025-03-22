const BitmexTrader = require("./trading");
const WebSocket = require("ws");
const logger = require("./utils/logger");

// 配置參數
const config = {
  apiKey: process.env.BITMEX_API_KEY,
  apiSecret: process.env.BITMEX_API_SECRET,
  test: true, // 使用測試網
  symbol: "XBTUSD",
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
  interval: "5m",
};

// WebSocket 連接
const wsUrl = config.test
  ? "wss://testnet.bitmex.com/realtime"
  : "wss://www.bitmex.com/realtime";

let ws = null;

// 連接 WebSocket
function connectWebSocket() {
  ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    logger.writeLog("WebSocket 連接成功");
    // 訂閱 5 分鐘 K 棒數據
    const subscribeMessage = {
      op: "subscribe",
      args: [`tradeBin5m:${config.symbol}`],
    };
    ws.send(JSON.stringify(subscribeMessage));
  });

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      
      // 檢查是否為新的 K 棒數據
      if (message.data && message.data.length > 0) {
        const candle = message.data[0];
        logger.writeLog("\n檢測到新的 5 分鐘 K 棒形成");
        logger.writeLog(`K 棒時間: ${new Date(candle.timestamp).toISOString()}`);
        logger.writeLog(`開盤價: ${candle.open}`);
        logger.writeLog(`最高價: ${candle.high}`);
        logger.writeLog(`最低價: ${candle.low}`);
        logger.writeLog(`收盤價: ${candle.close}`);
        logger.writeLog(`成交量: ${candle.volume}`);
        
        // 執行策略
        await runStrategy();
      }
    } catch (error) {
      logger.writeLog(`處理 WebSocket 消息錯誤: ${error.message}`);
    }
  });

  ws.on("close", () => {
    logger.writeLog("WebSocket 連接關閉，嘗試重新連接...");
    setTimeout(connectWebSocket, 5000); // 5 秒後重新連接
  });

  ws.on("error", (error) => {
    logger.writeLog(`WebSocket 錯誤: ${error.message}`);
    ws.close();
  });
}

async function runStrategy() {
  try {
    logger.writeLog("開始執行交易策略...");

    // 創建交易實例
    const trader = new BitmexTrader(config);

    // 初始化
    await trader.initialize();
    logger.writeLog("交易所初始化成功");

    // 獲取賬戶餘額
    const balance = await trader.getBalance();
    logger.writeLog(`賬戶餘額: ${JSON.stringify(balance)}`);

    // 獲取當前價格
    const currentPrice = await trader.getCurrentPrice();
    logger.writeLog(`當前價格: ${currentPrice}`);

    // 計算 EMA
    const emaFast = await trader.calculateEMA(config.fastPeriod);
    const emaSlow = await trader.calculateEMA(config.slowPeriod);

    // 獲取前一個 K 棒的價格和 EMA 值
    const previousPrice = await trader.getPreviousPrice();
    const previousEmaFast = await trader.calculatePreviousEMA(config.fastPeriod);
    const previousEmaSlow = await trader.calculatePreviousEMA(config.slowPeriod);

    // 執行交易
    try {
      logger.writeLog("\n開始執行交易...");
      logger.writeLog(`交易對: ${config.symbol}`);
      logger.writeLog(`價格: ${currentPrice}`);
      logger.writeLog(`EMA 快線: ${emaFast}`);
      logger.writeLog(`EMA 慢線: ${emaSlow}`);
      logger.writeLog(`前一個價格: ${previousPrice}`);
      logger.writeLog(`前一個 EMA 快線: ${previousEmaFast}`);
      logger.writeLog(`前一個 EMA 慢線: ${previousEmaSlow}`);

      // 判斷是否發生金叉（價格從下方穿過快線，且價格在慢線上方）
      const isGoldenCross =
        currentPrice > emaFast &&
        previousPrice <= previousEmaFast &&
        currentPrice > emaSlow;

      // 判斷是否發生死叉（價格從上方穿過快線，且價格在慢線下方）
      const isDeathCross =
        currentPrice < emaFast &&
        previousPrice >= previousEmaFast &&
        currentPrice < emaSlow;

      logger.writeLog(`\n交易條件檢查:`);
      logger.writeLog(`金叉條件:`);
      logger.writeLog(`- 當前價格 > EMA20: ${currentPrice > emaFast}`);
      logger.writeLog(`- 前一個價格 <= 前一個 EMA20: ${previousPrice <= previousEmaFast}`);
      logger.writeLog(`- 當前價格 > EMA120: ${currentPrice > emaSlow}`);
      logger.writeLog(`金叉信號: ${isGoldenCross}`);

      logger.writeLog(`\n死叉條件:`);
      logger.writeLog(`- 當前價格 < EMA20: ${currentPrice < emaFast}`);
      logger.writeLog(`- 前一個價格 >= 前一個 EMA20: ${previousPrice >= previousEmaFast}`);
      logger.writeLog(`- 當前價格 < EMA120: ${currentPrice < emaSlow}`);
      logger.writeLog(`死叉信號: ${isDeathCross}`);

      // 執行開多倉
      if (isGoldenCross) {
        logger.writeLog("\n執行開多倉...");
        const orderIds = await trader.openPosition("long");
        logger.writeLog(`開倉訂單 ID: ${JSON.stringify(orderIds)}`);

        // 等待 5 秒後檢查訂單狀態
        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (orderIds) {
          logger.writeLog("\n檢查主訂單狀態...");
          const mainOrderStatus = await trader.getOrderStatus(orderIds.mainOrderId);
          logger.writeLog(`主訂單狀態: ${JSON.stringify(mainOrderStatus)}`);

          logger.writeLog("\n檢查止盈訂單狀態...");
          const takeProfitStatus = await trader.getOrderStatus(orderIds.takeProfitOrderId);
          logger.writeLog(`止盈訂單狀態: ${JSON.stringify(takeProfitStatus)}`);

          logger.writeLog("\n檢查止損訂單狀態...");
          const stopLossStatus = await trader.getOrderStatus(orderIds.stopLossOrderId);
          logger.writeLog(`止損訂單狀態: ${JSON.stringify(stopLossStatus)}`);
        }
      }

      // 執行開空倉
      if (isDeathCross) {
        logger.writeLog("\n執行開空倉...");
        const orderIds = await trader.openPosition("short");
        logger.writeLog(`開倉訂單 ID: ${JSON.stringify(orderIds)}`);

        // 等待 5 秒後檢查訂單狀態
        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (orderIds) {
          logger.writeLog("\n檢查主訂單狀態...");
          const mainOrderStatus = await trader.getOrderStatus(orderIds.mainOrderId);
          logger.writeLog(`主訂單狀態: ${JSON.stringify(mainOrderStatus)}`);

          logger.writeLog("\n檢查止盈訂單狀態...");
          const takeProfitStatus = await trader.getOrderStatus(orderIds.takeProfitOrderId);
          logger.writeLog(`止盈訂單狀態: ${JSON.stringify(takeProfitStatus)}`);

          logger.writeLog("\n檢查止損訂單狀態...");
          const stopLossStatus = await trader.getOrderStatus(orderIds.stopLossOrderId);
          logger.writeLog(`止損訂單狀態: ${JSON.stringify(stopLossStatus)}`);
        }
      }
    } catch (error) {
      logger.writeLog(`交易執行錯誤: ${error.message}`);
      if (error.response) {
        logger.writeLog(`錯誤詳情: ${JSON.stringify(error.response.data)}`);
      }
    }

    // 檢查當前持倉狀態
    const positions = await trader.getPositions();
    if (positions && positions.length > 0) {
      logger.writeLog("\n當前持倉狀態:");
      positions.forEach(position => {
        logger.writeLog(`- 方向: ${position.side}`);
        logger.writeLog(`- 數量: ${position.currentQty}`);
        logger.writeLog(`- 開倉價格: ${position.avgEntryPrice}`);
        logger.writeLog(`- 未實現盈虧: ${position.unrealisedPnl}`);
      });
    } else {
      logger.writeLog("\n當前沒有持倉");
    }

    logger.writeLog("策略執行完成\n");
  } catch (error) {
    logger.writeLog(`策略執行失敗: ${error.message}`);
  }
}

// 啟動 WebSocket 連接
connectWebSocket();

// 保持程式運行
process.on("SIGINT", () => {
  logger.writeLog("程式被手動停止");
  if (ws) {
    ws.close();
  }
  process.exit();
});
