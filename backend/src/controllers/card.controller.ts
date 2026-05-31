import { Request, Response } from 'express';
import User from '../models/User';
import AccessLog from '../models/AccessLog';
import Device from '../models/Device';
import { emitCardTap, emitDeviceStatus } from '../services/socket.service';
import { executeActions } from '../services/smarthome/executor';
import log from '../utils/logger';

/**
 * POST /api/cards/validate
 * Called by ESP32 when a card is tapped.
 */
export const validateCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, deviceId, timestamp } = req.body;

    if (!uid || !deviceId) {
      res.status(400).json({ error: 'uid and deviceId are required' });
      return;
    }

    log.info('CARD', `Tap received: UID=${uid} Device=${deviceId}`);

    // Update device last seen
    await Device.findOneAndUpdate(
      { deviceId },
      { status: 'online', lastSeen: new Date() },
      { upsert: false }
    );

    // Look up card in users
    const user = await User.findOne({ cardUID: uid.toUpperCase() });

    let status: 'authorized' | 'denied' | 'unknown';
    let action: string;
    let message: string;
    let userName: string | null = null;

    if (!user) {
      status = 'unknown';
      action = 'RED_LED';
      message = 'Unknown card';
      log.warn('CARD', `Unknown card UID: ${uid}`);
    } else if (!user.isActive) {
      status = 'denied';
      action = 'RED_LED';
      message = 'Card disabled';
      userName = user.name;
      log.warn('CARD', `Disabled user attempted access: ${user.name}`);
    } else {
      status = 'authorized';
      action = 'GREEN_LED';
      message = 'Access Granted';
      userName = user.name;
      log.info('CARD', `Access granted: ${user.name} (${uid})`);
    }

    // Log the access event
    const accessLog = await AccessLog.create({
      uid: uid.toUpperCase(),
      userId: user?._id || null,
      deviceId,
      status,
      timestamp: new Date(),
    });

    // Emit real-time event to dashboard
    emitCardTap({
      uid: uid.toUpperCase(),
      status,
      userName,
      deviceId,
      timestamp: accessLog.timestamp,
    });

    // Fire smart home actions (non-blocking — don't delay ESP32 response)
    executeActions({
      cardUID: uid.toUpperCase(),
      userId: user?._id?.toString() || null,
      status,
      userName,
      deviceId,
    }).catch((err) => log.error('ACTIONS', 'Execution failed:', err));

    res.json({
      authorized: status === 'authorized',
      action,
      message,
      userName: userName || undefined,
    });
  } catch (error) {
    log.error('CARD', 'Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/cards/register
 * Assign a card UID to an existing user.
 */
export const registerCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, userId } = req.body;

    if (!uid || !userId) {
      res.status(400).json({ error: 'uid and userId are required' });
      return;
    }

    // Check if UID is already assigned
    const existing = await User.findOne({ cardUID: uid.toUpperCase() });
    if (existing) {
      res.status(409).json({
        error: 'Card UID already assigned',
        assignedTo: existing.name,
      });
      return;
    }

    // Assign card to user
    const user = await User.findByIdAndUpdate(
      userId,
      { cardUID: uid.toUpperCase() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    log.info('CARD', `Card ${uid} registered to ${user.name}`);
    res.json({ message: 'Card registered successfully', user });
  } catch (error) {
    log.error('CARD', 'Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/cards/unregister/:userId
 * Remove card assignment from a user.
 */
export const unregisterCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { cardUID: null },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    log.info('CARD', `Card unregistered from ${user.name}`);
    res.json({ message: 'Card unregistered', user });
  } catch (error) {
    log.error('CARD', 'Unregister error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
