import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Hammer, Zap, Bug, CheckSquare, BookOpen, Brain, Cpu, ChevronRight, Activity, AlertTriangle, Clock } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeBadge from '@/components/forge/ForgeBadge';

const GOLD = '#C9A84C';
const BLUE = '#3B82F6';

export default function RileyDashboard() {
  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects'], queryFn: () => base44.entities.RileyProject.filter({ status: 'Active' }, '-updated_date', 10) });
  const { data: builds = [] } = useQuery({ queryKey: ['app-builds'], queryFn: () => base44.entities.AppBuild.list('-updated_date', 10) });
  const { data: prompts = [] } = useQuery({ queryKey: ['builder-prompts-ready'], queryFn: () => base44.entities.BuilderPrompt.filter({ status: 'Ready' }, '-created_date', 5) });
  const { data: bugs = [] } = useQuery({ queryKey: ['debug-issues-open'], queryFn: () => base44.entities.DebugIssue.filter({ status: 'New' }, '-created_date', 5) });
  const { data: memories = [] } = useQuery({ queryKey: ['recent-memories'], queryFn: () => base44.entities.RileyMemory.filter({ active: true }, '-updated_date', 6) });
  const { data: logs = [] } = useQuery({ queryKey: ['activity-logs'], queryFn: () => base44.entities.ActivityLog.list('-timestamp', 8) });

  const stageColors = { Idea: '#6B7280', Planning: '#3B82F6', Building: GOLD, QA: '#8B5CF6', 'Launch Ready': '#10B981', Live: '#10B981', Paused: '#F59E0B', Archived: '#374151' };
  const stageText = { Idea: '#9CA3AF', Planning: '#93C5FD', Building: GOLD, QA: '#C4B5FD', 'Launch Ready': '#6EE7B7', Live: '#6EE7B7', Paused: '#FCD34D', Archived: '#4B5563' };

  return (
    <ForgeLayout title="Riley Forge" subtitle="Builder companion · Prompt engineer · Product architect">
      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'New Blueprint', icon: Hammer, to: '/forge/blueprints', color: GOLD },
          { label: 'Next Prompt', icon: Zap, to: '/forge/builder', color: '#3B82F6' },
          { label: 'Debug Error', icon: Bug, to: '/forge/qa', color: '#EF4444' },
          { label: 'QA Review', icon: CheckSquare, to: '/forge/qa', color: '#10B981' },
          { label: 'Scope Audit', icon: AlertTriangle, to: '/forge/builder', color: '#F59E0B' },
          { label: 'Save Memory', icon: Brain, to: '/forge/memory', color: '#8B5CF6' },
        ].map(({ label, icon: Icon, to, color }) => (
          <Link key={label} to={to}
            style={{ background: '#0E0E1C', border: `1px solid ${color}33`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = color}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${color}33`}
          >
            <Icon size={16} style={{ color }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1', fontFamily: 'sans-serif' }}>{label}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active Projects */}
        <div style={{ background: '#0B0B18', border: '1px solid #1E1E35', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Active Projects</span>
            <Link to="/forge/projects" style={{ fontSize: 10, color: '#4B5563', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>View all <ChevronRight size={10} /></Link>
          </div>
          {projects.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No active projects yet.</p>
          ) : projects.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111827' }}>
              <div>
                <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{p.brand || p.project_type}</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${stageColors[p.stage] || '#374151'}22`, color: stageText[p.stage] || '#6B7280', border: `1px solid ${stageColors[p.stage] || '#374151'}44`, fontFamily: 'sans-serif' }}>
                {p.stage}
              </span>
            </div>
          ))}
        </div>

        {/* Ready Prompts */}
        <div style={{ background: '#0B0B18', border: '1px solid #1E1E35', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#3B82F6', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Prompts Ready</span>
            <Link to="/forge/prompts" style={{ fontSize: 10, color: '#4B5563', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>View all <ChevronRight size={10} /></Link>
          </div>
          {prompts.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No prompts queued.</p>
          ) : prompts.map(p => (
            <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #111827' }}>
              <div style={{ fontSize: 12, color: '#93C5FD', fontFamily: 'sans-serif', fontWeight: 500 }}>{p.prompt_title}</div>
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{p.phase || 'No phase'}</div>
            </div>
          ))}
        </div>

        {/* Open Bugs */}
        <div style={{ background: '#0B0B18', border: '1px solid #1E1E35', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#EF4444', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Open Debug Issues</span>
            <Link to="/forge/qa" style={{ fontSize: 10, color: '#4B5563', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>View all <ChevronRight size={10} /></Link>
          </div>
          {bugs.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No open issues. ✓</p>
          ) : bugs.map(b => (
            <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid #111827' }}>
              <div style={{ fontSize: 12, color: '#FCA5A5', fontFamily: 'sans-serif', fontWeight: 500 }}>{b.title}</div>
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{b.affected_page || 'Unknown location'}</div>
            </div>
          ))}
        </div>

        {/* Recent Memories */}
        <div style={{ background: '#0B0B18', border: '1px solid #1E1E35', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: '#8B5CF6', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Recent Memories</span>
            <Link to="/forge/memory" style={{ fontSize: 10, color: '#4B5563', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>View all <ChevronRight size={10} /></Link>
          </div>
          {memories.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No memories stored yet.</p>
          ) : memories.slice(0, 5).map(m => (
            <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #111827' }}>
              <div style={{ fontSize: 12, color: '#C4B5FD', fontFamily: 'sans-serif', fontWeight: 500 }}>{m.title}</div>
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{m.category}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <div style={{ background: '#0B0B18', border: '1px solid #1E1E35', borderRadius: 12, padding: 20, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Activity size={14} style={{ color: '#4B5563' }} />
          <span style={{ fontSize: 11, color: '#4B5563', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Activity Log</span>
        </div>
        {logs.length === 0 ? (
          <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No activity yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'sans-serif' }}>
                <span style={{ color: l.severity === 'Error' || l.severity === 'Critical' ? '#EF4444' : l.severity === 'Warning' ? '#F59E0B' : '#4B5563', flexShrink: 0 }}>●</span>
                <span style={{ color: '#64748B', flexShrink: 0 }}>{new Date(l.timestamp || l.created_date).toLocaleDateString()}</span>
                <span style={{ color: '#94A3B8' }}>{l.summary}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}