const fs = require("fs");
const path = require("path");

class Logger {
  constructor() {
    // 創建日誌目錄
    this.logDir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }

    // 創建日誌文件
    this.logFile = path.join(
      this.logDir,
      `trading_${new Date().toISOString().split("T")[0]}.log`
    );
  }

  writeLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logMessage);
  }

  // 獲取日誌文件路徑
  getLogFilePath() {
    return this.logFile;
  }

  // 獲取日誌目錄路徑
  getLogDirPath() {
    return this.logDir;
  }
}

// 創建單例實例
const logger = new Logger();
module.exports = logger;
