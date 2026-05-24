import { NavLink, useLocation } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineCreditCard, HiOutlineClipboardList, HiOutlineChip, HiOutlineLogout } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HiOutlineViewGrid /> },
  { path: '/users', label: 'Users', icon: <HiOutlineUsers /> },
  { path: '/cards', label: 'Cards', icon: <HiOutlineCreditCard /> },
  { path: '/logs', label: 'Access Logs', icon: <HiOutlineClipboardList /> },
  { path: '/devices', label: 'Devices', icon: <HiOutlineChip /> },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🔐</div>
        <div className="brand-text">
          <h2>RFID Auth</h2>
          <span>Smart Access</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.charAt(0) || 'A'}</div>
          <div className="user-details">
            <span className="user-name">{user?.name || 'Admin'}</span>
            <span className="user-role">{user?.role || 'admin'}</span>
          </div>
        </div>
        <button className="btn-icon logout-btn" onClick={logout} title="Logout">
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  );
}
