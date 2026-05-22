import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, RefreshCw, Eye, ThumbsUp, MessageSquare, Share2, MousePointer, UserPlus, Users, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import LinkedInEngagement from '@/components/dashboard/LinkedInEngagement';
import LinkedInOverallStats from '@/components/dashboard/LinkedInOverallStats';
import DashboardSnapshotModal from '@/components/analytics/DashboardSnapshotModal';
import { format } from 'date-fns';

export default function LinkedInDashboard() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const publishedPosts = posts.filter(p => p.status === 'published' && p.linkedin_post_id);

  const syncStats = async () => {
    setSyncing(true);
    const res = await base44.functions.invoke('syncLinkedInStats', {});
    setSyncing(false);
    if (res.data?.synced >= 0) {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success(`Synced stats for ${res.data.synced} posts`);
    } else {
      toast.error(res.data?.error || 'Sync failed');
    }
  };

  const totalImpressions = publishedPosts.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalLikes = publishedPosts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = publishedPosts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalShares = publishedPosts.reduce((s, p) => s + (p.shares || 0), 0);
  const totalClicks = publishedPosts.reduce((s, p) => s + (p.clicks || 0), 0);
  const avgEngagement = publishedPosts.length > 0
    ? ((totalLikes + totalComments + totalShares) / totalImpressions * 100).toFixed(2)
    : 0;

  const chartData = publishedPosts.slice(-10).map(p => ({
    name: p.title?.slice(0, 15) + '…',
    impressions: p.impressions || 0,
    likes: p.likes || 0,
    comments: p.comments || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0a66c2]/10 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-[#0a66c2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LinkedIn Dashboard</h1>
            <p className="text-sm text-muted-foreground">{publishedPosts.length} published posts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSnapshotModal(true)}>
            <ClipboardPaste className="w-4 h-4" /> Paste Analytics
          </Button>
          <Button size="sm" className="gap-2 bg-[#0a66c2] hover:bg-[#0a66c2]/90" onClick={syncStats} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Stats'}
          </Button>
        </div>
      </div>

      <DashboardSnapshotModal
        open={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['dashboard-snapshots'] })}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'bg-blue-50 text-blue-600' },
          { label: 'Likes', value: totalLikes, icon: ThumbsUp, color: 'bg-pink-50 text-pink-600' },
          { label: 'Comments', value: totalComments, icon: MessageSquare, color: 'bg-amber-50 text-amber-600' },
          { label: 'Shares', value: totalShares, icon: Share2, color: 'bg-purple-50 text-purple-600' },
          { label: 'Link Clicks', value: totalClicks, icon: MousePointer, color: 'bg-green-50 text-green-600' },
          { label: 'Eng. Rate', value: `${avgEngagement}%`, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
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

      {/* Per-post chart */}
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
              <Bar dataKey="impressions" fill="#0a66c2" name="Impressions" radius={[4,4,0,0]} />
              <Bar dataKey="likes" fill="#ec4899" name="Likes" radius={[4,4,0,0]} />
              <Bar dataKey="comments" fill="#f59e0b" name="Comments" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <LinkedInOverallStats onPasteClick={() => setShowSnapshotModal(true)} />
      <LinkedInEngagement posts={posts} />
    </div>
  );
}