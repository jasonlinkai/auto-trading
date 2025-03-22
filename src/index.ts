import inquirer from 'inquirer';
import { logger } from './utils/logger';
import { 
  availableTraders, 
  availableStrategies, 
  availableDataSources,
  availableConfigs 
} from './configs/available_options';

const main = async () => {
  try {
    // 顯示交易者選擇介面
    const { trader } = await inquirer.prompt([
      {
        type: 'list',
        name: 'trader',
        message: '請選擇交易者：',
        choices: availableTraders.map(t => ({
          name: `${t.name} - ${t.description}`,
          value: t.value,
          short: t.name
        }))
      }
    ]);

    // 顯示策略選擇介面
    const { strategy } = await inquirer.prompt([
      {
        type: 'list',
        name: 'strategy',
        message: '請選擇交易策略：',
        choices: availableStrategies.map(s => ({
          name: `${s.name} - ${s.description}`,
          value: s.value,
          short: s.name
        }))
      }
    ]);

    // 顯示配置選擇介面
    const { config } = await inquirer.prompt([
      {
        type: 'list',
        name: 'config',
        message: '請選擇策略配置：',
        choices: availableConfigs.map(c => ({
          name: `${c.name} - ${c.description}`,
          value: c.value,
          short: c.name
        }))
      }
    ]);

    // 顯示數據源選擇介面
    const { dataSource } = await inquirer.prompt([
      {
        type: 'list',
        name: 'dataSource',
        message: '請選擇數據源：',
        choices: availableDataSources.map(d => ({
          name: `${d.name} - ${d.description}`,
          value: d.value,
          short: d.name
        }))
      }
    ]);

    // 獲取選擇的配置
    const selectedTrader = availableTraders.find(t => t.value === trader);
    const selectedStrategy = availableStrategies.find(s => s.value === strategy);
    const selectedConfig = availableConfigs.find(c => c.value === config);
    const selectedDataSource = availableDataSources.find(d => d.value === dataSource);

    if (!selectedTrader || !selectedStrategy || !selectedConfig || !selectedDataSource) {
      throw new Error('找不到選擇的配置');
    }

    // 顯示選擇的配置
    logger.writeLog('\n選擇的配置：', 'System');
    logger.writeLog(`交易者：${selectedTrader.name}`, 'System');
    logger.writeLog(`策略：${selectedStrategy.name}`, 'System');
    logger.writeLog(`配置：${selectedConfig.name}`, 'System');
    logger.writeLog(`數據源：${selectedDataSource.name}\n`, 'System');

    // 初始化交易者
    const configInstance = selectedConfig.config;
    logger.writeLog(`交易對: ${configInstance.symbol}`, 'System');
    const traderInstance = new selectedTrader.instance(configInstance);
    await traderInstance.initialize();
    logger.writeLog('交易所初始化成功', 'System');

    // 初始化策略
    const strategyInstance = new selectedStrategy.instance(configInstance, traderInstance);
    
    // 初始化數據源
    const ws = await selectedDataSource.instance.wsDataSource(configInstance, strategyInstance);

    // 處理程式終止
    process.on('SIGINT', () => {
      logger.writeLog('程式被手動停止', 'System');
      if (ws) {
        ws.close();
      }
      process.exit();
    });

  } catch (error) {
    logger.writeLog(`執行過程中發生錯誤：${error instanceof Error ? error.message : String(error)}`, 'System');
    process.exit(1);
  }
};

main();
