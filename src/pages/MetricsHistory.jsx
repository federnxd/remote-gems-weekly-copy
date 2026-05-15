import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, History, Sparkles } from 'lucide-react';
import StrategicInsights from '@/components/history/StrategicInsights';

const FUNNEL_KEYS = [
  { key: 'total_referrals',        label: 'Referrals',          color: '#3b82f6' },
  { key: 'ai_interview_completed', label: 'AI Interview',       color: '#8b5cf6' },
  { key: 'minimum_criteria_met',   label: 'Min Criteria',       color: '#f59e0b' },
  { key: 'certified',              label: 'Certified',          color: '#10b981' },
  { key: 'matched_to_project',     label: 'Matched',            color: '#06b6d4' },
  { key: 'successful_referrals',   label: 'Successful',         color: '#f43f5e' },
];

const LINKEDIN_KEYS = [
  { key: 'impressions',     label: 'Impressions',  color: '#3b82f6' },
  { key: 'reach',           label: 'Reach',        color: '#8b5cf6' },
  { key: 'reactions',       label: 'Reactions',    color: '#f59e0b' },
  { key: 'link_clicks',     label: 'Link Clicks',  color: '#10b981' },
  { key: 'followers_gained',label: 'Followers',    color: '#f43f5e' },
];

const EARNINGS_KEYS = [
  { key: 'total_cash_earned',  label: 'Total Earned ($)',  color: '#10b981' },
  { key: 'available_balance',  label: 'Available ($)',     color: '#3b82f6' },
];

function DeltaBadge({ current, previous }) {
  if (previous == null || previous === 0) return null;
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-semibold"><TrendingUp className="w-3 h-3" />+{pct}%</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive font-semibold"><TrendingDown className="w-3 h-3" />{pct}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="w-3 h-3" />0%</span>;
}

function MetricChart({ data, keys, areaMode = false }) {
  const Comp = areaMode ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <Comp data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {keys.map(({ key, label, color }) =>
          areaMode ? (
            <Area key={key} type="monotone" dataKey={key} name={label} stroke={color} fill={color} fillOpacity={0.08} strokeWidth={2} dot={{ r: 3 }} />
          ) : (
            <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          )
        )}
      </Comp>
    </ResponsiveContainer>
  );
}

export default function MetricsHistory() {
  const [tab, setTab] = useState('funnel');

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['dashboard-snapshots-all'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('snapshot_date'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground space-y-2">
        <History className="w-12 h-12 mx-auto opacity-30" />
        <p className="font-medium">No snapshots yet</p>
        <p className="text-sm">Paste your first dashboard data from the Dashboard page to start tracking history.</p>
      </div>
    );
  }

  const chartData = snapshots.map(s => ({
    date: s.snapshot_date,
    ...s,
  }));

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const summaryStats = [
    { key: 'total_referrals', label: 'Referrals' },
    { key: 'certified', label: 'Certified' },
    { key: 'successful_referrals', label: 'Hired' },
    { key: 'total_cash_earned', label: 'Cash Earned', dollar: true },
    { key: 'impressions', label: 'Impressions' },
    { key: 'link_clicks', label: 'Link Clicks' },
    { key: 'followers_gained', label: 'New Followers' },
    { key: 'reactions', label: 'Reactions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Metrics History
          </h1>
          <p className="text-sm text-muted-foreground">{snapshots.length} snapshots recorded • showing evolution over time</p>
        </div>
      </div>

      {/* Latest vs Previous summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {summaryStats.map(({ key, label, dollar }) => {
          const val = latest[key] || 0;
          const prevVal = prev ? (prev[key] || 0) : null;
          return (
            <Card key={key} className="p-3">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-bold leading-tight">{dollar ? `$${val.toFixed(0)}` : val.toLocaleString()}</p>
              <DeltaBadge current={val} previous={prevVal} />
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="funnel">Referral Funnel</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn Engagement</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="mt-4">
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">Referral Funnel Over Time</h3>
            <MetricChart data={chartData} keys={FUNNEL_KEYS} />
          </Card>
        </TabsContent>

        <TabsContent value="linkedin" className="mt-4">
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">LinkedIn Engagement Over Time</h3>
            <MetricChart data={chartData} keys={LINKEDIN_KEYS} areaMode />
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="mt-4">
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-4">Earnings Over Time</h3>
            <MetricChart data={chartData} keys={EARNINGS_KEYS} areaMode />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Snapshot table */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-4">Snapshot Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left pb-2 pr-4">Date</th>
                <th className="text-right pb-2 pr-4">Referrals</th>
                <th className="text-right pb-2 pr-4">Certified</th>
                <th className="text-right pb-2 pr-4">Hired</th>
                <th className="text-right pb-2 pr-4">Impressions</th>
                <th className="text-right pb-2 pr-4">Link Clicks</th>
                <th className="text-right pb-2">Cash Earned</th>
              </tr>
            </thead>
            <tbody>
              {[...snapshots].reverse().map((s, i) => {
                const prevS = snapshots[snapshots.length - 2 - i];
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{s.snapshot_date}</td>
                    <td className="py-2 pr-4 text-right">{(s.total_referrals || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">{(s.certified || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-accent font-semibold">{(s.successful_referrals || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">{(s.impressions || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">{(s.link_clicks || 0).toLocaleString()}</td>
                    <td className="py-2 text-right text-green-600 font-semibold">${(s.total_cash_earned || 0).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AI Insights */}
      <StrategicInsights snapshots={snapshots} />
    </div>
  );
}