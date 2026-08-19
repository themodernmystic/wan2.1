import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DISMISS_KEY = 'integration_limit_banner_dismissed_v1';

export default function IntegrationLimitBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      background: '#1a0f00',
      borderBottom: '1px solid #F59E0B44',
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      zIndex: 100,
      flexShrink: 0,
    }}>
      <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'sans-serif', flex: 1 }}>
        ⚠️ Some AI features are unavailable — integration credit limit reached. Core features (navigation, data, forms) still work normally. Credits reset on <strong>18 June 2026</strong>.
      </span>
      <button
        type="button"
        onClick={dismiss}
        style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
      >
        <X size={13} />
      </button>
    </div>
  );
}