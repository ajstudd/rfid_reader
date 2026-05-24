import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import log from '../utils/logger';

/**
 * GET /api/users
 * List all users.
 */
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    log.error('USER', 'Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/users/:id
 * Get a single user by ID.
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    log.error('USER', 'Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/users
 * Create a new user.
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role, cardUID } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'name and email are required' });
      return;
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const userData: Record<string, unknown> = { name, email, role };
    if (cardUID) {
      userData.cardUID = cardUID.toUpperCase();
    }

    // If creating an admin, hash a default password
    if (role === 'admin') {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash('admin123', salt);
    }

    const user = await User.create(userData);
    log.info('USER', `Created user: ${name} (${email})`);
    res.status(201).json(user);
  } catch (error) {
    log.error('USER', 'Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/users/:id
 * Update a user.
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role, isActive, cardUID } = req.body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (cardUID !== undefined) updateData.cardUID = cardUID ? cardUID.toUpperCase() : null;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    log.info('USER', `Updated user: ${user.name}`);
    res.json(user);
  } catch (error) {
    log.error('USER', 'Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/users/:id
 * Delete a user.
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    log.info('USER', `Deleted user: ${user.name}`);
    res.json({ message: 'User deleted', user });
  } catch (error) {
    log.error('USER', 'Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
