import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postImpressions, postClicks, postReferrals, postHired, postLikes, postComments, postShares, hasEngagement } from '@/lib/post-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlatformPerformanceTable from '@/components/analytics/PlatformPerformanceTable';
import EngagementByStrategy from '@/components/analytics/EngagementByStrategy';
import TopPostsTable from '@/components/analytics/TopPostsTable';
import CTRFunnel from '@/components/analytics/CTRFunnel';
import StrategyCompareCard from '@/components/analytics/StrategyCompareCard';
import EngagementTrendsChart from '@/components/analytics/EngagementTrendsChart';
import ReferralDriversChart from '@/components/analytics/ReferralDriversChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, MousePointerClick, Users, UserCheck, RefreshCw, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-muted ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}

export default function Analytics() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await base44.functions.invoke('syncLinkedInStats', { manual: true });
      toast.success(`Synced ${res.data?.updated ?? 0} posts from LinkedIn`);
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const published = posts.filter(p => p.status === 'published' || hasEngagement(p));
  const totalImpressions = posts.reduce((s, p) => s + postImpressions(p), 0);
  const totalClicks = posts.reduce((s, p) => s + postClicks(p), 0);
  const totalReferrals = posts.reduce((s, p) => s + postReferrals(p), 0);
  const totalHired = posts.reduce((s, p) => s + postHired(p), 0);
  const totalLikes = posts.reduce((s, p) => s + postLikes(p), 0);
  const totalComments = posts.reduce((s, p) => s + postComments(p), 0);
  const totalShares = posts.reduce((s, p) => s + postShares(p), 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const referralRate = totalImpressions > 0 ? ((totalReferrals / totalImpressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Platform performance & content insights across {posts.length} posts</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync from LinkedIn'}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Impressions" value={totalImpressions.toLocaleString()} sub={`${published.length} posts with data`} color="text-primary" />
        <StatCard icon={MousePointerClick} label="Link Click-Through Rate" value={`${avgCTR}%`} sub={`${totalClicks.toLocaleString()} total clicks`} color="text-chart-4" />
        <StatCard icon={Users} label="Referral Rate" value={`${referralRate}%`} sub={`${totalReferrals.toLocaleString()} referrals`} color="text-accent" />
        <StatCard icon={UserCheck} label="Total Hired" value={totalHired} sub="from all posts combined" color="text-chart-3" />
      </div>

      {/* LinkedIn engagement KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Heart} label="Total Likes" value={totalLikes.toLocaleString()} sub="across all posts" color="text-pink-500" />
        <StatCard icon={MessageCircle} label="Total Comments" value={totalComments.toLocaleString()} sub="across all posts" color="text-purple-500" />
        <StatCard icon={Repeat2} label="Total Shares / Reposts" value={totalShares.toLocaleString()} sub="across all posts" color="text-cyan-500" />
      </div>

      {/* CTR Funnel */}
      <CTRFunnel posts={posts} />

      {/* Platform breakdown */}
      <PlatformPerformanceTable posts={posts} />

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <EngagementByStrategy posts={posts} />
        <TopPostsTable posts={posts} />
      </div>

      {/* Engagement trends over time */}
      <EngagementTrendsChart posts={posts} />

      {/* Engagement vs referrals scatter */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ReferralDriversChart posts={posts} />
        <StrategyCompareCard posts={posts} />
      </div>
    </div>
  );
}