import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Plus, Loader2, Sparkles, Trash2, Download, Film, Music, Upload } from 'lucide-react';
import { toast } from 'sonner';
import AssetUploader from '@/components/media/AssetUploader';

export default function MediaLibrary() {
  const [showUploader, setShowUploader] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    media_type: 'image',
    prompt: '',
    style: 'photorealistic',
  });

  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.MediaAsset.list('-created_date', 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaAsset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Asset deleted');
    },
  });

  const handleGenerate = async () => {
    if (!form.prompt) return;
    setGenerating(true);

    const fullPrompt = `${form.prompt}. Style: ${form.style}. High quality, professional, suitable for web use.`;

    const altTextResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a concise, descriptive alt text for an image described as: "${form.prompt}". Return only the alt text, max 125 characters.`,
    });

    const result = await base44.integrations.Core.GenerateImage({ prompt: fullPrompt });

    await base44.entities.MediaAsset.create({
      name: form.name || form.prompt.slice(0, 50),
      media_type: 'image',
      file_url: result.url,
      prompt: form.prompt.slice(0, 500),
      alt_text: typeof altTextResult === 'string' ? altTextResult.slice(0, 125) : '',
      status: 'ready',
    });

    queryClient.invalidateQueries({ queryKey: ['media'] });
    setGenerating(false);
    setShowGenerator(false);
    setForm({ name: '', media_type: 'image', prompt: '', style: 'photorealistic' });
    toast.success('Image generated!');
  };

  const typeIcons = { image: Image, video: Film, audio: Music };

  return (
    <div className="min-h-screen">
      <TopBar title="Media Library" />
      <div className="p-6 animate-fade-in">
        <PageHeader
          title="Media Library"
          description="Generate, manage, and organize all your media assets"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowUploader(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Upload
              </Button>
              <Button onClick={() => setShowGenerator(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Generate Media
              </Button>
            </div>
          }
        />

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          {['all', 'image', 'video', 'audio'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                (() => {
                  const filtered = tab === 'all' ? assets : assets.filter(a => a.media_type === tab);
                  return filtered.length === 0 ? (
                    <EmptyState
                      icon={Image}
                      title="No media assets"
                      description="Generate your first media asset using AI."
                      actionLabel="Generate Media"
                      onAction={() => setShowGenerator(true)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filtered.map(asset => {
                        const TypeIcon = typeIcons[asset.media_type] || Image;
                        return (
                          <Card key={asset.id} className="group overflow-hidden hover:shadow-lg transition-all">
                            <div className="aspect-square relative bg-muted">
                              {asset.file_url ? (
                                <img
                                  src={asset.file_url}
                                  alt={asset.alt_text || asset.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <TypeIcon className="w-12 h-12 text-muted-foreground/30" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => window.open(asset.file_url, '_blank')}>
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteMutation.mutate(asset.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <CardContent className="p-3">
                              <p className="text-sm font-medium truncate">{asset.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">{asset.media_type}</Badge>
                                {asset.alt_text && (
                                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Alt ✓
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Upload Dialog */}
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Upload Asset
              </DialogTitle>
            </DialogHeader>
            <AssetUploader onClose={() => setShowUploader(false)} />
          </DialogContent>
        </Dialog>

        {/* Generator Dialog */}
        <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Generate Media
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Asset name" />
              </div>
              <div>
                <Label>Style</Label>
                <Select value={form.style} onValueChange={v => setForm({ ...form, style: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['photorealistic', 'illustration', 'watercolor', 'digital art', '3d render', 'minimalist', 'vintage', 'abstract'].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description / Prompt</Label>
                <Textarea
                  value={form.prompt}
                  onChange={e => setForm({ ...form, prompt: e.target.value })}
                  placeholder="Describe the image you want to generate..."
                  rows={4}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating || !form.prompt} className="w-full gap-2">
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}