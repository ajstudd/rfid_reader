import { NavLink, useLocation } from 'react-router-dom';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineCreditCard, HiOutlineClipboardList, HiOutlineChip, HiOutlineLightningBolt, HiOutlineDocumentText, HiOutlineLogout } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HiOutlineViewGrid /> },
  { path: '/users', label: 'Users', icon: <HiOutlineUsers /> },
  { path: '/cards', label: 'Cards', icon: <HiOutlineCreditCard /> },
  { path: '/logs', label: 'Access Logs', icon: <HiOutlineClipboardList /> },
  { path: '/devices', label: 'Devices', icon: <HiOutlineChip /> },
  { path: '/smart-home', label: 'Smart Home', icon: <HiOutlineLightningBolt /> },
  { path: '/action-logs', label: 'Action Logs', icon: <HiOutlineDocumentText /> },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">⚡</div>
        <div className="brand-text">
          <h2>Synexis</h2>
          <span>Smart System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">General</div>
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label">Automation</div>
        {navItems.slice(5).map((item) => (
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
