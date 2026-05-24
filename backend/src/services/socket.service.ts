import { Server as SocketServer } from 'socket.io';
import http from 'http';

let io: SocketServer | null = null;

/**
 * Initialize Socket.IO server attached to the HTTP server.
 */
export const initSocket = (server: http.Server): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
};

/**
 * Get the Socket.IO instance for emitting events.
 */
export const getIO = (): SocketServer | null => {
  return io;
};

/**
 * Emit a card tap event to all connected dashboard clients.
 */
export const emitCardTap = (data: {
  uid: string;
  status: string;
  userName: string | null;
  deviceId: string;
  timestamp: Date;
}): void => {
  if (io) {
    io.emit('card:tap', data);
  }
};

/**
 * Emit a device status change to all connected dashboard clients.
 */
export const emitDeviceStatus = (data: {
  deviceId: string;
  status: string;
}): void => {
  if (io) {
    io.emit('device:status', data);
  }
};
