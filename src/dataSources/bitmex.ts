import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { Config, Candle } from '../types';

export interface Strategy {
  execute(candle: Candle): Promise<void>;
}

const className = 'BitmexDataSource';

const handler = async (data: WebSocket.Data, strategy: Strategy): Promise<Candle[] | undefined> => {
  try {
    const message = JSON.parse(data.toString());

    // 檢查是否為新的 K 棒數據
    if (message.data && message.data.length > 0) {
      const candle: Candle = message.data[0];
      logger.writeLog(`\n檢測到新的K棒形成，形成時間: ${new Date(candle.timestamp).toISOString()}`, className);
      logger.writeLog(`開盤價: ${candle.open}`, className);
      logger.writeLog(`最高價: ${candle.high}`, className);
      logger.writeLog(`最低價: ${candle.low}`, className);
      logger.writeLog(`收盤價: ${candle.close}`, className);
      logger.writeLog(`成交量: ${candle.volume}`, className);
      
      if (strategy) {
        try {
          await strategy.execute(candle);
        } catch (error) {
          logger.writeLog(`策略執行失敗: ${error instanceof Error ? error.message : String(error)}`, className);
        }
      }
      return message.data;
    }
  } catch (error) {
    logger.writeLog(`處理 WebSocket 消息錯誤: ${error instanceof Error ? error.message : String(error)}`, className);
  }
};

export const wsDataSource = async (config: Config, strategy: Strategy): Promise<WebSocket> => {
  const wsUrl = config.test ? 'wss://testnet.bitmex.com/realtime' : 'wss://www.bitmex.com/realtime';
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    logger.writeLog('WebSocket 連接成功', className);
    // 訂閱 5 分鐘 K 棒數據
    const subscribeMessage = {
      op: 'subscribe',
      args: [`tradeBin${config.interval}:${config.symbol}`],
    };
    ws.send(JSON.stringify(subscribeMessage));
  });

  ws.on('message', async data => {
    await handler(data, strategy);
  });

  ws.on('close', () => {
    logger.writeLog('WebSocket 連接關閉，嘗試重新連接...', className);
    setTimeout(() => wsDataSource(config, strategy), 5000); // 5 秒後重新連接
  });

  ws.on('error', error => {
    logger.writeLog(`WebSocket 錯誤: ${error instanceof Error ? error.message : String(error)}`, className);
  });

  return ws;
}; 