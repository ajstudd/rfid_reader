import { useEffect, useState } from 'react';
import { HiOutlineCreditCard, HiOutlineShieldCheck, HiOutlineShieldExclamation, HiOutlineQuestionMarkCircle } from 'react-icons/hi';
import { logsAPI } from '../services/api';
import useSocket from '../hooks/useSocket';
import type { CardTapEvent } from '../hooks/useSocket';

export default function Dashboard() {
  const { cardTaps, isConnected } = useSocket();
  const [stats, setStats] = useState({ total: 0, authorized: 0, denied: 0, unknown: 0 });

  useEffect(() => {
    logsAPI.getStats().then((res) => setStats(res.data.today)).catch(console.error);
  }, []);

  // Update stats when new taps come in
  useEffect(() => {
    if (cardTaps.length > 0) {
      logsAPI.getStats().then((res) => setStats(res.data.today)).catch(console.error);
    }
  }, [cardTaps.length]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Dashboard</h1>
        <span className={`badge ${isConnected ? 'online' : 'offline'}`}>
          <span className="badge-dot"></span>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      <p className="page-subtitle">Real-time access monitoring overview</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineCreditCard /></div>
          <div className="stat-info"><h3>{stats.total}</h3><p>Total Scans Today</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineShieldCheck /></div>
          <div className="stat-info"><h3>{stats.authorized}</h3><p>Authorized</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineShieldExclamation /></div>
          <div className="stat-info"><h3>{stats.denied}</h3><p>Denied</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><HiOutlineQuestionMarkCircle /></div>
          <div className="stat-info"><h3>{stats.unknown}</h3><p>Unknown Cards</p></div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 600 }}>Live Activity Feed</h3>
        <div className="live-feed">
          {cardTaps.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📡</div>
              <h3>Waiting for card taps...</h3>
              <p>Tap an RFID card on the ESP32 reader to see events here</p>
            </div>
          ) : (
            cardTaps.map((tap: CardTapEvent, i: number) => (
              <div className="feed-item" key={`${tap.uid}-${tap.timestamp}-${i}`}>
                <div className={`feed-avatar ${tap.status}`}>
                  {tap.status === 'authorized' ? '✓' : tap.status === 'denied' ? '✗' : '?'}
                </div>
                <div className="feed-info">
                  <div className="feed-name">{tap.userName || 'Unknown Card'}</div>
                  <div className="feed-detail">UID: {tap.uid} · {tap.deviceId}</div>
                </div>
                <span className={`badge ${tap.status}`}>{tap.status}</span>
                <span className="feed-time">{formatTime(tap.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
