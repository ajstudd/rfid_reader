import { Request, Response, NextFunction } from 'express';

/**
 * Device API key middleware for ESP32 routes.
 * Expects: x-api-key header matching DEVICE_API_KEY env var.
 */
const deviceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = process.env.DEVICE_API_KEY;

  if (!apiKey || apiKey !== validKey) {
    res.status(403).json({ error: 'Invalid device API key' });
    return;
  }

  next();
};

export default deviceMiddleware;
