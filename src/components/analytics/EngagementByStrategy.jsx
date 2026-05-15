import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STRATEGY_COLORS = {
  targeted_role: '#3b82f6',
  storytelling: '#f59e0b',
  urgency: '#ef4444',
  social_proof: '#22c55e',
  niche_community: '#a855f7',
  carousel_text: '#06b6d4',
};

const METRICS = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'hired', label: 'Hired' },
];

export default function EngagementByStrategy({ posts }) {
  const [metric, setMetric] = React.useState('impressions');

  const grouped = {};
  posts.forEach(p => {
    const s = p.strategy || 'unknown';
    if (!grouped[s]) grouped[s] = 0;
    grouped[s] += p[metric] || 0;
  });

  const data = Object.entries(grouped).map(([strategy, value]) => ({
    name: strategy.replace(/_/g, ' '),
    value,
    strategy,
  })).sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Engagement by Strategy</CardTitle>
          <div className="flex gap-1">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  metric === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 || data.every(d => d.value === 0) ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            No data — add metrics to posts to see strategy performance.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(val) => [val.toLocaleString(), metric]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={STRATEGY_COLORS[entry.strategy] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}