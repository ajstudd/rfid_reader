import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CardTapEvent {
  uid: string;
  status: 'authorized' | 'denied' | 'unknown';
  userName: string | null;
  deviceId: string;
  timestamp: string;
}

export interface DeviceStatusEvent {
  deviceId: string;
  status: 'online' | 'offline';
}

export interface ActionExecutedEvent {
  actionId: string;
  actionName: string;
  provider: string;
  cardUID: string;
  userName: string | null;
  status: 'success' | 'failed';
  message: string;
  durationMs: number;
  timestamp: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cardTaps, setCardTaps] = useState<CardTapEvent[]>([]);
  const [deviceUpdates, setDeviceUpdates] = useState<DeviceStatusEvent[]>([]);
  const [actionEvents, setActionEvents] = useState<ActionExecutedEvent[]>([]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('card:tap', (data: CardTapEvent) => {
      setCardTaps((prev) => [data, ...prev].slice(0, 100));
    });

    socket.on('device:status', (data: DeviceStatusEvent) => {
      setDeviceUpdates((prev) => [data, ...prev].slice(0, 20));
    });

    socket.on('action:executed', (data: ActionExecutedEvent) => {
      setActionEvents((prev) => [data, ...prev].slice(0, 50));
    });

    return () => { socket.disconnect(); };
  }, []);

  const clearTaps = useCallback(() => setCardTaps([]), []);
  const clearActionEvents = useCallback(() => setActionEvents([]), []);

  return { isConnected, cardTaps, deviceUpdates, actionEvents, clearTaps, clearActionEvents };
}

export default useSocket;
