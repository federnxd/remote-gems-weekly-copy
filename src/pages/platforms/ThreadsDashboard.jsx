import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { EngagementTrendChart, StrategyPerformanceChart, TopPostsChart, EngagementMixChart } from '@/components/platforms/PlatformAnalyticsCharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Heart, MessageCircle, Repeat2, Pencil, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const ThreadsIcon = () => (
  <svg viewBox="0 0 192 192" className="w-5 h-5" fill="black">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60354 125.202 0.195326 97.0695 0H96.9569C68.8816 0.19487 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.805 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"/>
  </svg>
);

const THREADS_STAT_FIELDS = [
  { key: 'threads_views', label: 'Views', icon: Eye, color: 'text-gray-700' },
  { key: 'threads_likes', label: 'Likes', icon: Heart, color: 'text-red-500' },
  { key: 'threads_replies', label: 'Replies', icon: MessageCircle, color: 'text-sky-500' },
  { key: 'threads_reposts', label: 'Reposts', icon: Repeat2, color: 'text-green-600' },
];

function EditThreadsStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    threads_views: post.threads_views ?? 0,
    threads_likes: post.threads_likes ?? 0,
    threads_replies: post.threads_replies ?? 0,
    threads_reposts: post.threads_reposts ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, values);
    toast.success('Threads stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <ThreadsIcon />
            Update Threads Stats
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>
        <div className="space-y-3">
          {THREADS_STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
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
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ThreadsDashboard() {
  const [editingPost, setEditingPost] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncAllPlatformStats', { manual: true });
      if (res.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
        toast.success(`Synced ${res.data.synced?.threads ?? 0} Threads posts`);
      } else {
        toast.error(res.data?.error || 'Sync failed');
      }
    } catch (e) {
      toast.error(e.message);
    }
    setSyncing(false);
  };

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const threadsPosts = posts.filter(p => p.status === 'published' && p.threads_post_id);

  const totalViews = threadsPosts.reduce((s, p) => s + (p.threads_views || 0), 0);
  const totalLikes = threadsPosts.reduce((s, p) => s + (p.threads_likes || 0), 0);
  const totalReplies = threadsPosts.reduce((s, p) => s + (p.threads_replies || 0), 0);
  const totalReposts = threadsPosts.reduce((s, p) => s + (p.threads_reposts || 0), 0);

  const chartData = threadsPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    views: p.threads_views || 0,
    likes: p.threads_likes || 0,
    replies: p.threads_replies || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ThreadsIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Threads Dashboard</h1>
            <p className="text-sm text-muted-foreground">{threadsPosts.length} published posts</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 bg-gray-800 hover:bg-gray-900" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Stats'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Views', value: totalViews.toLocaleString(), icon: Eye, color: 'bg-gray-100 text-gray-700' },
          { label: 'Likes', value: totalLikes, icon: Heart, color: 'bg-red-50 text-red-500' },
          { label: 'Replies', value: totalReplies, icon: MessageCircle, color: 'bg-sky-50 text-sky-500' },
          { label: 'Reposts', value: totalReposts, icon: Repeat2, color: 'bg-green-50 text-green-600' },
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
              <Bar dataKey="views" fill="#374151" name="Views" radius={[4,4,0,0]} />
              <Bar dataKey="likes" fill="#ef4444" name="Likes" radius={[4,4,0,0]} />
              <Bar dataKey="replies" fill="#0ea5e9" name="Replies" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Per-Post Stats</h3>
          <p className="text-xs text-muted-foreground">✏️ Click to enter stats manually</p>
        </div>
        {threadsPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No published Threads posts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {threadsPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{(post.threads_views || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.threads_likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sky-500">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.threads_replies || 0}</span>
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

      {threadsPosts.length >= 2 && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <EngagementTrendChart
              posts={threadsPosts}
              engagementFn={p => p.threads_views > 0 ? parseFloat(((( p.threads_likes || 0) + (p.threads_replies || 0) + (p.threads_reposts || 0)) / p.threads_views * 100).toFixed(2)) : 0}
              color="#374151"
            />
            <StrategyPerformanceChart
              posts={threadsPosts}
              engagementFn={p => p.threads_views > 0 ? parseFloat(((( p.threads_likes || 0) + (p.threads_replies || 0) + (p.threads_reposts || 0)) / p.threads_views * 100).toFixed(2)) : 0}
              color="#374151"
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <TopPostsChart posts={threadsPosts} metricKey="threads_views" metricLabel="Views" color="#374151" />
            <EngagementMixChart
              metrics={[
                { label: 'Likes', value: totalLikes },
                { label: 'Replies', value: totalReplies },
                { label: 'Reposts', value: totalReposts },
              ]}
              colors={['#ef4444', '#0ea5e9', '#22c55e']}
            />
          </div>
        </>
      )}

      {editingPost && (
        <EditThreadsStatsModal post={editingPost} open={!!editingPost} onClose={() => setEditingPost(null)} />
      )}
    </div>
  );
}