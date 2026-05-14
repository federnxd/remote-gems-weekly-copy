import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlatformPerformanceTable from '@/components/analytics/PlatformPerformanceTable';
import EngagementByStrategy from '@/components/analytics/EngagementByStrategy';
import TopPostsTable from '@/components/analytics/TopPostsTable';
import CTRFunnel from '@/components/analytics/CTRFunnel';
import StrategyCompareCard from '@/components/analytics/StrategyCompareCard';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Eye, MousePointerClick, Users, UserCheck } from 'lucide-react';

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
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

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

  const published = posts.filter(p => p.status === 'published' || (p.impressions || 0) > 0);
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalClicks = posts.reduce((s, p) => s + (p.clicks || 0), 0);
  const totalReferrals = posts.reduce((s, p) => s + (p.referrals || 0), 0);
  const totalHired = posts.reduce((s, p) => s + (p.hired || 0), 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const referralRate = totalImpressions > 0 ? ((totalReferrals / totalImpressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform performance & content insights across {posts.length} posts</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Impressions" value={totalImpressions.toLocaleString()} sub={`${published.length} posts with data`} color="text-primary" />
        <StatCard icon={MousePointerClick} label="Link Click-Through Rate" value={`${avgCTR}%`} sub={`${totalClicks.toLocaleString()} total clicks`} color="text-chart-4" />
        <StatCard icon={Users} label="Referral Rate" value={`${referralRate}%`} sub={`${totalReferrals.toLocaleString()} referrals`} color="text-accent" />
        <StatCard icon={UserCheck} label="Total Hired" value={totalHired} sub="from all posts combined" color="text-chart-3" />
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

      {/* A/B Strategy Comparison */}
      <StrategyCompareCard posts={posts} />
    </div>
  );
}