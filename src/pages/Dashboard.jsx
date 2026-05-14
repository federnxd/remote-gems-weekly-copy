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
import LinkedInEngagement from '@/components/dashboard/LinkedInEngagement';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PenTool, ArrowRight, Zap, ClipboardPaste } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardSnapshotModal from '@/components/analytics/DashboardSnapshotModal';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

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

      <DashboardSnapshotModal
        open={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['generated-posts'] })}
      />

      <StatsGrid posts={posts} />

      <div className="grid lg:grid-cols-2 gap-6">
        <FunnelCard data={posts} />
        <GoalProgress posts={posts} />
      </div>

      {/* Charts Row 1 */}
      <PostsOverTimeChart posts={posts} />

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <StrategyBreakdownChart posts={posts} />
        <ScheduleDistributionChart posts={posts} />
      </div>

      {/* LinkedIn Engagement */}
      <LinkedInEngagement posts={posts} />

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