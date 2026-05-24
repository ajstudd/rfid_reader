import { useEffect, useState } from 'react';
import { devicesAPI } from '../services/api';

interface Device {
  _id: string; deviceId: string; name: string; location: string;
  status: string; lastSeen: string;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    devicesAPI.getAll().then((r) => setDevices(r.data)).catch(console.error);
  }, []);

  const formatDate = (ts: string) => ts ? new Date(ts).toLocaleString() : 'Never';

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Devices</h1>
      <p className="page-subtitle">Monitor ESP32 reader devices</p>

      <div className="stats-grid">
        {devices.map((d) => (
          <div className="glass-card" key={d._id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{d.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{d.location}</p>
              </div>
              <span className={`badge ${d.status}`}><span className="badge-dot"></span>{d.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{d.deviceId}</span></span>
              <span>Last seen: {formatDate(d.lastSeen)}</span>
            </div>
          </div>
        ))}
        {devices.length === 0 && (
          <div className="glass-card">
            <div className="empty-state">
              <div className="icon">📡</div>
              <h3>No devices registered</h3>
              <p>Devices are auto-created when ESP32 first connects</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
