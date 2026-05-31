import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import connectDB from './config/db';
import { initSocket } from './services/socket.service';
import cardRoutes from './routes/card.routes';
import userRoutes from './routes/user.routes';
import logRoutes from './routes/log.routes';
import deviceRoutes from './routes/device.routes';
import authRoutes from './routes/auth.routes';
import actionRoutes from './routes/action.routes';
import { initProviders } from './services/smarthome/registry';
import User from './models/User';
import Device from './models/Device';
import bcrypt from 'bcryptjs';
import log from './utils/logger';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    log.info('HTTP', `${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/api/cards', cardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/actions', actionRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * Seed initial admin user and default device on first run.
 */
async function seedDatabase() {
  try {
    // Seed admin user
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        salt
      );

      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@rfidauth.local',
        role: 'admin',
        password: hashedPassword,
        isActive: true,
      });

      log.info('SEED', 'Admin user created');
      log.info('SEED', `  Email: ${process.env.ADMIN_EMAIL || 'admin@rfidauth.local'}`);
      log.info('SEED', `  Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    }

    // Seed default device (gate-01)
    const deviceExists = await Device.findOne({ deviceId: 'gate-01' });
    if (!deviceExists) {
      await Device.create({
        deviceId: 'gate-01',
        name: 'Main Gate',
        location: 'Main Entrance',
        apiKey: process.env.DEVICE_API_KEY || 'esp32-secret-key',
        status: 'offline',
      });

      log.info('SEED', 'Default device (gate-01) created');
    }
  } catch (error) {
    log.error('SEED', 'Seeding error:', error);
  }
}

// Start server
async function start() {
  await connectDB();
  await seedDatabase();

  // Initialize smart home providers
  initProviders();

  // Initialize Socket.IO
  initSocket(server);

  server.listen(PORT, () => {
    log.info('SERVER', `🚀 Backend running on http://localhost:${PORT}`);
    log.info('SERVER', `   Health: http://localhost:${PORT}/health`);
    log.info('SERVER', `   API:    http://localhost:${PORT}/api`);
  });
}

start().catch((error) => {
  log.error('SERVER', 'Failed to start:', error);
  process.exit(1);
});
