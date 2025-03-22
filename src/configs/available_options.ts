import { BitmexTrader } from '../traders/bitmex';
import { EmaCrossStrategy } from '../strategies/ema_cross_strategy';
import { bitmex } from '../dataSources';
import { ema_cross_strategy_config_v1 } from './ema_cross_strategy_config_v1';

export interface AvailableOption {
  name: string;
  value: string;
  description: string;
  instance: any;
}

export interface ConfigOption {
  name: string;
  value: string;
  description: string;
  config: any;
}

export const availableTraders: AvailableOption[] = [
  {
    name: 'Bitmex Trader',
    value: 'bitmex',
    description: '使用 Bitmex 交易所進行交易',
    instance: BitmexTrader
  }
  // 未來可以在這裡添加更多交易者
];

export const availableStrategies: AvailableOption[] = [
  {
    name: 'EMA Cross Strategy V1',
    value: 'ema_cross_v1',
    description: '使用 EMA 交叉策略進行交易',
    instance: EmaCrossStrategy
  }
  // 未來可以在這裡添加更多策略
];

export const availableDataSources: AvailableOption[] = [
  {
    name: 'Bitmex WebSocket',
    value: 'bitmex_ws',
    description: '使用 Bitmex WebSocket 即時數據',
    instance: bitmex
  }
  // 未來可以在這裡添加更多數據源
];

export const availableConfigs: ConfigOption[] = [
  {
    name: 'EMA Cross Strategy Config V1',
    value: 'ema_cross_v1',
    description: 'EMA 交叉策略配置 V1 版本',
    config: ema_cross_strategy_config_v1
  }
  // 未來可以在這裡添加更多配置
]; 