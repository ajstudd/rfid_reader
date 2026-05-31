import { useEffect, useState } from 'react';
import { HiOutlinePlus, HiOutlineLightningBolt, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';
import { actionsAPI, usersAPI } from '../services/api';
import useSocket from '../hooks/useSocket';
import useToast from '../hooks/useToast';
import ToastContainer from '../components/Toast';
import ActionCard from '../components/ActionCard';
import ProviderBadge from '../components/ProviderBadge';
import DynamicConfigForm from '../components/DynamicConfigForm';
import type { ConfigFieldSchema } from '../components/DynamicConfigForm';
import type { ActionExecutedEvent } from '../hooks/useSocket';

interface ProviderInfo {
  name: string;
  displayName: string;
  supportedActions: string[];
  configSchema: ConfigFieldSchema[];
}

interface SmartAction {
  _id: string;
  name: string;
  provider: string;
  action: string;
  trigger: string;
  cardUID?: string | null;
  userId?: { _id: string; name: string } | string | null;
  config: Record<string, unknown>;
  isEnabled: boolean;
  priority: number;
  cooldownMs: number;
  lastExecuted?: string | null;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
  cardUID: string | null;
}

export default function SmartActions() {
  const { actionEvents, isConnected } = useSocket();
  const { toasts, removeToast, success, error, info } = useToast();

  const [actions, setActions] = useState<SmartAction[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState(1);

  // Form state
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formAction, setFormAction] = useState('');
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>({});
  const [formCardUID, setFormCardUID] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formTrigger, setFormTrigger] = useState('on_authorized');
  const [formPriority, setFormPriority] = useState(10);
  const [formCooldown, setFormCooldown] = useState(2000);

  // Filter state
  const [filterProvider, setFilterProvider] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [actionsRes, providersRes, usersRes] = await Promise.all([
        actionsAPI.getAll(),
        actionsAPI.getProviders(),
        usersAPI.getAll(),
      ]);
      setActions(actionsRes.data.actions || []);
      setProviders(providersRes.data.providers || []);
      setUsers(usersRes.data || []);
    } catch {
      error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Auto-refresh when new action events come in
  useEffect(() => {
    if (actionEvents.length > 0) {
      loadData();
    }
  }, [actionEvents.length]);

  const selectedProvider = providers.find((p) => p.name === formProvider);

  const resetForm = () => {
    setFormName('');
    setFormProvider('');
    setFormAction('');
    setFormConfig({});
    setFormCardUID('');
    setFormUserId('');
    setFormTrigger('on_authorized');
    setFormPriority(10);
    setFormCooldown(2000);
    setModalStep(1);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = async (id: string) => {
    try {
      const res = await actionsAPI.getById(id);
      const a = res.data.action;
      setEditingId(id);
      setFormName(a.name);
      setFormProvider(a.provider);
      setFormAction(a.action);
      setFormConfig(a.config || {});
      setFormCardUID(a.cardUID || '');
      setFormUserId(typeof a.userId === 'object' ? a.userId?._id || '' : a.userId || '');
      setFormTrigger(a.trigger);
      setFormPriority(a.priority);
      setFormCooldown(a.cooldownMs);
      setModalStep(1);
      setShowModal(true);
    } catch {
      error('Failed to load action details');
    }
  };

  const handleSave = async () => {
    if (!formName || !formProvider || !formAction) {
      error('Name, provider, and action are required');
      return;
    }
    if (!formCardUID && !formUserId) {
      error('Either Card UID or User is required');
      return;
    }

    const data = {
      name: formName,
      provider: formProvider,
      action: formAction,
      config: formConfig,
      cardUID: formCardUID || null,
      userId: formUserId || null,
      trigger: formTrigger,
      priority: formPriority,
      cooldownMs: formCooldown,
    };

    try {
      if (editingId) {
        await actionsAPI.update(editingId, data);
        success('Action updated successfully');
      } else {
        await actionsAPI.create(data);
        success('Action created successfully');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.validationErrors?.join(', ') || 'Failed to save action';
      error(msg);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await actionsAPI.update(id, { isEnabled: enabled });
      setActions((prev) => prev.map((a) => (a._id === id ? { ...a, isEnabled: enabled } : a)));
      info(enabled ? 'Action enabled' : 'Action disabled');
    } catch {
      error('Failed to update action');
    }
  };

  const handleTestFire = async (id: string) => {
    setTestingId(id);
    try {
      const res = await actionsAPI.testFire(id);
      if (res.data.success) {
        success(`Test fire succeeded (${res.data.durationMs}ms)`);
      } else {
        error(`Test fire failed: ${res.data.result?.message || 'Unknown error'}`);
      }
    } catch {
      error('Test fire request failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this action?')) return;
    try {
      await actionsAPI.delete(id);
      success('Action deleted');
      loadData();
    } catch {
      error('Failed to delete action');
    }
  };

  // Filtering
  const filteredActions = actions.filter((a) => {
    if (filterProvider && a.provider !== filterProvider) return false;
    if (filterEnabled === 'true' && !a.isEnabled) return false;
    if (filterEnabled === 'false' && a.isEnabled) return false;
    return true;
  });

  return (
    <div className="page-wrapper">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Smart Home</h1>
        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: isConnected ? 'var(--color-success)' : 'var(--text-muted)' }}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      <p className="page-subtitle">Manage actions triggered by card taps</p>

      {/* Toolbar */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-input form-select"
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.name} value={p.name}>{p.displayName}</option>
            ))}
          </select>
          <select
            className="form-input form-select"
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
            style={{ width: 140 }}
          >
            <option value="">All Status</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh">
            <HiOutlineRefresh />
          </button>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <HiOutlinePlus /> New Action
        </button>
      </div>

      {/* Actions Grid */}
      {loading ? (
        <div className="empty-state">
          <div className="animate-pulse" style={{ fontSize: '1.1rem' }}>Loading actions...</div>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="icon">⚡</div>
            <h3>{actions.length === 0 ? 'No actions configured' : 'No matching actions'}</h3>
            <p>
              {actions.length === 0
                ? 'Create your first smart home action to get started'
                : 'Try adjusting your filters'}
            </p>
            {actions.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                <HiOutlinePlus /> Create First Action
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="actions-grid">
          {filteredActions.map((action) => (
            <ActionCard
              key={action._id}
              action={action}
              onToggleEnabled={handleToggleEnabled}
              onTestFire={handleTestFire}
              onEdit={openEdit}
              onDelete={handleDelete}
              isTestFiring={testingId === action._id}
            />
          ))}
        </div>
      )}

      {/* Live Activity Feed */}
      {actionEvents.length > 0 && (
        <div className="glass-card" style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 16, fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineLightningBolt style={{ color: 'var(--accent)' }} />
            Activity
          </h3>
          <div className="live-feed" style={{ maxHeight: 300 }}>
            {actionEvents.slice(0, 20).map((evt: ActionExecutedEvent, i: number) => (
              <div className="feed-item" key={`${evt.actionId}-${evt.timestamp}-${i}`}>
                <div className={`feed-avatar ${evt.status === 'success' ? 'granted' : 'denied'}`}>
                  {evt.status === 'success' ? '✓' : '✗'}
                </div>
                <div className="feed-info">
                  <div className="feed-name">{evt.actionName}</div>
                  <div className="feed-detail">
                    {evt.provider} · {evt.cardUID} {evt.userName ? `· ${evt.userName}` : ''}
                  </div>
                </div>
                <span className={`badge ${evt.status === 'success' ? 'active' : 'inactive'}`}>
                  {evt.status}
                </span>
                <span className="feed-time">{evt.durationMs}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Action' : 'Create Action'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>
                <HiOutlineX />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="step-indicator">
              {['Provider', 'Action', 'Config', 'Binding'].map((label, i) => (
                <div
                  key={label}
                  className={`step ${modalStep === i + 1 ? 'active' : ''} ${modalStep > i + 1 ? 'completed' : ''}`}
                  onClick={() => {
                    // Allow jumping back to previous steps
                    if (i + 1 < modalStep) setModalStep(i + 1);
                  }}
                >
                  <span className="step-number">{modalStep > i + 1 ? '✓' : i + 1}</span>
                  <span className="step-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Step 1: Provider Selection */}
            {modalStep === 1 && (
              <div className="modal-body">
                <p className="form-label" style={{ marginBottom: 16 }}>Choose a provider</p>
                <div className="provider-grid">
                  {providers.map((p) => (
                    <div
                      key={p.name}
                      className={`provider-card ${formProvider === p.name ? 'selected' : ''}`}
                      onClick={() => {
                        setFormProvider(p.name);
                        setFormAction('');
                        setFormConfig({});
                      }}
                    >
                      <ProviderBadge provider={p.name} displayName={p.displayName} size="lg" showLabel={false} />
                      <span className="provider-card-name">{p.displayName}</span>
                      <span className="provider-card-count">{p.supportedActions.length} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Action Selection */}
            {modalStep === 2 && selectedProvider && (
              <div className="modal-body">
                <p className="form-label" style={{ marginBottom: 16 }}>
                  Select action for {selectedProvider.displayName}
                </p>
                <div className="action-select-grid">
                  {selectedProvider.supportedActions.map((act) => (
                    <div
                      key={act}
                      className={`action-select-item ${formAction === act ? 'selected' : ''}`}
                      onClick={() => setFormAction(act)}
                    >
                      <span className="action-select-name">{act.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Config Form */}
            {modalStep === 3 && selectedProvider && (
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Action Name<span className="required-mark">*</span></label>
                  <input
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Toggle Bedroom Light"
                  />
                </div>
                <DynamicConfigForm
                  schema={selectedProvider.configSchema}
                  values={formConfig}
                  onChange={setFormConfig}
                />
              </div>
            )}

            {/* Step 4: Binding */}
            {modalStep === 4 && (
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Card UID</label>
                  <input
                    className="form-input"
                    value={formCardUID}
                    onChange={(e) => setFormCardUID(e.target.value.toUpperCase())}
                    placeholder="e.g. A7BB9731"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <span className="form-hint">The RFID card that triggers this action</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Or assign to user</label>
                  <select
                    className="form-input form-select"
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                  >
                    <option value="">Select user (optional)...</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.cardUID ? `(${u.cardUID})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trigger</label>
                  <select
                    className="form-input form-select"
                    value={formTrigger}
                    onChange={(e) => setFormTrigger(e.target.value)}
                  >
                    <option value="on_authorized">On Authorized (green LED)</option>
                    <option value="on_denied">On Denied (red LED)</option>
                    <option value="on_any">On Any Tap</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <input
                      className="form-input"
                      type="number"
                      value={formPriority}
                      onChange={(e) => setFormPriority(Number(e.target.value))}
                      min={1}
                      max={100}
                    />
                    <span className="form-hint">Lower = runs first</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cooldown (ms)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={formCooldown}
                      onChange={(e) => setFormCooldown(Number(e.target.value))}
                      min={0}
                      step={500}
                    />
                    <span className="form-hint">Min delay between fires</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="modal-actions">
              {modalStep > 1 && (
                <button className="btn btn-secondary" onClick={() => setModalStep(modalStep - 1)}>
                  Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              {modalStep < 4 ? (
                <button
                  className="btn btn-primary"
                  disabled={
                    (modalStep === 1 && !formProvider) ||
                    (modalStep === 2 && !formAction) ||
                    (modalStep === 3 && !formName)
                  }
                  onClick={() => setModalStep(modalStep + 1)}
                >
                  Next
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={!formName || !formProvider || !formAction || (!formCardUID && !formUserId)}
                  onClick={handleSave}
                >
                  {editingId ? 'Save Changes' : 'Create Action'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
