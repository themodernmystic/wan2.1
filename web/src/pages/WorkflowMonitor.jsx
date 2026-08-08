import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Filter, Zap, X } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_META = {
  queued: { label: 'Queued', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Loader2 },
  success: { label: 'Complete', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle },
  retrying: { label: 'Retrying', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: RefreshCw },
};

export default function WorkflowMonitor() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.IntegrationJob.list('-created_date', 100);
      setJobs(data || []);
    } catch (e) { toast.error('Failed to load jobs'); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (job) => {
    try {
      await base44.entities.IntegrationJob.update(job.id, { status: 'queued', error_message: null, retry_count: (job.retry_count || 0) + 1 });
      toast.success('Job queued for retry');
      load();
    } catch (e) { toast.error('Retry failed'); }
  };

  const handleCancel = async (job) => {
    if (!confirm('Cancel this job?')) return;
    try {
      await base44.entities.IntegrationJob.update(job.id, { status: 'failed', error_message: 'Cancelled by user' });
      toast.success('Job cancelled');
      load();
    } catch (e) { toast.error('Cancel failed'); }
  };

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const stats = Object.keys(STATUS_META).reduce((acc, key) => {
    acc[key] = jobs.filter(j => j.status === key).length;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Activity className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Workflow Monitor</h1>
            <p className="text-sm text-muted-foreground">Automated media and content job status · auto-refreshes every 15s</p>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <Card key={key}><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <meta.icon className={`w-4 h-4 ${meta.color} ${key === 'processing' || key === 'retrying' ? 'animate-spin' : ''}`} />
              <span className="text-xs text-muted-foreground">{meta.label}</span>
            </div>
            <div className={`text-2xl font-bold ${meta.color}`}>{stats[key] || 0}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>All ({jobs.length})</button>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === key ? `${meta.bg} ${meta.color} ${meta.border}` : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {meta.label} ({stats[key] || 0})
          </button>
        ))}
      </div>

      {loading && jobs.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No jobs found. Jobs will appear here when content workflows run.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const meta = STATUS_META[job.status] || STATUS_META.queued;
            const Icon = meta.icon;
            return (
              <Card key={job.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}><Icon className={`w-4 h-4 ${meta.color} ${job.status === 'processing' || job.status === 'retrying' ? 'animate-spin' : ''}`} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{job.integration_name || 'Unknown Integration'}</span>
                          <Badge variant="outline" className={meta.color + ' ' + meta.border + ' border'}>{meta.label}</Badge>
                          {job.retry_count > 0 && <Badge variant="outline" className="text-amber-500">retry #{job.retry_count}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{job.action}</div>
                        {job.error_message && <div className="text-xs text-red-400 mt-1 bg-red-500/5 rounded px-2 py-1">{job.error_message}</div>}
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                          {job.timestamp && <span>{new Date(job.timestamp).toLocaleString()}</span>}
                          {job.duration_ms != null && <span>{(job.duration_ms / 1000).toFixed(1)}s</span>}
                          {job.cost != null && <span>${job.cost.toFixed(4)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {(job.status === 'failed' || job.status === 'retrying') && (
                        <Button size="sm" variant="outline" onClick={() => handleRetry(job)}><RefreshCw className="w-3 h-3 mr-1" /> Retry</Button>
                      )}
                      {(job.status === 'queued' || job.status === 'processing') && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(job)}><X className="w-3 h-3 mr-1 text-destructive" /> Cancel</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}