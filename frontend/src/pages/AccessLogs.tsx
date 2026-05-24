import { useEffect, useState } from 'react';
import { logsAPI } from '../services/api';

interface LogEntry {
  _id: string; uid: string; userId: { name: string; email: string } | null;
  deviceId: string; status: string; timestamp: string;
}

export default function AccessLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    logsAPI.getAll({ page, limit: 25, status: statusFilter || undefined })
      .then((r) => { setLogs(r.data.logs); setTotalPages(r.data.pagination.pages); })
      .catch(console.error);
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const formatDate = (ts: string) => new Date(ts).toLocaleString();

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Access Logs</h1>
      <p className="page-subtitle">Complete history of all card tap events</p>

      <div className="toolbar">
        <select className="form-input form-select" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="authorized">Authorized</option>
          <option value="denied">Denied</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Time</th><th>Card UID</th><th>User</th><th>Device</th><th>Status</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(l.timestamp)}</td>
                <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{l.uid}</td>
                <td>{l.userId?.name || <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}</td>
                <td>{l.deviceId}</td>
                <td><span className={`badge ${l.status}`}><span className="badge-dot"></span>{l.status}</span></td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state"><h3>No logs found</h3><p>Card tap events will appear here</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ padding: '6px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
