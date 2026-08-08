import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderKanban, Plus, Calendar, Users, MoreVertical, Trash2, Code2, Sparkles, Loader2 } from 'lucide-react';
import CodeEditor from '@/components/projects/CodeEditor';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { toast } from 'sonner';
import TaskBoard from '@/components/projects/TaskBoard';
import ProjectGenerator from '@/components/projects/ProjectGenerator';

const statusColors = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  review: 'bg-amber-100 text-amber-700',
  completed: 'bg-primary/10 text-primary',
  archived: 'bg-muted text-muted-foreground',
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', status: 'planning' });
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', description: '', priority: 'medium', status: 'planning' });
      toast.success('Project created!');
    },
  });

  const generateForProject = async (project, e) => {
    e.stopPropagation();
    setGeneratingId(project.id);
    try {
      const text = (project.name + ' ' + (project.description || '')).toLowerCase();
      const isEbook = text.includes('ebook') || text.includes('e-book') || text.includes('book');

      const { runGeneration } = await import('@/components/projects/generationUtils');
      await runGeneration(project, isEbook ? 'ebook' : 'landing_site');

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`"${project.name}" generated!`);
    } catch (err) {
      toast.error('Generation failed: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
  });

  return (
    <div className="min-h-screen">
      <TopBar title="Projects" />
      <div className="p-6 animate-fade-in">
        <PageHeader
          title="Project Management"
          description="Manage projects, tasks, and team assignments"
          actions={
            <Button onClick={() => setShowGenerator(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          }
        />

        <Tabs defaultValue="grid">
          <TabsList className="mb-6">
            <TabsTrigger value="grid">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Task Board</TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <Code2 className="w-4 h-4" /> Code Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project to organize your content and media."
                actionLabel="Create Project"
                onAction={() => setShowGenerator(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                  <Card key={project.id} className={`hover:shadow-lg transition-all cursor-pointer ${generatingId === project.id ? 'ring-2 ring-primary/50 opacity-80' : ''}`} onClick={() => setSelectedProject(project)}>
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => generateForProject(project, e)}
                            disabled={generatingId === project.id}
                          >
                            {generatingId === project.id
                              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              : <Sparkles className="w-4 h-4 mr-2" />}
                            Generate Now
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(project.id); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[project.status] || ''}>{project.status}</Badge>
                        <Badge className={priorityColors[project.priority] || ''}>{project.priority}</Badge>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{project.progress || 0}%</span>
                        </div>
                        <Progress value={project.progress || 0} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {project.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(project.due_date), 'MMM d')}
                          </span>
                        )}
                        {project.team_members?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {project.team_members.length} members
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks">
            <TaskBoard />
          </TabsContent>

          <TabsContent value="code">
            <CodeEditor projectName={selectedProject?.name || 'Project'} />
          </TabsContent>
        </Tabs>

        <ProjectGenerator
          open={showGenerator}
          onOpenChange={setShowGenerator}
          onProjectCreated={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
        />

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My New Project" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
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
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['planning', 'active', 'review', 'completed'].map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending} className="w-full">
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}