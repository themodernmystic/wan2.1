import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Hammer, FileText, Layers, Zap, Bug, BookOpen, Brain, Moon,
  Settings, ChevronLeft, ChevronRight, Image, Film, Globe, Bot, Megaphone,
  ShieldCheck, BarChart2, Plug, LayoutGrid, Mail, X, ArrowLeft, Network, Cpu
} from 'lucide-react';

const GOLD = '#C9A84C';
const BG = '#0E0E20';
const BG_CARD = '#13132A';
const BORDER = '#2A2A4A';

const NAV_SECTIONS = [
  {
    label: 'Forge', color: GOLD,
    items: [
      { path: '/forge', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { path: '/forge/builder', icon: Hammer, label: 'Builder Console' },
      { path: '/forge/blueprints', icon: FileText, label: 'App Blueprints' },
      { path: '/forge/projects', icon: Layers, label: 'Projects' },
      { path: '/forge/prompts', icon: Zap, label: 'Prompt Pipeline' },
      { path: '/forge/qa', icon: Bug, label: 'QA / Debug' },
      { path: '/forge/oss', icon: BookOpen, label: 'OSS Library' },
      { path: '/forge/soul', icon: Moon, label: 'Soul Core', gold: true },
    ]
  },
  {
    label: 'Creation Engine', color: '#3B82F6',
    items: [
      { path: '/forge/creation', icon: LayoutGrid, label: 'Creation Dashboard' },
      { path: '/forge/image-gen', icon: Image, label: 'Image Generator' },
      { path: '/forge/video-gen', icon: Film, label: 'Video Generator' },
      { path: '/forge/landing-builder', icon: Globe, label: 'Landing Pages' },
      { path: '/forge/pdf-gen', icon: FileText, label: 'PDF / Ebook' },
      { path: '/forge/agent-builder', icon: Bot, label: 'Agent Builder' },
      { path: '/forge/campaign-kit', icon: Megaphone, label: 'Campaign Kit' },
      { path: '/forge/audit-centre', icon: ShieldCheck, label: 'QA Audit Centre' },
      { path: '/forge/build-reports', icon: BarChart2, label: 'Build Reports' },
      { path: '/forge/integrations', icon: Plug, label: 'Integrations' },
      { path: '/forge/form-submissions', icon: Mail, label: 'Form Submissions' },
    ]
  },
  {
    label: 'Cognition', color: '#818CF8',
    items: [
      { path: '/forge/mesh', icon: Network, label: 'Mesh' },
      { path: '/forge/memory', icon: Brain, label: 'Memory Vault' },
    ]
  },
  {
    label: 'Config', color: '#6B7280',
    items: [
      { path: '/forge/settings', icon: Settings, label: 'Settings' },
    ]
  }
];

function ForgeNavLinks({ collapsed, onNavClick }) {
  const location = useLocation();
  return (
    <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
      {/* Back to Riley Chat */}
      <Link to="/riley" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 10px', borderRadius: 7, minHeight: 40,
          background: '#C9A84C18', border: '1px solid #C9A84C55',
          color: GOLD, transition: 'all 0.15s', cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#C9A84C28'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#C9A84C18'; }}
        >
          <ArrowLeft size={13} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: 0.5 }}>Riley Chat</span>}
        </div>
      </Link>
      {NAV_SECTIONS.map(section => (
        <div key={section.label} style={{ marginBottom: 8 }}>
          {!collapsed && (
            <div style={{ fontSize: 9, color: section.color, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 700, padding: '6px 8px 3px', opacity: 0.7 }}>
              {section.label}
            </div>
          )}
          {section.items.map(item => {
            const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            const activeColor = item.gold ? GOLD : section.color;
            return (
              <Link key={item.path} to={item.path} onClick={onNavClick} style={{ textDecoration: 'none', display: 'block', marginBottom: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 10px',
                  minHeight: 44,
                  borderRadius: 7,
                  background: active ? `${activeColor}18` : 'transparent',
                  border: `1px solid ${active ? activeColor + '55' : 'transparent'}`,
                  color: active ? activeColor : '#7A8BA0',
                  transition: 'all 0.15s', cursor: 'pointer',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ fontSize: 11, fontWeight: 500, fontFamily: 'sans-serif' }}>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// Desktop sidebar (md+)
export function ForgeDesktopSidebar({ collapsed, setCollapsed }) {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 transition-all duration-300"
      style={{ width: collapsed ? 56 : 220, background: BG, borderRight: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '14px' : '14px 18px', borderBottom: `1px solid ${BORDER}`, height: 56, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #8B6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#080812', fontWeight: 'bold', flexShrink: 0 }}>✦</div>
        {!collapsed && <span style={{ fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: 1, fontFamily: 'sans-serif' }}>RILEY FORGE</span>}
      </div>
      <ForgeNavLinks collapsed={collapsed} />
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderTop: `1px solid ${BORDER}`, background: 'transparent', border: 'none', borderTop: `1px solid ${BORDER}`, color: GOLD, cursor: 'pointer', opacity: 0.7 }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}

// Mobile drawer
export function ForgeMobileDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} aria-hidden="true" />
      <aside className="absolute left-0 top-0 h-full flex flex-col"
        style={{ width: '18rem', maxWidth: '85vw', background: BG, borderRight: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, height: 56, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #8B6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#080812', fontWeight: 'bold', flexShrink: 0 }}>✦</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: 1, fontFamily: 'sans-serif' }}>RILEY FORGE</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: GOLD, cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
        <ForgeNavLinks collapsed={false} onNavClick={onClose} />
      </aside>
    </div>
  );
}

// Default export for backward compat
export default function ForgeSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return <ForgeDesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />;
}