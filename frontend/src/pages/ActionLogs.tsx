import { useEffect, useState } from 'react';
import { HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineMinusCircle } from 'react-icons/hi';
import { actionsAPI } from '../services/api';
import useSocket from '../hooks/useSocket';
import ProviderBadge from '../components/ProviderBadge';

interface LogEntry {
  _id: string;
  actionId: string;
  actionName: string;
  provider: string;
  cardUID: string;
  userId?: { _id: string; name: string } | null;
  status: 'success' | 'failed' | 'skipped';
  error?: string | null;
  durationMs: number;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ActionLogs() {
  const { actionEvents } = useSocket();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterCardUID, setFilterCardUID] = useState('');

  const loadLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page, limit: 25 };
      if (filterStatus) params.status = filterStatus;
      if (filterProvider) params.provider = filterProvider;
      if (filterCardUID) params.cardUID = filterCardUID;

      const res = await actionsAPI.getLogs(params as any);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, pages: 0 });
    } catch {
      console.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [filterStatus, filterProvider]);

  // Auto-refresh on new action events
  useEffect(() => {
    if (actionEvents.length > 0) {
      loadLogs(pagination.page);
    }
  }, [actionEvents.length]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <HiOutlineCheckCircle style={{ color: 'var(--color-granted)' }} />;
      case 'failed': return <HiOutlineXCircle style={{ color: 'var(--color-denied)' }} />;
      case 'skipped': return <HiOutlineMinusCircle style={{ color: 'var(--color-unknown)' }} />;
      default: return null;
    }
  };

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Action Logs</h1>
      <p className="page-subtitle">Execution history for all smart home actions</p>

      {/* Filters */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-input form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 150 }}
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <input
            className="form-input"
            value={filterCardUID}
            onChange={(e) => setFilterCardUID(e.target.value.toUpperCase())}
            placeholder="Filter by Card UID..."
            style={{ width: 180, fontFamily: 'monospace' }}
            onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => loadLogs()} title="Refresh">
            <HiOutlineRefresh />
          </button>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {pagination.total} total entries
        </span>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Provider</th>
              <th>Card UID</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="animate-pulse">Loading logs...</div>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="icon">📋</div>
                    <h3>No execution logs yet</h3>
                    <p>Logs appear here when smart home actions are triggered by card taps</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatTime(log.timestamp)}</td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{log.actionName}</span>
                  </td>
                  <td>
                    <ProviderBadge provider={log.provider} size="sm" showLabel={false} />
                  </td>
                  <td>
                    <code style={{ color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{log.cardUID}</code>
                  </td>
                  <td>
                    <span className={`badge ${log.status === 'success' ? 'active' : log.status === 'failed' ? 'inactive' : 'unknown'}`} style={{ gap: 4 }}>
                      {statusIcon(log.status)}
                      {log.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {log.durationMs}ms
                  </td>
                  <td style={{ fontSize: '0.8rem', color: log.error ? 'var(--color-denied)' : 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.error || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => loadLogs(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => loadLogs(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
