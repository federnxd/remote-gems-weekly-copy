import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Heart, MessageCircle, Repeat2, MousePointer, Share2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Platform color tokens (bg + text)
const PLATFORM_CONFIG = {
  linkedin: { label: 'LinkedIn', bg: 'bg-[#0a66c2]/10', text: 'text-[#0a66c2]' },
  twitter:  { label: 'X / Twitter', bg: 'bg-sky-100', text: 'text-sky-600' },
  facebook: { label: 'Facebook', bg: 'bg-[#1877f2]/10', text: 'text-[#1877f2]' },
  instagram:{ label: 'Instagram', bg: 'bg-pink-100', text: 'text-pink-600' },
  threads:  { label: 'Threads', bg: 'bg-gray-100', text: 'text-gray-700' },
  bluesky:  { label: 'Bluesky', bg: 'bg-sky-50', text: 'text-sky-500' },
  mastodon: { label: 'Mastodon', bg: 'bg-purple-100', text: 'text-purple-600' },
};

const PlatformDot = ({ platform }) => {
  const cfg = PLATFORM_CONFIG[platform];
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${cfg.bg.replace('/10','').replace('-100','-400').replace('-50','-300')} mr-1`} />
  );
};

export default function CrossPlatformStats({ posts, onSynced }) {
  const [syncing, setSyncing] = useState(false);

  const { data: snapshots = [] } = useQuery({
    queryKey: ['dashboard-snapshots'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('-snapshot_date', 1),
  });
  const snap = snapshots[0];

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncAllPlatformStats', { manual: true });
      if (res.data?.success) {
        toast.success(res.data.message || 'All platform stats synced!');
        onSynced?.();
      } else {
        toast.error(res.data?.error || 'Sync failed');
      }
    } catch (e) {
      toast.error(e.message);
    }
    setSyncing(false);
  };
  // ── Aggregate per-platform ──────────────────────────────────────────────
  // LinkedIn: prefer profile-level snapshot (manually pasted) over per-post sums
  const linkedin = snap ? {
    impressions: snap.impressions || 0,
    likes:       snap.reactions || 0,
    comments:    snap.comments || 0,
    shares:      snap.reposts || 0,
    clicks:      snap.link_clicks || 0,
  } : {
    impressions: posts.reduce((s, p) => s + (p.impressions || 0), 0),
    likes:       posts.reduce((s, p) => s + (p.likes || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.comments || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.shares || 0), 0),
    clicks:      posts.reduce((s, p) => s + (p.clicks || 0), 0),
  };

  const twitter = {
    impressions: posts.reduce((s, p) => s + (p.twitter_impressions || 0), 0),
    likes:       posts.reduce((s, p) => s + (p.twitter_likes || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.twitter_replies || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.twitter_retweets || 0), 0),
    clicks:      posts.reduce((s, p) => s + (p.twitter_link_clicks || 0), 0),
  };

  const facebook = {
    impressions: posts.reduce((s, p) => s + (p.fb_impressions || 0), 0),
    likes:       posts.reduce((s, p) => s + (p.fb_likes || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.fb_comments || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.fb_shares || 0), 0),
    clicks:      posts.reduce((s, p) => s + (p.fb_link_clicks || 0), 0),
  };

  const instagram = {
    impressions: posts.reduce((s, p) => s + (p.ig_impressions || 0), 0),
    likes:       posts.reduce((s, p) => s + (p.ig_likes || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.ig_comments || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.ig_saves || 0), 0),   // saves as engagement
    clicks:      posts.reduce((s, p) => s + (p.ig_reach || 0), 0),
  };

  const threads = {
    impressions: posts.reduce((s, p) => s + (p.threads_views || 0), 0),
    likes:       posts.reduce((s, p) => s + (p.threads_likes || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.threads_replies || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.threads_reposts || 0), 0),
    clicks:      0,
  };

  const bluesky = {
    impressions: 0,
    likes:       posts.reduce((s, p) => s + (p.bsky_likes || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.bsky_replies || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.bsky_reposts || 0), 0),
    clicks:      posts.reduce((s, p) => s + (p.bsky_quotes || 0), 0),
  };

  const mastodon = {
    impressions: 0,
    likes:       posts.reduce((s, p) => s + (p.mastodon_favourites || 0), 0),
    comments:    posts.reduce((s, p) => s + (p.mastodon_replies || 0), 0),
    shares:      posts.reduce((s, p) => s + (p.mastodon_boosts || 0), 0),
    clicks:      0,
  };

  const platforms = { linkedin, twitter, facebook, instagram, threads, bluesky, mastodon };

  // ── Cross-platform totals ───────────────────────────────────────────────
  const totalImpressions = Object.values(platforms).reduce((s, p) => s + p.impressions, 0);
  const totalLikes       = Object.values(platforms).reduce((s, p) => s + p.likes, 0);
  const totalComments    = Object.values(platforms).reduce((s, p) => s + p.comments, 0);
  const totalShares      = Object.values(platforms).reduce((s, p) => s + p.shares, 0);
  const totalClicks      = Object.values(platforms).reduce((s, p) => s + p.clicks, 0);
  const totalEngagement  = totalLikes + totalComments + totalShares;
  const engagementRate   = totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(2) : '0';

  const topCards = [
    { label: 'Total Reach', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Likes', value: totalLikes.toLocaleString(), icon: Heart, color: 'text-pink-600 bg-pink-50' },
    { label: 'Total Comments', value: totalComments.toLocaleString(), icon: MessageCircle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Shares', value: totalShares.toLocaleString(), icon: Repeat2, color: 'bg-green-50 text-green-600' },
    { label: 'Clicks / Saves', value: totalClicks.toLocaleString(), icon: MousePointer, color: 'bg-purple-50 text-purple-600' },
    { label: 'Eng. Rate', value: `${engagementRate}%`, icon: Share2, color: 'bg-indigo-50 text-indigo-600' },
  ];

  // ── Per-platform breakdown rows ─────────────────────────────────────────
  const breakdownRows = Object.entries(platforms).map(([key, vals]) => ({
    key,
    ...PLATFORM_CONFIG[key],
    ...vals,
    engagement: vals.likes + vals.comments + vals.shares,
  })).filter(r => r.impressions > 0 || r.engagement > 0);

  return (
    <div className="space-y-4">
      {/* Top KPI cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {Object.entries(PLATFORM_CONFIG).map(([k, cfg]) => (
              <span key={k} className={`w-2 h-2 rounded-full inline-block ${cfg.bg} border border-white`} style={{ background: k === 'linkedin' ? '#0a66c2' : k === 'twitter' ? '#0ea5e9' : k === 'facebook' ? '#1877f2' : k === 'instagram' ? '#dc2743' : k === 'threads' ? '#6b7280' : k === 'bluesky' ? '#0085ff' : '#563acc' }} />
            ))}
          </div>
          <h2 className="text-sm font-semibold text-foreground">All Platforms Overview</h2>
          <Button size="sm" variant="outline" className="ml-auto gap-1.5 h-7 text-xs" onClick={handleSyncAll} disabled={syncing}>
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync All'}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {topCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-4">
              <div className={`w-8 h-8 rounded-lg ${color.split(' ')[1] || color.split(' ')[0]} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
              </div>
              <p className="text-xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Per-platform breakdown */}
      {breakdownRows.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Platform Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(platforms).map(([key, vals]) => {
              const cfg = PLATFORM_CONFIG[key];
              const eng = vals.likes + vals.comments + vals.shares;
              const engRate = vals.impressions > 0 ? ((eng / vals.impressions) * 100).toFixed(1) : '—';
              const platformColor = key === 'linkedin' ? '#0a66c2' : key === 'twitter' ? '#0ea5e9' : key === 'facebook' ? '#1877f2' : key === 'instagram' ? '#dc2743' : key === 'threads' ? '#6b7280' : key === 'bluesky' ? '#0085ff' : '#563acc';
              return (
                <div key={key} className="grid grid-cols-6 items-center gap-2 p-2.5 rounded-lg hover:bg-muted/40 transition-colors text-sm">
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: platformColor }} />
                    <span className="font-medium text-xs">{cfg.label}</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs">{vals.impressions.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">reach</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs">{vals.likes.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">likes</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs">{eng.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">engagmt</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs">{engRate}{engRate !== '—' ? '%' : ''}</p>
                    <p className="text-[10px] text-muted-foreground">eng rate</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}