import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Linkedin, ThumbsUp, MessageSquare, Eye, MousePointer, Share2, Pencil, AlertCircle, CheckCircle2, RefreshCw, ClipboardPaste } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const STAT_FIELDS = [
  { key: 'impressions', label: 'Impressions', icon: Eye, color: 'text-blue-600' },
  { key: 'likes',       label: 'Likes',       icon: ThumbsUp, color: 'text-pink-600' },
  { key: 'comments',    label: 'Comments',    icon: MessageSquare, color: 'text-amber-600' },
  { key: 'shares',      label: 'Shares',      icon: Share2, color: 'text-purple-600' },
  { key: 'clicks',      label: 'Link Clicks', icon: MousePointer, color: 'text-green-600' },
];

function parsePostStats(text) {
  // Normalize: replace European thousand separators (periods before 3 digits) and commas
  const normalize = (str) => str.replace(/(\d)\.(\d{3})/g, '$1$2').replace(/,/g, '');
  const normalized = normalize(text);

  const num = (...labels) => {
    for (const label of labels) {
      // Match label then the next standalone number on same or next line
      const match = normalized.match(new RegExp(label + '[^\\d]{0,30}?(\\d+)', 'i'));
      if (match) return parseInt(match[1]);
    }
    return null;
  };

  return {
    impressions: num('impresiones', 'impressions', 'impression', 'views', 'vistas'),
    likes:       num('reacciones', 'reactions', 'reaction', 'likes', 'like', 'me gusta'),
    comments:    num('comentarios', 'comments', 'comment'),
    shares:      num('reposts', 'repost', 'compartidos', 'shares', 'share'),
    clicks:      num('clics en el enlace', 'clics', 'link clicks', 'clicks', 'click'),
  };
}

function EditStatsModal({ post, open, onClose }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    impressions: post.impressions ?? 0,
    likes:       post.likes ?? 0,
    comments:    post.comments ?? 0,
    shares:      post.shares ?? 0,
    clicks:      post.clicks ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleParsePaste = () => {
    const parsed = parsePostStats(pasteText);
    setValues(prev => ({
      impressions: parsed.impressions ?? prev.impressions,
      likes:       parsed.likes       ?? prev.likes,
      comments:    parsed.comments    ?? prev.comments,
      shares:      parsed.shares      ?? prev.shares,
      clicks:      parsed.clicks      ?? prev.clicks,
    }));
    toast.success('Stats parsed — review and save');
    setPasteText('');
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.GeneratedPost.update(post.id, {
      ...values,
      last_synced_at: new Date().toISOString(),
    });
    toast.success('Stats updated!');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0a66c2]" />
            Update LinkedIn Stats
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground truncate -mt-2 mb-2">{post.title}</p>

        <Tabs defaultValue="manual">
          <TabsList className="w-full mb-3">
            <TabsTrigger value="manual" className="flex-1 text-xs">Manual Entry</TabsTrigger>
            <TabsTrigger value="paste" className="flex-1 text-xs gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <div className="space-y-3">
              {STAT_FIELDS.map(({ key, label, icon: Icon, color }) => (
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
          </TabsContent>

          <TabsContent value="paste">
            <p className="text-xs text-muted-foreground mb-2">
              Copy the analytics text from your LinkedIn post and paste it below. Numbers will be extracted automatically.
            </p>
            <Textarea
              placeholder="Paste LinkedIn post analytics here…"
              className="h-36 text-sm resize-none"
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
            <Button size="sm" className="mt-2 w-full gap-1.5" onClick={handleParsePaste} disabled={!pasteText.trim()}>
              <ClipboardPaste className="w-3.5 h-3.5" /> Parse & Fill
            </Button>
          </TabsContent>
        </Tabs>

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

export default function LinkedInEngagement({ posts }) {
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const publishedPosts = posts.filter(p => p.status === 'published' && p.linkedin_post_id);

  const totalLikes       = publishedPosts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments    = publishedPosts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalImpressions = publishedPosts.reduce((s, p) => s + (p.impressions || 0), 0);

  const syncStats = async (silent = false) => {
    if (publishedPosts.length === 0) return;
    setSyncing(true);
    const res = await base44.functions.invoke('syncLinkedInStats', {});
    setSyncing(false);
    if (res.data?.synced >= 0) {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      if (!silent) toast.success(`Synced stats for ${res.data.synced} posts`);
    } else if (!silent) {
      toast.error(res.data?.error || 'Sync failed');
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    syncStats(true);
  }, []);

  if (publishedPosts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Linkedin className="w-4 h-4 text-[#0a66c2]" />
          <h3 className="font-semibold text-sm">LinkedIn Engagement</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No published posts with LinkedIn IDs yet.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0a66c2]" />
            <h3 className="font-semibold text-sm">LinkedIn Per-Post Engagement</h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">✏️ to edit manually</p>
            <Button size="sm" variant="outline" onClick={() => syncStats(false)} disabled={syncing} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
          </div>
        </div>

        {/* Summary totals */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Impressions</p>
            <p className="text-xl font-bold text-blue-600">{totalImpressions.toLocaleString()}</p>
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

        {/* Per-post table */}
        <div className="space-y-2">
          {publishedPosts.map(post => (
            <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{(post.impressions || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-pink-600">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="font-semibold">{post.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="font-semibold">{post.comments || 0}</span>
                </div>
                {post.last_synced_at && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" title="Stats entered" />
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditingPost(post)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editingPost && (
        <EditStatsModal
          post={editingPost}
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
    </>
  );
}