import { useEffect, useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { usersAPI } from '../services/api';

interface User {
  _id: string; name: string; email: string; role: string;
  cardUID: string | null; isActive: boolean; createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee' });

  const load = () => usersAPI.getAll().then((r) => setUsers(r.data)).catch(console.error);

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    try {
      if (editUser) {
        await usersAPI.update(editUser._id, form);
      } else {
        await usersAPI.create(form);
      }
      setShowModal(false);
      setEditUser(null);
      setForm({ name: '', email: '', role: 'employee' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await usersAPI.delete(id);
    load();
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, role: u.role });
    setShowModal(true);
  };

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Users</h1>
      <p className="page-subtitle">Manage users and their access permissions</p>

      <div className="toolbar">
        <div></div>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setForm({ name: '', email: '', role: 'employee' }); setShowModal(true); }}>
          <HiOutlinePlus /> Add User
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Card UID</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.filter(u => u.role !== 'admin').map((u) => (
              <tr key={u._id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td><span className="badge active" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td style={{ fontFamily: 'monospace', color: u.cardUID ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {u.cardUID || '—'}
                </td>
                <td><span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}><HiOutlinePencil /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}><HiOutlineTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
            {users.filter(u => u.role !== 'admin').length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><h3>No users yet</h3><p>Add your first user to get started</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editUser ? 'Edit User' : 'Add New User'}</h3>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="employee">Employee</option>
                <option value="visitor">Visitor</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editUser ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
