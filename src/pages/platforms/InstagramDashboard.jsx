import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Heart, MessageCircle, Share2, Bookmark, MousePointer, Pencil, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="url(#ig-gradient)">
    <defs>
      <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const IG_STAT_FIELDS = [
  { key: 'ig_impressions', label: 'Impressions', icon: Eye, color: 'text-purple-600' },
  { key: 'ig_likes', label: 'Likes', icon: Heart, color: 'text-red-500' },
  { key: 'ig_comments', label: 'Comments', icon: MessageCircle, color: 'text-amber-600' },
  { key: 'ig_shares', label: 'Shares', icon: Share2, color: 'text-pink-600' },
  { key: 'ig_saves', label: 'Saves', icon: Bookmark, color: 'text-blue-600' },
  { key: 'ig_reach', label: 'Reach', icon: MousePointer, color: 'text-green-600' },
];

function EditIGStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    ig_impressions: post.ig_impressions ?? 0,
    ig_likes: post.ig_likes ?? 0,
    ig_comments: post.ig_comments ?? 0,
    ig_shares: post.ig_shares ?? 0,
    ig_saves: post.ig_saves ?? 0,
    ig_reach: post.ig_reach ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, values);
    toast.success('Instagram stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <InstagramIcon />
            Update Instagram Stats
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>
        <div className="space-y-3">
          {IG_STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
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

export default function InstagramDashboard() {
  const [editingPost, setEditingPost] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncAllPlatformStats', {});
      if (res.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
        toast.success(`Synced ${res.data.synced?.ig ?? 0} Instagram posts`);
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

  const igPosts = posts.filter(p => p.status === 'published' && p.ig_post_id);

  const totalImpressions = igPosts.reduce((s, p) => s + (p.ig_impressions || 0), 0);
  const totalLikes = igPosts.reduce((s, p) => s + (p.ig_likes || 0), 0);
  const totalComments = igPosts.reduce((s, p) => s + (p.ig_comments || 0), 0);
  const totalShares = igPosts.reduce((s, p) => s + (p.ig_shares || 0), 0);
  const totalSaves = igPosts.reduce((s, p) => s + (p.ig_saves || 0), 0);
  const totalReach = igPosts.reduce((s, p) => s + (p.ig_reach || 0), 0);

  const chartData = igPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    impressions: p.ig_impressions || 0,
    likes: p.ig_likes || 0,
    saves: p.ig_saves || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
            <InstagramIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Instagram Dashboard</h1>
            <p className="text-sm text-muted-foreground">{igPosts.length} published posts</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 bg-pink-600 hover:bg-pink-700" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync Stats'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'bg-purple-50 text-purple-600' },
          { label: 'Likes', value: totalLikes, icon: Heart, color: 'bg-red-50 text-red-500' },
          { label: 'Comments', value: totalComments, icon: MessageCircle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Shares', value: totalShares, icon: Share2, color: 'bg-pink-50 text-pink-600' },
          { label: 'Saves', value: totalSaves, icon: Bookmark, color: 'bg-blue-50 text-blue-600' },
          { label: 'Reach', value: totalReach.toLocaleString(), icon: MousePointer, color: 'bg-green-50 text-green-600' },
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
              <Bar dataKey="impressions" fill="#9333ea" name="Impressions" radius={[4,4,0,0]} />
              <Bar dataKey="likes" fill="#ef4444" name="Likes" radius={[4,4,0,0]} />
              <Bar dataKey="saves" fill="#3b82f6" name="Saves" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Per-Post Stats</h3>
          <p className="text-xs text-muted-foreground">✏️ Click to enter stats manually</p>
        </div>
        {igPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No published Instagram posts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {igPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{(post.ig_impressions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.ig_likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.ig_saves || 0}</span>
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
        <EditIGStatsModal post={editingPost} open={!!editingPost} onClose={() => setEditingPost(null)} />
      )}
    </div>
  );
}