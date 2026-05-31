import { HiOutlinePlay, HiOutlinePencil, HiOutlineTrash, HiOutlineClock } from 'react-icons/hi';
import ProviderBadge from './ProviderBadge';
import ToggleSwitch from './ToggleSwitch';

interface ActionCardProps {
  action: {
    _id: string;
    name: string;
    provider: string;
    action: string;
    trigger: string;
    cardUID?: string | null;
    userId?: { _id: string; name: string } | string | null;
    isEnabled: boolean;
    priority: number;
    cooldownMs: number;
    lastExecuted?: string | null;
  };
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onTestFire: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isTestFiring?: boolean;
}

const triggerLabels: Record<string, { label: string; color: string }> = {
  on_authorized: { label: 'On Authorized', color: 'var(--color-granted)' },
  on_denied: { label: 'On Denied', color: 'var(--color-denied)' },
  on_any: { label: 'On Any Tap', color: 'var(--accent)' },
};

export default function ActionCard({
  action,
  onToggleEnabled,
  onTestFire,
  onEdit,
  onDelete,
  isTestFiring,
}: ActionCardProps) {
  const trigger = triggerLabels[action.trigger] || { label: action.trigger, color: 'var(--text-muted)' };

  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getUserName = () => {
    if (action.userId && typeof action.userId === 'object') return action.userId.name;
    return null;
  };

  return (
    <div className={`action-card ${!action.isEnabled ? 'action-card-disabled' : ''}`}>
      <div className="action-card-header">
        <ProviderBadge provider={action.provider} showLabel={false} size="md" />
        <div className="action-card-title">
          <h4>{action.name}</h4>
          <span className="action-card-action">{action.action}</span>
        </div>
        <ToggleSwitch
          checked={action.isEnabled}
          onChange={(checked) => onToggleEnabled(action._id, checked)}
          id={`action-toggle-${action._id}`}
        />
      </div>

      <div className="action-card-meta">
        <span className="action-card-trigger" style={{ borderColor: `${trigger.color}40`, color: trigger.color, background: `${trigger.color}15` }}>
          {trigger.label}
        </span>
        {action.cardUID && (
          <span className="action-card-uid">
            Card: <code>{action.cardUID}</code>
          </span>
        )}
        {getUserName() && (
          <span className="action-card-uid">
            User: {getUserName()}
          </span>
        )}
      </div>

      <div className="action-card-footer">
        <span className="action-card-time">
          <HiOutlineClock />
          {formatTime(action.lastExecuted)}
        </span>
        <div className="action-card-actions">
          <button
            className="btn btn-sm btn-action-test"
            onClick={() => onTestFire(action._id)}
            disabled={isTestFiring || !action.isEnabled}
            title="Test fire"
          >
            {isTestFiring ? (
              <span className="animate-pulse">⚡</span>
            ) : (
              <HiOutlinePlay />
            )}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(action._id)} title="Edit">
            <HiOutlinePencil />
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(action._id)} title="Delete">
            <HiOutlineTrash />
          </button>
        </div>
      </div>
    </div>
  );
}
