import { Request, Response } from 'express';
import Device from '../models/Device';
import log from '../utils/logger';

/**
 * GET /api/devices
 * List all registered devices.
 */
export const getDevices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const devices = await Device.find().sort({ lastSeen: -1 });

    // Mark devices as offline if not seen in last 5 minutes
    const OFFLINE_THRESHOLD = 5 * 60 * 1000;
    const now = Date.now();

    const devicesWithStatus = devices.map((device) => {
      const lastSeenMs = device.lastSeen ? device.lastSeen.getTime() : 0;
      const isOnline = now - lastSeenMs < OFFLINE_THRESHOLD;
      return {
        ...device.toObject(),
        status: isOnline ? 'online' : 'offline',
      };
    });

    res.json(devicesWithStatus);
  } catch (error) {
    log.error('DEVICE', 'Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/devices/:id
 * Update device info (name, location).
 */
export const updateDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location } = req.body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;

    const device = await Device.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    log.info('DEVICE', `Updated device: ${device.deviceId}`);
    res.json(device);
  } catch (error) {
    log.error('DEVICE', 'Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
