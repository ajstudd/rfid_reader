import type { ReactNode } from 'react';
import { HiOutlineLightningBolt, HiOutlineGlobeAlt, HiOutlineLightBulb, HiOutlineChip, HiOutlineBeaker, HiOutlineWifi } from 'react-icons/hi';

const providerIcons: Record<string, { icon: ReactNode; color: string }> = {
  mock: { icon: <HiOutlineBeaker />, color: '#8b5cf6' },
  webhook: { icon: <HiOutlineGlobeAlt />, color: '#3b82f6' },
  philips_hue: { icon: <HiOutlineLightBulb />, color: '#f59e0b' },
  tuya: { icon: <HiOutlineChip />, color: '#ef4444' },
  kasa: { icon: <HiOutlineWifi />, color: '#10b981' },
  wiz: { icon: <HiOutlineLightBulb />, color: '#06b6d4' },
};

const defaultProvider = { icon: <HiOutlineLightningBolt />, color: '#6366f1' };

interface ProviderBadgeProps {
  provider: string;
  displayName?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ProviderBadge({ provider, displayName, size = 'md', showLabel = true }: ProviderBadgeProps) {
  const { icon, color } = providerIcons[provider] || defaultProvider;

  const sizeMap = { sm: 28, md: 36, lg: 48 };
  const fontMap = { sm: '0.65rem', md: '0.75rem', lg: '0.85rem' };
  const iconFontMap = { sm: '0.9rem', md: '1.1rem', lg: '1.4rem' };
  const dim = sizeMap[size];

  return (
    <div className="provider-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div
        className="provider-badge-icon"
        style={{
          width: dim,
          height: dim,
          borderRadius: 'var(--radius-sm)',
          background: `${color}20`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: iconFontMap[size],
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      {showLabel && (
        <span style={{ fontSize: fontMap[size], fontWeight: 500, color: 'var(--text-primary)' }}>
          {displayName || provider}
        </span>
      )}
    </div>
  );
}
