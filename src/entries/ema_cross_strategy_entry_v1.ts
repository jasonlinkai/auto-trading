import { logger } from '../utils/logger';
import { BitmexTrader } from '../traders/bitmex';
import { EmaCrossStrategy } from '../strategies/ema_cross_strategy';
import { bitmex } from '../dataSources';
import { ema_cross_strategy_config_v1 } from '../configs/ema_cross_strategy_config_v1';

const EmaCrossStrategyEntryV1 = async (): Promise<void> => {
  const config = ema_cross_strategy_config_v1;
  logger.writeLog(`交易對: ${config.symbol}`);
  const trader = new BitmexTrader(config);
  await trader.initialize();
  logger.writeLog('交易所初始化成功');
  const strategy = new EmaCrossStrategy(config, trader);
  const ws = await bitmex.wsDataSource(config, strategy);

  process.on('SIGINT', () => {
    logger.writeLog('程式被手動停止');
    if (ws) {
      ws.close();
    }
    process.exit();
  });
};

export default EmaCrossStrategyEntryV1;