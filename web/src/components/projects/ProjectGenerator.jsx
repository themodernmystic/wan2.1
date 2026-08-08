import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Globe, BookOpen, Megaphone, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { runGeneration } from '@/components/projects/generationUtils';

const PROJECT_TYPES = [
  { value: 'landing_site', label: 'Landing Site', icon: Globe, description: 'Full landing page with hero, features, CTA, and SEO content' },
  { value: 'ebook', label: 'Illustrated E-Book', icon: BookOpen, description: 'Multi-chapter e-book with cover image and illustrations' },
  { value: 'marketing', label: 'Marketing Campaign', icon: Megaphone, description: 'Blog posts, social copy, email sequences, and ad copy' },
  { value: 'content', label: 'Content Project', icon: FileText, description: 'General content and asset generation project' },
];

export default function ProjectGenerator({ open, onOpenChange, onProjectCreated }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'landing_site', priority: 'high' });
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const handleCreate = async () => {
    if (!form.name) return;
    setGenerating(true);
    setCurrentStep('Creating project...');

    try {
      const project = await base44.entities.Project.create({
        name: form.name,
        description: form.description,
        priority: form.priority,
        status: 'active',
        progress: 0,
      });

      await runGeneration(project, form.type);

      toast.success(`"${form.name}" generated successfully!`);
      setForm({ name: '', description: '', type: 'landing_site', priority: 'high' });
      onProjectCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error('Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
      setCurrentStep('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={generating ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> New AI Project
          </DialogTitle>
        </DialogHeader>

        {generating ? (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Generating your project...</p>
              <p className="text-sm text-muted-foreground mt-1">{currentStep}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              AI is building your content and assets. This takes 30–90 seconds depending on the project type.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Project type selector */}
            <div>
              <Label className="mb-2 block">Project Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TYPES.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    onClick={() => setForm({ ...form, type: value })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.type === value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${form.type === value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Project Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My SaaS Landing Page"
              />
            </div>

            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(the more detail, the better the output)</span></Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what you want built — topic, audience, key messages, style..."
                rows={3}
              />
            </div>

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

            <Button
              onClick={handleCreate}
              disabled={!form.name || !form.description}
              className="w-full gap-2"
            >
              <Sparkles className="w-4 h-4" /> Generate Project with AI
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              AI will generate all content and images — takes ~30–90 seconds
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}