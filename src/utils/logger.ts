import fs from 'fs';
import path from 'path';

class Logger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  writeLog(message: string, className?: string): void {
    const timestamp = new Date().toISOString();
    const classTag = className ? `[${className}] ` : '';
    const logMessage = `[${timestamp}] ${classTag}${message}\n`;
    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);

    fs.appendFileSync(logFile, logMessage);
    console.log(`${classTag}${message}`);
  }
}

export const logger = new Logger(); 