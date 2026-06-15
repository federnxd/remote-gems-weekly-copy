import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { EngagementTrendChart, StrategyPerformanceChart, TopPostsChart, EngagementMixChart } from '@/components/platforms/PlatformAnalyticsCharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star, Repeat2, MessageCircle, Pencil, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const MastodonIcon = () => (
  <svg viewBox="0 0 216.4 232" className="w-5 h-5" fill="#563acc">
    <path d="M211.8 139.7c-2.9 15.1-26.2 31.7-53 35-14 1.7-27.7 3.2-42.4 2.5-24-.9-43-5-43-5 0 2 .1 4 .4 5.8 2.9 22.2 21.8 23.6 39.7 24.2 18 .6 34-4.4 34-4.4l.7 16.3s-12.6 6.7-35 7.9c-12.3.7-27.7-.3-45.5-4.8C27.4 206.5 4.7 171 1.3 131.4 0 118.2.7 105 .7 105 0 54.9 32.2 40 32.2 40c16.2-7.4 44-10.5 73-10.7h.7c29 .2 56.9 3.3 73 10.7 0 0 32.2 14.9 32.2 65 0 0 .4 37.3-5.3 64.7z"/>
    <path d="M178.3 81.6v56.4h-22.3V83.3c0-11.5-4.8-17.4-14.5-17.4-10.7 0-16 6.9-16 20.6v29.9h-22.2V86.5c0-13.7-5.4-20.6-16-20.6-9.7 0-14.5 5.9-14.5 17.4v54.7H50.5V81.6c0-11.5 2.9-20.6 8.8-27.3 6-6.7 13.9-10.1 23.7-10.1 11.3 0 19.9 4.3 25.5 13l5.5 9.2 5.5-9.2c5.7-8.7 14.2-13 25.5-13 9.8 0 17.7 3.4 23.7 10.1 5.9 6.7 8.6 15.8 8.6 27.3z" fill="#fff"/>
  </svg>
);

const MASTODON_STAT_FIELDS = [
  { key: 'mastodon_favourites', label: 'Favourites', icon: Star, color: 'text-yellow-500' },
  { key: 'mastodon_boosts', label: 'Boosts', icon: Repeat2, color: 'text-green-600' },
  { key: 'mastodon_replies', label: 'Replies', icon: MessageCircle, color: 'text-purple-600' },
];

function EditMastodonStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    mastodon_favourites: post.mastodon_favourites ?? 0,
    mastodon_boosts: post.mastodon_boosts ?? 0,
    mastodon_replies: post.mastodon_replies ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, values);
    toast.success('Mastodon stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <MastodonIcon />
            Update Mastodon Stats
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>
        <div className="space-y-3">
          {MASTODON_STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
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

export default function MastodonDashboard() {
  const [editingPost, setEditingPost] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncAllPlatformStats', { manual: true });
      if (res.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
        toast.success(`Synced ${res.data.synced?.mastodon ?? 0} Mastodon posts`);
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

  const mastodonPosts = posts.filter(p => p.status === 'published' && p.mastodon_post_id);

  const totalFavourites = mastodonPosts.reduce((s, p) => s + (p.mastodon_favourites || 0), 0);
  const totalBoosts = mastodonPosts.reduce((s, p) => s + (p.mastodon_boosts || 0), 0);
  const totalReplies = mastodonPosts.reduce((s, p) => s + (p.mastodon_replies || 0), 0);

  const chartData = mastodonPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    favourites: p.mastodon_favourites || 0,
    boosts: p.mastodon_boosts || 0,
    replies: p.mastodon_replies || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <MastodonIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mastodon Dashboard</h1>
            <p className="text-sm text-muted-foreground">{mastodonPosts.length} published posts</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 bg-[#563acc] hover:bg-[#563acc]/90" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Stats'}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Favourites', value: totalFavourites, icon: Star, color: 'bg-yellow-50 text-yellow-500' },
          { label: 'Boosts', value: totalBoosts, icon: Repeat2, color: 'bg-green-50 text-green-600' },
          { label: 'Replies', value: totalReplies, icon: MessageCircle, color: 'bg-purple-50 text-purple-600' },
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
              <Bar dataKey="favourites" fill="#eab308" name="Favourites" radius={[4,4,0,0]} />
              <Bar dataKey="boosts" fill="#22c55e" name="Boosts" radius={[4,4,0,0]} />
              <Bar dataKey="replies" fill="#9333ea" name="Replies" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Per-Post Stats</h3>
          <p className="text-xs text-muted-foreground">✏️ Click to enter stats manually</p>
        </div>
        {mastodonPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No published Mastodon posts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {mastodonPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.mastodon_favourites || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Repeat2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.mastodon_boosts || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-600">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.mastodon_replies || 0}</span>
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

      {mastodonPosts.length >= 2 && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <EngagementTrendChart
              posts={mastodonPosts}
              engagementFn={p => (p.mastodon_favourites || 0) + (p.mastodon_boosts || 0) + (p.mastodon_replies || 0)}
              color="#563acc"
            />
            <StrategyPerformanceChart
              posts={mastodonPosts}
              engagementFn={p => (p.mastodon_favourites || 0) + (p.mastodon_boosts || 0) + (p.mastodon_replies || 0)}
              color="#563acc"
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <TopPostsChart posts={mastodonPosts} metricKey="mastodon_boosts" metricLabel="Boosts" color="#563acc" />
            <EngagementMixChart
              metrics={[
                { label: 'Favourites', value: totalFavourites },
                { label: 'Boosts', value: totalBoosts },
                { label: 'Replies', value: totalReplies },
              ]}
              colors={['#eab308', '#22c55e', '#9333ea']}
            />
          </div>
        </>
      )}

      {editingPost && (
        <EditMastodonStatsModal post={editingPost} open={!!editingPost} onClose={() => setEditingPost(null)} />
      )}
    </div>
  );
}