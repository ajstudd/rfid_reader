import { useState } from 'react';
import ToggleSwitch from './ToggleSwitch';

export interface ConfigFieldSchema {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
}

interface DynamicConfigFormProps {
  schema: ConfigFieldSchema[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function DynamicConfigForm({ schema, values, onChange, disabled }: DynamicConfigFormProps) {
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  const renderField = (field: ConfigFieldSchema) => {
    const currentValue = values[field.key] ?? field.default ?? '';

    switch (field.type) {
      case 'string':
        return (
          <input
            className="form-input"
            type="text"
            value={String(currentValue)}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.description || field.label}
            disabled={disabled}
            id={`config-${field.key}`}
          />
        );

      case 'number':
        return (
          <input
            className="form-input"
            type="number"
            value={currentValue === '' ? '' : Number(currentValue)}
            onChange={(e) => handleChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.description || field.label}
            disabled={disabled}
            id={`config-${field.key}`}
          />
        );

      case 'boolean':
        return (
          <ToggleSwitch
            checked={Boolean(currentValue)}
            onChange={(checked) => handleChange(field.key, checked)}
            disabled={disabled}
            id={`config-${field.key}`}
          />
        );

      case 'select':
        return (
          <select
            className="form-input form-select"
            value={String(currentValue)}
            onChange={(e) => handleChange(field.key, e.target.value)}
            disabled={disabled}
            id={`config-${field.key}`}
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'color':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="color"
              className="color-picker"
              value={String(currentValue || '#ffffff')}
              onChange={(e) => handleChange(field.key, e.target.value)}
              disabled={disabled}
              id={`config-${field.key}`}
            />
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {String(currentValue || '#ffffff').toUpperCase()}
            </span>
          </div>
        );

      case 'json':
        return (
          <>
            <textarea
              className="form-input json-editor"
              value={typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2)}
              onChange={(e) => {
                const raw = e.target.value;
                try {
                  const parsed = JSON.parse(raw);
                  handleChange(field.key, parsed);
                  setJsonErrors((prev) => ({ ...prev, [field.key]: '' }));
                } catch {
                  handleChange(field.key, raw);
                  setJsonErrors((prev) => ({ ...prev, [field.key]: 'Invalid JSON' }));
                }
              }}
              rows={4}
              placeholder='{ "key": "value" }'
              disabled={disabled}
              id={`config-${field.key}`}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
            {jsonErrors[field.key] && (
              <span style={{ color: 'var(--color-denied)', fontSize: '0.7rem', marginTop: 4, display: 'block' }}>
                {jsonErrors[field.key]}
              </span>
            )}
          </>
        );

      default:
        return (
          <input
            className="form-input"
            type="text"
            value={String(currentValue)}
            onChange={(e) => handleChange(field.key, e.target.value)}
            disabled={disabled}
            id={`config-${field.key}`}
          />
        );
    }
  };

  if (schema.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
        No configuration required for this provider.
      </div>
    );
  }

  return (
    <div className="dynamic-config-form">
      {schema.map((field) => (
        <div className="form-group" key={field.key}>
          <label className="form-label" htmlFor={`config-${field.key}`}>
            {field.label}
            {field.required && <span className="required-mark">*</span>}
          </label>
          {renderField(field)}
          {field.description && field.type !== 'json' && (
            <span className="form-hint">{field.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}
