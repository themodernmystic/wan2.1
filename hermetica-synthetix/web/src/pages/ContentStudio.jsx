import React, { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import ContentGenerator from '@/components/content/ContentGenerator';
import ContentList from '@/components/content/ContentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ContentStudio() {
  const [selectedContent, setSelectedContent] = useState(null);

  return (
    <div className="min-h-screen">
      <TopBar title="Content Studio" />
      <div className="p-6 animate-fade-in">
        <PageHeader
          title="AI Content Studio"
          description="Generate, edit, and manage all your content with AI assistance"
        />

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="w-4 h-4" /> Generate
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <List className="w-4 h-4" /> Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <ContentGenerator />
          </TabsContent>

          <TabsContent value="library">
            <ContentList onSelect={setSelectedContent} />
          </TabsContent>
        </Tabs>

        {/* Content Detail Dialog */}
        <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedContent?.title}</DialogTitle>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline">{selectedContent?.content_type?.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline">{selectedContent?.tone}</Badge>
                <Badge variant="outline">{selectedContent?.language}</Badge>
                {selectedContent?.seo_score && (
                  <Badge className="bg-primary/10 text-primary">SEO: {selectedContent.seo_score}</Badge>
                )}
              </div>
            </DialogHeader>
            <div className="prose prose-sm max-w-none mt-4">
              <ReactMarkdown>{selectedContent?.body || ''}</ReactMarkdown>
            </div>
            {selectedContent?.meta_title && (
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Meta Title</p>
                <p className="text-sm">{selectedContent.meta_title}</p>
                <p className="text-xs font-medium text-muted-foreground mt-2">Meta Description</p>
                <p className="text-sm">{selectedContent.meta_description}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}