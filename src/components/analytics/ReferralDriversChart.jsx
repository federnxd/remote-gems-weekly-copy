import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const STRATEGY_COLORS = {
  targeted_role: '#3b82f6',
  storytelling: '#f59e0b',
  urgency: '#ef4444',
  social_proof: '#22c55e',
  niche_community: '#a855f7',
  carousel_text: '#06b6d4',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 shadow text-xs space-y-1">
      <p className="font-semibold truncate max-w-[180px]">{d.title}</p>
      <p className="text-muted-foreground capitalize">{d.strategy?.replace(/_/g, ' ')}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
        <span className="text-pink-500">❤ {d.likes} likes</span>
        <span className="text-purple-500">💬 {d.comments} comments</span>
        <span className="text-cyan-500">🔁 {d.shares} shares</span>
        <span className="text-green-500">🙋 {d.referrals} referrals</span>
      </div>
    </div>
  );
};

export default function ReferralDriversChart({ posts }) {
  // Scatter: x = engagement score (likes+comments+shares), y = referrals
  const data = posts
    .filter(p => p.status === 'published')
    .map(p => ({
      ...p,
      engagement: (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
      referrals: p.referrals || 0,
    }))
    .filter(p => p.engagement > 0 || p.referrals > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Engagement vs. Referrals</CardTitle>
        <p className="text-[11px] text-muted-foreground">Identify which posts convert engagement into actual referrals</p>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">
            Needs at least 2 published posts with engagement data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="engagement"
                name="Engagement"
                tick={{ fontSize: 10 }}
                label={{ value: 'Engagement (likes+comments+shares)', position: 'insideBottom', offset: -2, fontSize: 9 }}
                height={36}
              />
              <YAxis
                dataKey="referrals"
                name="Referrals"
                tick={{ fontSize: 10 }}
                label={{ value: 'Referrals', angle: -90, position: 'insideLeft', fontSize: 9 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={data}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={STRATEGY_COLORS[entry.strategy] || '#94a3b8'} fillOpacity={0.8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(STRATEGY_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}