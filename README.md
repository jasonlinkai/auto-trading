# Auto Trading System

這是一個基於 Node.js 的自動交易系統，目前支援 BitMEX 交易所的 EMA 交叉策略交易。系統採用模組化設計，支援擴展不同的數據源和交易策略。

## 功能特點

- 支援 BitMEX 交易所的實時數據訂閱
- 實現 EMA 交叉交易策略
- 模組化設計，易於擴展
- 完整的風險控制機制
- 詳細的交易日誌記錄

## 系統要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 安裝步驟

1. 克隆專案
```bash
git clone https://github.com/jasonlinkai/auto-trading.git
cd auto-trading
```

2. 安裝依賴
```bash
npm install
```

3. 配置環境變數
```bash
cp .env.example .env
```
編輯 `.env` 文件，填入你的 BitMEX API 密鑰：
```
BITMEX_API_KEY=your_api_key_here
BITMEX_API_SECRET=your_api_secret_here
```

## 專案結構

```
auto-trading/
├── ema_cross_strategy_v1.0.js  # EMA 交叉策略主程式
├── trading.js                  # 交易核心邏輯
├── utils/                      # 工具函數
├── logs/                       # 日誌文件
├── .env                        # 環境變數配置
├── .env.example               # 環境變數範例
└── package.json               # 專案配置
```

## 配置說明

在 `ema_cross_strategy_v1.0.js` 中可以修改以下配置：

```javascript
const config = {
  apiKey: process.env.BITMEX_API_KEY,
  apiSecret: process.env.BITMEX_API_SECRET,
  test: true,              // 是否使用測試網
  symbol: 'XBTUSD',        // 交易對
  qty: 100,               // 交易數量
  leverage: 1,            // 槓桿倍數
  profitTarget: 900,      // 止盈點
  stopLoss: 300,          // 止損點
  maxPositions: 1,        // 最大持倉數
  maxDailyLoss: 500,      // 每日最大虧損
  riskPerTrade: 100,      // 每筆交易風險
  fastPeriod: 20,         // 快速 EMA 週期
  slowPeriod: 120,        // 慢速 EMA 週期
  interval: '5m'          // K線週期
};
```

## 使用方法

1. 啟動交易系統
```bash
npm start
```

2. 停止交易系統
按 `Ctrl+C` 可以安全地停止系統

## 依賴套件

- ccxt: 加密貨幣交易所 API 整合
- dotenv: 環境變數管理
- node-schedule: 排程任務管理
- technicalindicators: 技術指標計算
- ws: WebSocket 客戶端

## 風險提示

- 本系統僅供學習和研究使用
- 實盤交易具有風險，請謹慎使用
- 建議先在測試網進行充分測試
- 請確保理解所有配置參數的含義

## 日誌

系統運行日誌保存在 `logs` 目錄下，包含：
- 交易執行記錄
- 錯誤信息
- 系統狀態

## 貢獻指南

歡迎提交 Issue 和 Pull Request 來改進系統。

## 授權

MIT License 