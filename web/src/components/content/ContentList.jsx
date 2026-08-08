import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { FileText, MoreVertical, Search, Trash2, Eye, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import SendToRiley from '@/components/shared/SendToRiley';

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-primary/10 text-primary',
  archived: 'bg-muted text-muted-foreground',
};

export default function ContentList({ onSelect }) {
  const [search, setSearch] = React.useState('');
  const queryClient = useQueryClient();

  const { data: content = [], isLoading } = useQuery({
    queryKey: ['content'],
    queryFn: () => base44.entities.ContentPiece.list('-created_date', 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContentPiece.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Content deleted');
    },
  });

  const filtered = content.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.content_type?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content yet"
          description="Generate your first piece of content using the AI content generator."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(item)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {item.content_type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_date), 'MMM d, yyyy')}
                      </span>
                      {item.word_count && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{item.word_count} words</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.seo_score && (
                    <Badge variant="outline" className="text-xs">SEO {item.seo_score}</Badge>
                  )}
                  <Badge className={statusColors[item.status] || ''}>{item.status}</Badge>
                  <SendToRiley
                    context={`[Content Piece]\nTitle: ${item.title}\nType: ${item.content_type}\nStatus: ${item.status}\n\n${item.body ? item.body.slice(0, 800) : ''}`}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect?.(item); }}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(item.body || '');
                        toast.success('Content copied!');
                      }}>
                        <Copy className="w-4 h-4 mr-2" /> Copy
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}