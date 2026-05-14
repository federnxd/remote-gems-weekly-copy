import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Linkedin, RefreshCw, ThumbsUp, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function LinkedInEngagement({ posts }) {
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const publishedPosts = posts.filter(p => p.status === 'published' && p.linkedin_post_id);

  const fetchStats = async () => {
    if (publishedPosts.length === 0) return;
    setIsLoading(true);
    const res = await base44.functions.invoke('fetchLinkedInEngagement', {
      linkedInPostIds: publishedPosts.map(p => p.linkedin_post_id),
    });
    setIsLoading(false);
    if (res.data?.stats) {
      setStats(res.data.stats);
      setLastFetched(new Date());
      toast.success('Engagement data refreshed');
    } else {
      toast.error(res.data?.error || 'Failed to fetch engagement data');
    }
  };

  const totalLikes = Object.values(stats).reduce((s, v) => s + (v.likes || 0), 0);
  const totalComments = Object.values(stats).reduce((s, v) => s + (v.comments || 0), 0);

  if (publishedPosts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Linkedin className="w-4 h-4 text-[#0a66c2]" />
          <h3 className="font-semibold text-sm">LinkedIn Engagement</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No published posts with LinkedIn IDs yet. Posts published from this app will appear here.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Linkedin className="w-4 h-4 text-[#0a66c2]" />
          <h3 className="font-semibold text-sm">LinkedIn Engagement</h3>
          {lastFetched && (
            <span className="text-xs text-muted-foreground">
              · updated {format(lastFetched, 'HH:mm')}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={fetchStats} disabled={isLoading} className="gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Fetching…' : 'Refresh'}
        </Button>
      </div>

      {/* Summary totals */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Published</p>
            <p className="text-xl font-bold text-[#0a66c2]">{publishedPosts.length}</p>
          </div>
          <div className="bg-pink-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Total Likes</p>
            <p className="text-xl font-bold text-pink-600">{totalLikes}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Total Comments</p>
            <p className="text-xl font-bold text-amber-600">{totalComments}</p>
          </div>
        </div>
      )}

      {/* Per-post table */}
      <div className="space-y-2">
        {publishedPosts.map(post => {
          const s = stats[post.linkedin_post_id];
          return (
            <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
              </div>
              {s ? (
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-pink-600">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="font-semibold">{s.likes}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-semibold">{s.comments}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {isLoading ? '…' : 'Hit Refresh'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}