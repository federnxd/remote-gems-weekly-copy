import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, ThumbsUp, MessageSquare, Share2, MousePointer, Pencil, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const FB_STAT_FIELDS = [
  { key: 'fb_impressions', label: 'Impressions', icon: Eye, color: 'text-blue-600' },
  { key: 'fb_likes', label: 'Reactions', icon: ThumbsUp, color: 'text-blue-500' },
  { key: 'fb_comments', label: 'Comments', icon: MessageSquare, color: 'text-amber-600' },
  { key: 'fb_shares', label: 'Shares', icon: Share2, color: 'text-purple-600' },
  { key: 'fb_link_clicks', label: 'Link Clicks', icon: MousePointer, color: 'text-green-600' },
];

function EditFBStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    fb_impressions: post.fb_impressions ?? 0,
    fb_likes: post.fb_likes ?? 0,
    fb_comments: post.fb_comments ?? 0,
    fb_shares: post.fb_shares ?? 0,
    fb_link_clicks: post.fb_link_clicks ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, values);
    toast.success('Facebook stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <FacebookIcon />
            Update Facebook Stats
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>
        <div className="space-y-3">
          {FB_STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
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

export default function FacebookDashboard() {
  const [editingPost, setEditingPost] = useState(null);

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const fbPosts = posts.filter(p => p.status === 'published' && p.fb_post_id);

  const totalImpressions = fbPosts.reduce((s, p) => s + (p.fb_impressions || 0), 0);
  const totalLikes = fbPosts.reduce((s, p) => s + (p.fb_likes || 0), 0);
  const totalComments = fbPosts.reduce((s, p) => s + (p.fb_comments || 0), 0);
  const totalShares = fbPosts.reduce((s, p) => s + (p.fb_shares || 0), 0);
  const totalClicks = fbPosts.reduce((s, p) => s + (p.fb_link_clicks || 0), 0);

  const chartData = fbPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    impressions: p.fb_impressions || 0,
    likes: p.fb_likes || 0,
    comments: p.fb_comments || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1877f2]/10 flex items-center justify-center">
          <FacebookIcon />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facebook Dashboard</h1>
          <p className="text-sm text-muted-foreground">{fbPosts.length} published posts · manual stats entry</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'bg-blue-50 text-blue-600' },
          { label: 'Reactions', value: totalLikes, icon: ThumbsUp, color: 'bg-blue-50 text-blue-500' },
          { label: 'Comments', value: totalComments, icon: MessageSquare, color: 'bg-amber-50 text-amber-600' },
          { label: 'Shares', value: totalShares, icon: Share2, color: 'bg-purple-50 text-purple-600' },
          { label: 'Link Clicks', value: totalClicks, icon: MousePointer, color: 'bg-green-50 text-green-600' },
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
              <Bar dataKey="impressions" fill="#1877f2" name="Impressions" radius={[4,4,0,0]} />
              <Bar dataKey="likes" fill="#4267B2" name="Reactions" radius={[4,4,0,0]} />
              <Bar dataKey="comments" fill="#f59e0b" name="Comments" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Per-Post Stats</h3>
          <p className="text-xs text-muted-foreground">✏️ Click to enter stats manually</p>
        </div>
        {fbPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No published Facebook posts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {fbPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{(post.fb_impressions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-500">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.fb_likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-semibold">{post.fb_comments || 0}</span>
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
        <EditFBStatsModal post={editingPost} open={!!editingPost} onClose={() => setEditingPost(null)} />
      )}
    </div>
  );
}