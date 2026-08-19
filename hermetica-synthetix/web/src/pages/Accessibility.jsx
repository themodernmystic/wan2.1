import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Loader2, Sparkles, Check, X, AlertTriangle, Eye, Type, Keyboard, Monitor } from 'lucide-react';

export default function Accessibility() {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [audit, setAudit] = useState(null);

  const auditMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a WCAG 2.1 accessibility expert. Perform a comprehensive accessibility audit on the following content/URL:

${url ? `URL: ${url}` : ''}
${content ? `Content:\n${content}` : ''}

Analyze for:
1. Color contrast issues
2. Alt text for images
3. Screen reader compatibility
4. Keyboard navigation
5. ARIA attributes
6. Font readability
7. Heading structure
8. Link accessibility
9. Form accessibility
10. Motion/animation concerns

Provide a detailed report with scores, issues found, and recommendations.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_score: { type: 'number', description: '0-100 accessibility score' },
            level: { type: 'string', description: 'WCAG level: A, AA, or AAA' },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  score: { type: 'number' },
                  status: { type: 'string', description: 'pass, warning, or fail' },
                  issues: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                }
              }
            },
            summary: { type: 'string' },
            critical_issues: { type: 'number' },
            warnings: { type: 'number' },
            passed_checks: { type: 'number' },
          }
        }
      });
      return result;
    },
    onSuccess: (data) => setAudit(data),
  });

  const categoryIcons = {
    'Color Contrast': Eye,
    'Alt Text': Type,
    'Screen Reader': Monitor,
    'Keyboard Navigation': Keyboard,
  };

  const statusIcon = (status) => {
    if (status === 'pass') return <Check className="w-4 h-4 text-emerald-600" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <X className="w-4 h-4 text-destructive" />;
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Accessibility" />
      <div className="p-6 animate-fade-in">
        <PageHeader title="Accessibility Audit" description="AI-powered WCAG compliance checks and recommendations" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Run Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL (optional)</Label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <Label>Content / HTML to audit</Label>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste your content or HTML here..."
                  rows={8}
                />
              </div>
              <Button
                onClick={() => auditMutation.mutate()}
                disabled={(!content && !url) || auditMutation.isPending}
                className="w-full gap-2"
              >
                {auditMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Auditing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Run Audit</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {auditMutation.isPending ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Running accessibility audit...</p>
                </CardContent>
              </Card>
            ) : audit ? (
              <>
                {/* Score overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                      <p className="text-3xl font-bold mt-1">{audit.overall_score}</p>
                      <Progress value={audit.overall_score} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">WCAG Level</p>
                      <p className="text-3xl font-bold mt-1">{audit.level}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Critical Issues</p>
                      <p className="text-3xl font-bold mt-1 text-destructive">{audit.critical_issues}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Passed Checks</p>
                      <p className="text-3xl font-bold mt-1 text-emerald-600">{audit.passed_checks}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                  {audit.categories?.map((cat, i) => {
                    const CatIcon = categoryIcons[cat.name] || Shield;
                    return (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {statusIcon(cat.status)}
                              <span className="font-medium text-sm">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{cat.score}/100</Badge>
                            </div>
                          </div>
                          {cat.issues?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Issues:</p>
                              <ul className="space-y-1">
                                {cat.issues.map((issue, j) => (
                                  <li key={j} className="text-xs text-muted-foreground flex gap-2">
                                    <X className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                                    {issue}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {cat.recommendations?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations:</p>
                              <ul className="space-y-1">
                                {cat.recommendations.map((rec, j) => (
                                  <li key={j} className="text-xs text-muted-foreground flex gap-2">
                                    <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {audit.summary && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-1">Summary</p>
                      <p className="text-sm text-muted-foreground">{audit.summary}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Enter content or a URL and run an audit to see accessibility results</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}