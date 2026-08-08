import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { ForgeMobileDrawer } from './ForgeSidebar';
import IntegrationLimitBanner from '@/components/shared/IntegrationLimitBanner';

const GOLD = '#C9A84C';
const BG = '#0E0E20';
const BORDER = '#2A2A4A';

export default function ForgeAppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#080812', overflowX: 'hidden' }}>
      <IntegrationLimitBanner />
      {/* Top bar with burger menu */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: 56, background: BG, borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px'
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 8,
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: GOLD, cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = GOLD}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: 1, fontFamily: 'sans-serif' }}>RILEY FORGE</span>
        <div style={{ flex: 1 }} />
        <Link to="/riley" style={{
          display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
          color: GOLD, fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif',
          padding: '6px 12px', borderRadius: 7,
          border: `1px solid ${GOLD}55`, background: '#C9A84C18',
          letterSpacing: 0.5,
        }}>
          <ArrowLeft size={12} /> Riley Chat
        </Link>
      </header>

      {/* Sidebar drawer */}
      <ForgeMobileDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.6)',
            top: 56,
          }}
        />
      )}

      {/* Main content */}
      <main style={{
        flex: 1,
        marginTop: 56,
        minHeight: '100vh',
        overflowX: 'hidden',
        width: '100%',
      }}>
        <Outlet />
      </main>
    </div>
  );
}