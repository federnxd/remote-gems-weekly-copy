import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Map strategy → implied platform focus (since posts don't store platform yet,
// we derive a best-effort platform label from the post strategy)
const STRATEGY_PLATFORM_MAP = {
  targeted_role: 'LinkedIn',
  storytelling: 'LinkedIn',
  urgency: 'LinkedIn / Twitter',
  social_proof: 'LinkedIn',
  niche_community: 'Reddit / Discord',
  carousel_text: 'LinkedIn',
};

function pct(num, denom) {
  if (!denom) return '—';
  return ((num / denom) * 100).toFixed(1) + '%';
}

export default function PlatformPerformanceTable({ posts }) {
  // Group posts by derived platform
  const groups = {};
  posts.forEach(post => {
    const platform = STRATEGY_PLATFORM_MAP[post.strategy] || 'Other';
    if (!groups[platform]) groups[platform] = [];
    groups[platform].push(post);
  });

  const rows = Object.entries(groups).map(([platform, group]) => {
    const impressions = group.reduce((s, p) => s + (p.impressions || 0), 0);
    const clicks = group.reduce((s, p) => s + (p.clicks || 0), 0);
    const referrals = group.reduce((s, p) => s + (p.referrals || 0), 0);
    const hired = group.reduce((s, p) => s + (p.hired || 0), 0);
    return { platform, count: group.length, impressions, clicks, referrals, hired };
  }).sort((a, b) => b.impressions - a.impressions);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Performance by Platform / Strategy Channel</CardTitle>
        <p className="text-xs text-muted-foreground">Grouped by post strategy type — update posts with platform data for exact breakdowns</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Platform', 'Posts', 'Impressions', 'Clicks', 'CTR', 'Referrals', 'Ref Rate', 'Hired'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No data yet — add metrics to your posts to see breakdowns.</td>
                </tr>
              )}
              {rows.map(row => (
                <tr key={row.platform} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.platform}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.count}</td>
                  <td className="px-4 py-3">{row.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3">{row.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-chart-4">{pct(row.clicks, row.impressions)}</td>
                  <td className="px-4 py-3">{row.referrals.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-accent">{pct(row.referrals, row.impressions)}</td>
                  <td className="px-4 py-3 font-bold text-chart-3">{row.hired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}