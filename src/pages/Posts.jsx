import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Trash2, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function Posts() {
  const [selectedPost, setSelectedPost] = useState(null);
  const [metricsPost, setMetricsPost] = useState(null);
  const [metrics, setMetrics] = useState({});
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GeneratedPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      setMetricsPost(null);
      toast.success('Metrics updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GeneratedPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generated-posts'] }),
  });

  const handleCopy = async (content) => {
    await navigator.clipboard.writeText(content);
    toast.success('Copied!');
  };

  const openMetrics = (post) => {
    setMetricsPost(post);
    setMetrics({
      impressions: post.impressions || 0,
      clicks: post.clicks || 0,
      referrals: post.referrals || 0,
      interviews: post.interviews || 0,
      certified: post.certified || 0,
      hired: post.hired || 0,
    });
  };

  const saveMetrics = () => {
    updateMutation.mutate({ id: metricsPost.id, data: metrics });
  };

  const strategyColors = {
    targeted_role: 'bg-primary/10 text-primary',
    storytelling: 'bg-chart-4/10 text-chart-4',
    urgency: 'bg-destructive/10 text-destructive',
    social_proof: 'bg-accent/10 text-accent',
    niche_community: 'bg-chart-3/10 text-chart-3',
    carousel_text: 'bg-chart-2/10 text-chart-2',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Posts</h1>
        <p className="text-sm text-muted-foreground">{posts.length} posts generated</p>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold truncate">{post.title}</p>
                  <Badge variant="secondary" className={strategyColors[post.strategy]}>
                    {post.strategy?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{post.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{post.content?.slice(0, 150)}...</p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{(post.impressions || 0).toLocaleString()} impressions</span>
                  <span>{post.referrals || 0} referrals</span>
                  <span>{post.interviews || 0} interviews</span>
                  <span className="font-semibold text-accent">{post.hired || 0} hired</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setSelectedPost(post)}><Eye className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => openMetrics(post)}><BarChart3 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(post.content)}><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(post.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No posts yet. Go generate your first one!</p>
        </div>
      )}

      {/* View Post Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>
          {selectedPost?.linkedin_post_id && (
            <a
              href={`https://www.linkedin.com/feed/update/${selectedPost.linkedin_post_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-primary underline"
            >
              View on LinkedIn ↗
            </a>
          )}
          <div className="whitespace-pre-wrap text-sm leading-relaxed mt-2 p-4 bg-muted rounded-lg">
            {selectedPost?.content}
          </div>
          <Button onClick={() => handleCopy(selectedPost?.content)} className="gap-2">
            <Copy className="w-4 h-4" /> Copy to Clipboard
          </Button>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={!!metricsPost} onOpenChange={() => setMetricsPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Metrics</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {['impressions', 'clicks', 'referrals', 'interviews', 'certified', 'hired'].map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="capitalize text-sm w-24">{key}</Label>
                <Input
                  type="number"
                  value={metrics[key] || 0}
                  onChange={(e) => setMetrics({ ...metrics, [key]: parseInt(e.target.value) || 0 })}
                  className="w-32"
                />
              </div>
            ))}
            <Button onClick={saveMetrics} disabled={updateMutation.isPending} className="w-full mt-4">
              Save Metrics
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}