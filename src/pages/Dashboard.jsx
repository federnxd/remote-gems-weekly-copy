import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StatsGrid from '@/components/dashboard/StatsGrid';
import FunnelCard from '@/components/dashboard/FunnelCard';
import GoalProgress from '@/components/dashboard/GoalProgress';
import PostsOverTimeChart from '@/components/dashboard/PostsOverTimeChart';
import StrategyBreakdownChart from '@/components/dashboard/StrategyBreakdownChart';
import ScheduleDistributionChart from '@/components/dashboard/ScheduleDistributionChart';
import ConversionMetrics from '@/components/dashboard/ConversionMetrics';
import ReferralFunnelCard from '@/components/dashboard/ReferralFunnelCard';
import ReferralStatsGrid from '@/components/dashboard/ReferralStatsGrid';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PenTool, ArrowRight, Zap, ClipboardPaste, BarChart2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardSnapshotModal from '@/components/analytics/DashboardSnapshotModal';
import ReferralInsightsModal from '@/components/dashboard/ReferralInsightsModal';
import CrossPlatformStats from '@/components/dashboard/CrossPlatformStats';
import ReviewQueueCard from '@/components/dashboard/ReviewQueueCard';

// Snapshot is considered stale after this many days — the planner reads the
// latest snapshot, so a stale one means stale referral data driving the loop.
const SNAPSHOT_STALE_DAYS = 7;

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  // Latest micro1 dashboard snapshot — drives the staleness banner.
  const { data: snapshots = [] } = useQuery({
    queryKey: ['dashboard-snapshots'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('-snapshot_date', 1),
  });
  const latestSnapshot = snapshots[0];
  const daysSinceSnapshot = latestSnapshot?.snapshot_date
    ? Math.floor((Date.now() - new Date(latestSnapshot.snapshot_date).getTime()) / 86400000)
    : null;
  const snapshotStale = daysSinceSnapshot === null || daysSinceSnapshot >= SNAPSHOT_STALE_DAYS;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your referral performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowInsightsModal(true)}>
            <BarChart2 className="w-4 h-4" />
            Referral Insights
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowSnapshotModal(true)}>
            <ClipboardPaste className="w-4 h-4" />
            Paste Dashboard Data
          </Button>
          <Link to="/generator">
            <Button className="gap-2">
              <PenTool className="w-4 h-4" />
              Generate Post
            </Button>
          </Link>
        </div>
      </div>

      <ReferralInsightsModal open={showInsightsModal} onClose={() => setShowInsightsModal(false)} />

      {snapshotStale && (
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setShowSnapshotModal(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowSnapshotModal(true); }}
          className="p-4 border-amber-300 bg-amber-50/60 hover:bg-amber-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {latestSnapshot
                  ? `It's been ${daysSinceSnapshot} days since your last micro1 snapshot`
                  : 'No micro1 dashboard snapshot yet'}
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                The DataAnalystPlanner reads the latest snapshot to track referrals.
                Paste your current dashboard data to keep recommendations sharp.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 bg-white">
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste now
            </Button>
          </div>
        </Card>
      )}

      <DashboardSnapshotModal
        open={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-snapshots'] });
        }}
      />

      <ReviewQueueCard />

      <CrossPlatformStats posts={posts} onSynced={() => queryClient.invalidateQueries({ queryKey: ['generated-posts'] })} />

      <StatsGrid posts={posts} />

      <ReferralStatsGrid />

      <div className="grid lg:grid-cols-2 gap-6">
        <FunnelCard data={posts} />
        <GoalProgress posts={posts} />
      </div>

      <ReferralFunnelCard />

      {/* Charts Row 1 */}
      <PostsOverTimeChart posts={posts} />

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <StrategyBreakdownChart posts={posts} />
        <ScheduleDistributionChart posts={posts} />
      </div>

      {/* Conversion per post */}
      <ConversionMetrics posts={posts} />

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link to="/generator">
            <div className="p-4 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all cursor-pointer group">
              <PenTool className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-medium">Generate New Post</p>
              <p className="text-xs text-muted-foreground mt-1">AI-optimized for engagement</p>
              <ArrowRight className="w-4 h-4 text-primary mt-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/strategy">
            <div className="p-4 rounded-xl bg-accent/5 hover:bg-accent/10 border border-accent/10 transition-all cursor-pointer group">
              <Zap className="w-5 h-5 text-accent mb-2" />
              <p className="text-sm font-medium">View Strategy</p>
              <p className="text-xs text-muted-foreground mt-1">Marketing & recruiting plan</p>
              <ArrowRight className="w-4 h-4 text-accent mt-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/playbook">
            <div className="p-4 rounded-xl bg-chart-3/5 hover:bg-chart-3/10 border border-chart-3/10 transition-all cursor-pointer group">
              <Zap className="w-5 h-5 text-chart-3 mb-2" />
              <p className="text-sm font-medium">Referral Playbook</p>
              <p className="text-xs text-muted-foreground mt-1">Proven tactics to hit 100+</p>
              <ArrowRight className="w-4 h-4 text-chart-3 mt-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </Card>

      {/* Recent Posts */}
      {posts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Recent Posts</h3>
            <Link to="/posts" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{(post.impressions || 0).toLocaleString()} views</span>
                  <span>{post.referrals || 0} refs</span>
                  <span className="font-semibold text-accent">{post.hired || 0} hired</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}