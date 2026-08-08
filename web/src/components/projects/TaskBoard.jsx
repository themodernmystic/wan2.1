import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'border-muted-foreground/30' },
  { id: 'todo', label: 'To Do', color: 'border-blue-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-400' },
  { id: 'review', label: 'Review', color: 'border-purple-400' },
  { id: 'done', label: 'Done', color: 'border-emerald-400' },
];

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function TaskBoard() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', task_type: 'content', status: 'todo' });
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreate(false);
      setForm({ title: '', priority: 'medium', task_type: 'content', status: 'todo' });
      toast.success('Task created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="space-y-2">
              <div className={`flex items-center gap-2 pb-2 border-b-2 ${col.color}`}>
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="outline" className="text-xs h-5">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={`text-xs ${priorityColors[task.priority] || ''}`}>{task.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{task.task_type}</Badge>
                      </div>
                      {task.status !== 'done' && (
                        <div className="flex gap-1">
                          {COLUMNS.filter(c => c.id !== task.status).slice(0, 2).map(c => (
                            <Button
                              key={c.id}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => updateMutation.mutate({ id: task.id, data: { status: c.id } })}
                            >
                              → {c.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.task_type} onValueChange={v => setForm({ ...form, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['content', 'design', 'development', 'seo', 'review', 'translation', 'media', 'other'].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.title} className="w-full">
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}