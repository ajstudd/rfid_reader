interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export default function ToggleSwitch({ checked, onChange, disabled, label, id }: ToggleSwitchProps) {
  const switchId = id || `toggle-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <label className={`toggle-switch ${disabled ? 'disabled' : ''}`} htmlFor={switchId}>
      <input
        type="checkbox"
        id={switchId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-slider" />
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}
