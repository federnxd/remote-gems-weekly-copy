import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Linkedin, ClipboardPaste } from 'lucide-react';
import LinkedInEngagement from '@/components/dashboard/LinkedInEngagement';
import LinkedInOverallStats from '@/components/dashboard/LinkedInOverallStats';
import DashboardSnapshotModal from '@/components/analytics/DashboardSnapshotModal';
import { EngagementTrendChart, StrategyPerformanceChart, TopPostsChart, EngagementMixChart } from '@/components/platforms/PlatformAnalyticsCharts';

export default function LinkedInDashboard() {
  const queryClient = useQueryClient();
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const publishedPosts = posts.filter(p => p.status === 'published' && p.linkedin_post_id);

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
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSnapshotModal(true)}>
          <ClipboardPaste className="w-4 h-4" /> Paste Analytics
        </Button>
      </div>

      <DashboardSnapshotModal
        open={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-snapshots'] });
          queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
        }}
      />

      {/* Profile-level analytics (from manual paste) */}
      <LinkedInOverallStats onPasteClick={() => setShowSnapshotModal(true)} />

      {/* Analytics Charts */}
      {publishedPosts.length >= 2 && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <EngagementTrendChart
              posts={publishedPosts}
              engagementFn={p => p.impressions > 0 ? parseFloat(((( p.likes || 0) + (p.comments || 0) + (p.shares || 0)) / p.impressions * 100).toFixed(2)) : 0}
              color="#0a66c2"
            />
            <StrategyPerformanceChart
              posts={publishedPosts}
              engagementFn={p => p.impressions > 0 ? parseFloat(((( p.likes || 0) + (p.comments || 0) + (p.shares || 0)) / p.impressions * 100).toFixed(2)) : 0}
              color="#0a66c2"
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <TopPostsChart posts={publishedPosts} metricKey="impressions" metricLabel="Impressions" color="#0a66c2" />
            <EngagementMixChart
              metrics={[
                { label: 'Likes', value: publishedPosts.reduce((s, p) => s + (p.likes || 0), 0) },
                { label: 'Comments', value: publishedPosts.reduce((s, p) => s + (p.comments || 0), 0) },
                { label: 'Shares', value: publishedPosts.reduce((s, p) => s + (p.shares || 0), 0) },
                { label: 'Clicks', value: publishedPosts.reduce((s, p) => s + (p.clicks || 0), 0) },
              ]}
              colors={['#0a66c2', '#f59e0b', '#9333ea', '#22c55e']}
            />
          </div>
        </>
      )}

      {/* Per-post engagement (auto-synced from LinkedIn API) */}
      <LinkedInEngagement posts={posts} />
    </div>
  );
}