import { Request, Response } from 'express';
import AccessLog from '../models/AccessLog';
import log from '../utils/logger';

/**
 * GET /api/logs
 * Get access logs with pagination and optional filters.
 * Query params: page, limit, uid, deviceId, status
 */
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (req.query.uid) filter.uid = (req.query.uid as string).toUpperCase();
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;
    if (req.query.status) filter.status = req.query.status;

    const [logs, total] = await Promise.all([
      AccessLog.find(filter)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AccessLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    log.error('LOG', 'Error fetching logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/logs/stats
 * Get summary stats for dashboard.
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, authorizedToday, deniedToday, unknownToday] = await Promise.all([
      AccessLog.countDocuments({ timestamp: { $gte: today } }),
      AccessLog.countDocuments({ timestamp: { $gte: today }, status: 'authorized' }),
      AccessLog.countDocuments({ timestamp: { $gte: today }, status: 'denied' }),
      AccessLog.countDocuments({ timestamp: { $gte: today }, status: 'unknown' }),
    ]);

    res.json({
      today: {
        total: totalToday,
        authorized: authorizedToday,
        denied: deniedToday,
        unknown: unknownToday,
      },
    });
  } catch (error) {
    log.error('LOG', 'Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
