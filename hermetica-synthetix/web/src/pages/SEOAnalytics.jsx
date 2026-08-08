import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, TrendingUp, Target, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SEOAnalytics() {
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const { data: content = [] } = useQuery({
    queryKey: ['content'],
    queryFn: () => base44.entities.ContentPiece.list('-created_date', 50),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an SEO expert. Analyze the following for SEO optimization:
URL/Page: ${url || 'General analysis'}
Target Keywords: ${keywords || 'Not specified'}

Provide a comprehensive SEO analysis including:
1. Overall SEO score (0-100)
2. Keyword optimization score
3. Content quality score
4. Technical SEO score
5. Specific recommendations for improvement
6. Suggested meta title and description
7. Related keyword suggestions
8. Content structure suggestions`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_score: { type: 'number' },
            keyword_score: { type: 'number' },
            content_score: { type: 'number' },
            technical_score: { type: 'number' },
            recommendations: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } } } },
            suggested_meta_title: { type: 'string' },
            suggested_meta_description: { type: 'string' },
            related_keywords: { type: 'array', items: { type: 'string' } },
            content_suggestions: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      return result;
    },
    onSuccess: (data) => setAnalysis(data),
  });

  const avgSeoScore = content.length > 0
    ? Math.round(content.filter(c => c.seo_score).reduce((sum, c) => sum + c.seo_score, 0) / Math.max(content.filter(c => c.seo_score).length, 1))
    : 0;

  return (
    <div className="min-h-screen">
      <TopBar title="SEO & Analytics" />
      <div className="p-6 animate-fade-in">
        <PageHeader title="SEO & Analytics" description="Optimize your content for search engines and track performance" />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Avg SEO Score" value={avgSeoScore || '—'} icon={TrendingUp} />
          <StatCard title="Total Content" value={content.length} icon={BarChart3} />
          <StatCard title="Published" value={content.filter(c => c.status === 'published').length} icon={Target} />
          <StatCard title="Needs Review" value={content.filter(c => (c.seo_score || 0) < 60).length} icon={Search} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SEO Analyzer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> SEO Analyzer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL or Page Title</Label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com or page title" />
              </div>
              <div>
                <Label>Target Keywords</Label>
                <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Comma-separated keywords" />
              </div>
              <Button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} className="w-full gap-2">
                {analyzeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Analyze SEO</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Content SEO Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content SEO Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={content.filter(c => c.seo_score).slice(0, 8).map(c => ({
                  name: c.title?.slice(0, 15) + '...',
                  score: c.seo_score
                }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(243, 75%, 59%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Overall', score: analysis.overall_score },
                { label: 'Keywords', score: analysis.keyword_score },
                { label: 'Content', score: analysis.content_score },
                { label: 'Technical', score: analysis.technical_score },
              ].map(item => (
                <Card key={item.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-3xl font-bold mt-1">{item.score}</p>
                    <Progress value={item.score} className="mt-2 h-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {analysis.recommendations?.map((rec, i) => (
                    <div key={i} className="flex gap-3 items-start border-b border-border last:border-0 pb-3 last:pb-0">
                      <Badge className={rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}>
                        {rec.priority}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Suggested Keywords</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.related_keywords?.map((kw, i) => (
                      <Badge key={i} variant="outline">{kw}</Badge>
                    ))}
                  </div>
                  {analysis.suggested_meta_title && (
                    <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Suggested Meta Title</p>
                        <p className="text-sm">{analysis.suggested_meta_title}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Suggested Meta Description</p>
                        <p className="text-sm">{analysis.suggested_meta_description}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}