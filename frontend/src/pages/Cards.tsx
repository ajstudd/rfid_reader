import { useEffect, useState } from 'react';
import { HiOutlineCreditCard } from 'react-icons/hi';
import { usersAPI, cardsAPI } from '../services/api';

interface User {
  _id: string; name: string; email: string; role: string;
  cardUID: string | null; isActive: boolean;
}

export default function Cards() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [uid, setUid] = useState('');

  const load = () => usersAPI.getAll().then((r) => setUsers(r.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const usersWithCards = users.filter((u) => u.cardUID && u.role !== 'admin');
  const usersWithoutCards = users.filter((u) => !u.cardUID && u.role !== 'admin');

  const handleRegister = async () => {
    if (!uid || !selectedUser) return;
    try {
      await cardsAPI.register(uid, selectedUser);
      setShowModal(false);
      setUid('');
      setSelectedUser('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error registering card');
    }
  };

  const handleUnregister = async (userId: string) => {
    if (!confirm('Unassign this card?')) return;
    await cardsAPI.unregister(userId);
    load();
  };

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Cards</h1>
      <p className="page-subtitle">Manage RFID card assignments</p>

      <div className="toolbar">
        <div></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlineCreditCard /> Register Card
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Card UID</th><th>Assigned To</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {usersWithCards.map((u) => (
              <tr key={u._id}>
                <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontWeight: 600 }}>{u.cardUID}</td>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td><span className="badge active" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td><span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleUnregister(u._id)}>Unassign</button></td>
              </tr>
            ))}
            {usersWithCards.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state"><div className="icon">💳</div><h3>No cards registered</h3><p>Register a card to assign it to a user</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Register Card</h3>
            <div className="form-group">
              <label className="form-label">Card UID</label>
              <input className="form-input" value={uid} onChange={(e) => setUid(e.target.value.toUpperCase())} placeholder="e.g. A7BB9731" style={{ fontFamily: 'monospace' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Assign To User</label>
              <select className="form-input form-select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">Select user...</option>
                {usersWithoutCards.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={!uid || !selectedUser}>Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
