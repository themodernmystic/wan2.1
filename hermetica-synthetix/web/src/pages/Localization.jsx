import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Loader2, Sparkles, Languages, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
  'Dutch', 'Swedish', 'Turkish', 'Polish', 'Thai', 'Vietnamese'
];

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  translated: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function Localization() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLangs, setTargetLangs] = useState([]);
  const queryClient = useQueryClient();

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ['translations'],
    queryFn: () => base44.entities.Translation.list('-created_date', 50),
  });

  const translateMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const lang of targetLangs) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Translate the following text from ${sourceLang} to ${lang}. 
Provide a context-aware, culturally adapted translation that maintains the original meaning, tone, and style.
Also provide a quality score (0-100) for the translation.

Source text (${sourceLang}):
${sourceText}`,
          response_json_schema: {
            type: 'object',
            properties: {
              translated_text: { type: 'string' },
              quality_score: { type: 'number' },
              notes: { type: 'string' },
            }
          }
        });

        const saved = await base44.entities.Translation.create({
          source_language: sourceLang,
          target_language: lang,
          original_text: sourceText,
          translated_text: result.translated_text,
          quality_score: result.quality_score,
          status: 'translated',
        });
        results.push(saved);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      setSourceText('');
      setTargetLangs([]);
      toast.success('Translation complete!');
    },
  });

  const toggleLang = (lang) => {
    setTargetLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Localization" />
      <div className="p-6 animate-fade-in">
        <PageHeader title="Localization & Translation" description="AI-powered multilingual content management" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Translator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="w-4 h-4 text-primary" /> Translate Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Source Language</Label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source Text</Label>
                <Textarea
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value)}
                  placeholder="Enter text to translate..."
                  rows={6}
                />
              </div>
              <div>
                <Label className="mb-2 block">Target Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.filter(l => l !== sourceLang).map(lang => (
                    <Badge
                      key={lang}
                      variant={targetLangs.includes(lang) ? 'default' : 'outline'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleLang(lang)}
                    >
                      {targetLangs.includes(lang) && <Check className="w-3 h-3 mr-1" />}
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => translateMutation.mutate()}
                disabled={!sourceText || targetLangs.length === 0 || translateMutation.isPending}
                className="w-full gap-2"
              >
                {translateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Translating {targetLangs.length} language{targetLangs.length > 1 ? 's' : ''}...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Translate to {targetLangs.length} Language{targetLangs.length !== 1 ? 's' : ''}</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Translation Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{translations.length}</p>
                    <p className="text-xs text-muted-foreground">Total Translations</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {new Set(translations.map(t => t.target_language)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Languages</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {translations.filter(t => t.status === 'approved').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {translations.length > 0
                        ? Math.round(translations.reduce((sum, t) => sum + (t.quality_score || 0), 0) / translations.length)
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Translation History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Translations</CardTitle>
          </CardHeader>
          <CardContent>
            {translations.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No translations yet"
                description="Translate your content into multiple languages with AI."
              />
            ) : (
              <div className="space-y-3">
                {translations.map(t => (
                  <div key={t.id} className="flex items-start gap-4 p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <Badge variant="outline">{t.source_language}</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline">{t.target_language}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1">{t.original_text}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{t.translated_text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.quality_score && (
                        <Badge className="bg-primary/10 text-primary">{t.quality_score}%</Badge>
                      )}
                      <Badge className={statusColors[t.status] || ''}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}