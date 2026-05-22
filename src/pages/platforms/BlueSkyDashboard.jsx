import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Heart, MessageCircle, Repeat2, Quote, Pencil, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const BlueSkyIcon = () => (
  <svg viewBox="0 0 568 501" className="w-5 h-5" fill="#0085ff">
    <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.209C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.708 473.333 453.32c-119.86 122.992-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.612-33.889-129.52 80.654-149.07-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.66 0 75.293 0 57.947 0-28.906 76.135-1.611 123.121 33.664Z"/>
  </svg>
);

const BLUESKY_STAT_FIELDS = [
  { key: 'bsky_likes', label: 'Likes', icon: Heart, color: 'text-red-500' },
  { key: 'bsky_replies', label: 'Replies', icon: MessageCircle, color: 'text-sky-500' },
  { key: 'bsky_reposts', label: 'Reposts', icon: Repeat2, color: 'text-green-600' },
  { key: 'bsky_quotes', label: 'Quotes', icon: Quote, color: 'text-purple-600' },
];

function EditBskyStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    bsky_likes: post.bsky_likes ?? 0,
    bsky_replies: post.bsky_replies ?? 0,
    bsky_reposts: post.bsky_reposts ?? 0,
    bsky_quotes: post.bsky_quotes ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, values);
    toast.success('Bluesky stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <BlueSkyIcon />
            Update Bluesky Stats
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>
        <div className="space-y-3">
          {BLUESKY_STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
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

export default function BlueSkyDashboard() {
  const [editingPost, setEditingPost] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncAllPlatformStats', {});
      if (res.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
        toast.success(`Synced ${res.data.synced?.bsky ?? 0} Bluesky posts`);
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

  const bskyPosts = posts.filter(p => p.status === 'published' && p.bsky_post_id);

  const totalLikes = bskyPosts.reduce((s, p) => s + (p.bsky_likes || 0), 0);
  const totalReplies = bskyPosts.reduce((s, p) => s + (p.bsky_replies || 0), 0);
  const totalReposts = bskyPosts.reduce((s, p) => s + (p.bsky_reposts || 0), 0);
  const totalQuotes = bskyPosts.reduce((s, p) => s + (p.bsky_quotes || 0), 0);

  const chartData = bskyPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    likes: p.bsky_likes || 0,
    reposts: p.bsky_reposts || 0,
    replies: p.bsky_replies || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
            <BlueSkyIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bluesky Dashboard</h1>
            <p className="text-sm text-muted-foreground">{bskyPosts.length} published posts</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 bg-[#0085ff] hover:bg-[#0085ff]/90" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Stats'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Likes', value: totalLikes, icon: Heart, color: 'bg-red-50 text-red-500' },
          { label: 'Replies', value: totalReplies, icon: MessageCircle, color: 'bg-sky-50 text-sky-500' },
          { label: 'Reposts', value: totalReposts, icon: Repeat2, color: 'bg-green-50 text-green-600' },
          { label: 'Quotes', value: totalQuotes, icon: Quote, color: 'bg-purple-50 text-purple-600' },
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
              <Bar dataKey="likes" fill="#ef4444" name="Likes" radius={[4,4,0,0]} />
              <Bar dataKey="reposts" fill="#22c55e" name="Reposts" radius={[4,4,0,0]} />
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
        {bskyPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No published Bluesky posts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {bskyPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.bsky_likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Repeat2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.bsky_reposts || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sky-500">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.bsky_replies || 0}</span>
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

      {editingPost && (
        <EditBskyStatsModal post={editingPost} open={!!editingPost} onClose={() => setEditingPost(null)} />
      )}
    </div>
  );
}