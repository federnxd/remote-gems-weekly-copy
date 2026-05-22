import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EngagementTrendChart, StrategyPerformanceChart, TopPostsChart, EngagementMixChart } from '@/components/platforms/PlatformAnalyticsCharts';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Heart, MessageCircle, Repeat2, MousePointer, Users, Pencil, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

// Twitter platform icon SVG
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: '#000' }}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.735-8.84L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TWITTER_STAT_FIELDS = [
  { key: 'twitter_impressions', label: 'Impressions', icon: Eye, color: 'text-blue-600' },
  { key: 'twitter_likes', label: 'Likes', icon: Heart, color: 'text-red-500' },
  { key: 'twitter_replies', label: 'Replies', icon: MessageCircle, color: 'text-sky-500' },
  { key: 'twitter_retweets', label: 'Retweets', icon: Repeat2, color: 'text-green-600' },
  { key: 'twitter_link_clicks', label: 'Link Clicks', icon: MousePointer, color: 'text-purple-600' },
];

function EditTwitterStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    twitter_impressions: post.twitter_impressions ?? 0,
    twitter_likes: post.twitter_likes ?? 0,
    twitter_replies: post.twitter_replies ?? 0,
    twitter_retweets: post.twitter_retweets ?? 0,
    twitter_link_clicks: post.twitter_link_clicks ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, values);
    toast.success('Twitter stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <TwitterIcon />
            Update X / Twitter Stats
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>
        <div className="space-y-3">
          {TWITTER_STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
              <Label className="w-28 text-sm flex-shrink-0">{label}</Label>
              <Input
                type="number"
                min={0}
                value={values[key]}
                onChange={e => setValues(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TwitterDashboard() {
  const [editingPost, setEditingPost] = useState(null);

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const twitterPosts = posts.filter(p => p.status === 'published' && p.twitter_post_id);

  const totalImpressions = twitterPosts.reduce((s, p) => s + (p.twitter_impressions || 0), 0);
  const totalLikes = twitterPosts.reduce((s, p) => s + (p.twitter_likes || 0), 0);
  const totalReplies = twitterPosts.reduce((s, p) => s + (p.twitter_replies || 0), 0);
  const totalRetweets = twitterPosts.reduce((s, p) => s + (p.twitter_retweets || 0), 0);
  const totalClicks = twitterPosts.reduce((s, p) => s + (p.twitter_link_clicks || 0), 0);

  const chartData = twitterPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    impressions: p.twitter_impressions || 0,
    likes: p.twitter_likes || 0,
    retweets: p.twitter_retweets || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center">
          <TwitterIcon />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">X / Twitter Dashboard</h1>
          <p className="text-sm text-muted-foreground">{twitterPosts.length} published posts · manual stats entry</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'bg-blue-50 text-blue-600' },
          { label: 'Likes', value: totalLikes, icon: Heart, color: 'bg-red-50 text-red-500' },
          { label: 'Replies', value: totalReplies, icon: MessageCircle, color: 'bg-sky-50 text-sky-500' },
          { label: 'Retweets', value: totalRetweets, icon: Repeat2, color: 'bg-green-50 text-green-600' },
          { label: 'Link Clicks', value: totalClicks, icon: MousePointer, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className={`w-8 h-8 rounded-lg ${color.split(' ')[0]} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color.split(' ')[1]}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm mb-4">Post Performance (Last 10)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="impressions" fill="#0ea5e9" name="Impressions" radius={[4,4,0,0]} />
              <Bar dataKey="likes" fill="#ef4444" name="Likes" radius={[4,4,0,0]} />
              <Bar dataKey="retweets" fill="#22c55e" name="Retweets" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Posts table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Per-Post Stats</h3>
          <p className="text-xs text-muted-foreground">✏️ Click to enter stats manually</p>
        </div>
        {twitterPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No published posts with Twitter IDs yet.
          </div>
        ) : (
          <div className="space-y-2">
            {twitterPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{(post.twitter_impressions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.twitter_likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Repeat2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.twitter_retweets || 0}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingPost(post)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {twitterPosts.length >= 2 && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <EngagementTrendChart
              posts={twitterPosts}
              engagementFn={p => p.twitter_impressions > 0 ? parseFloat(((( p.twitter_likes || 0) + (p.twitter_replies || 0) + (p.twitter_retweets || 0)) / p.twitter_impressions * 100).toFixed(2)) : 0}
              color="#000000"
            />
            <StrategyPerformanceChart
              posts={twitterPosts}
              engagementFn={p => p.twitter_impressions > 0 ? parseFloat(((( p.twitter_likes || 0) + (p.twitter_replies || 0) + (p.twitter_retweets || 0)) / p.twitter_impressions * 100).toFixed(2)) : 0}
              color="#000000"
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <TopPostsChart posts={twitterPosts} metricKey="twitter_impressions" metricLabel="Impressions" color="#0ea5e9" />
            <EngagementMixChart
              metrics={[
                { label: 'Likes', value: totalLikes },
                { label: 'Replies', value: totalReplies },
                { label: 'Retweets', value: totalRetweets },
                { label: 'Link Clicks', value: totalClicks },
              ]}
              colors={['#ef4444', '#0ea5e9', '#22c55e', '#9333ea']}
            />
          </div>
        </>
      )}

      {editingPost && (
        <EditTwitterStatsModal post={editingPost} open={!!editingPost} onClose={() => setEditingPost(null)} />
      )}
    </div>
  );
}