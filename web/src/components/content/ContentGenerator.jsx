import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const CONTENT_TYPES = [
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'social_post', label: 'Social Post' },
  { value: 'email', label: 'Email' },
  { value: 'ad_copy', label: 'Ad Copy' },
  { value: 'product_description', label: 'Product Description' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'faq', label: 'FAQ' },
  { value: 'script', label: 'Script' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'press_release', label: 'Press Release' },
];

const TONES = [
  'professional', 'casual', 'formal', 'friendly', 
  'persuasive', 'informative', 'humorous', 'inspirational'
];

export default function ContentGenerator({ onGenerated }) {
  const [form, setForm] = useState({
    title: '',
    content_type: 'blog_post',
    tone: 'professional',
    target_audience: '',
    language: 'English',
    prompt: '',
    keywords: '',
  });
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const systemPrompt = `You are an expert content writer. Generate a ${form.content_type.replace(/_/g, ' ')} with the following specifications:
- Title/Topic: ${form.title}
- Tone: ${form.tone}
- Target Audience: ${form.target_audience || 'General'}
- Language: ${form.language}
- Keywords to include: ${form.keywords || 'None specified'}
${form.prompt ? `- Additional instructions: ${form.prompt}` : ''}

Write high-quality, engaging content that is SEO-optimized, accessible, and ready for publishing. Include a compelling headline, well-structured sections, and a strong call to action where appropriate.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The full generated content in markdown' },
            meta_title: { type: 'string', description: 'SEO meta title (max 60 chars)' },
            meta_description: { type: 'string', description: 'SEO meta description (max 160 chars)' },
            seo_score: { type: 'number', description: 'Estimated SEO score 0-100' },
            readability_score: { type: 'number', description: 'Readability score 0-100' },
            word_count: { type: 'number' },
            suggested_keywords: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      return response;
    },
    onSuccess: async (data) => {
      setResult(data.content);
      await base44.entities.ContentPiece.create({
        title: form.title,
        content_type: form.content_type,
        body: data.content,
        prompt: form.prompt || form.title,
        tone: form.tone,
        target_audience: form.target_audience,
        language: form.language,
        word_count: data.word_count,
        seo_score: data.seo_score,
        readability_score: data.readability_score,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        keywords: data.suggested_keywords || form.keywords?.split(',').map(k => k.trim()),
        status: 'draft',
      });
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Content generated and saved!');
      if (onGenerated) onGenerated();
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Content Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title / Topic</Label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., 10 Tips for Better Sleep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Content Type</Label>
              <Select value={form.content_type} onValueChange={v => setForm({ ...form, content_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={form.tone} onValueChange={v => setForm({ ...form, tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Audience</Label>
              <Input
                value={form.target_audience}
                onChange={e => setForm({ ...form, target_audience: e.target.value })}
                placeholder="e.g., Young professionals"
              />
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['English', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Arabic', 'Hindi', 'Korean'].map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>SEO Keywords</Label>
            <Input
              value={form.keywords}
              onChange={e => setForm({ ...form, keywords: e.target.value })}
              placeholder="Comma-separated keywords"
            />
          </div>

          <div>
            <Label>Additional Instructions</Label>
            <Textarea
              value={form.prompt}
              onChange={e => setForm({ ...form, prompt: e.target.value })}
              placeholder="Any specific requirements or context..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!form.title || generateMutation.isPending}
            className="w-full gap-2"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Content</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Preview</CardTitle>
          {result && (
            <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {generateMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is crafting your content...</p>
            </div>
          ) : result ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{result}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Generated content will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}