/**
 * Simple console logger with timestamps and categories.
 */

export const log = {
  info: (category: string, message: string, ...args: unknown[]) => {
    console.log(`[${new Date().toISOString()}] [${category}] ${message}`, ...args);
  },
  error: (category: string, message: string, ...args: unknown[]) => {
    console.error(`[${new Date().toISOString()}] [${category}] ERROR: ${message}`, ...args);
  },
  warn: (category: string, message: string, ...args: unknown[]) => {
    console.warn(`[${new Date().toISOString()}] [${category}] WARN: ${message}`, ...args);
  },
};

export default log;
