import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ConversionMetrics({ posts }) {
  // Per-post average conversion estimates
  const published = posts.filter(p => p.status === 'published' || p.impressions > 0);

  const data = published.slice(-10).map((p) => ({
    name: p.title?.split(' ').slice(0, 3).join(' ') + '…' || 'Post',
    impressions: p.impressions || 0,
    referrals: p.referrals || 0,
    hired: p.hired || 0,
  }));

  if (data.length === 0) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No performance data yet — publish posts to see metrics</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-sm mb-1">Per-Post Conversion</h3>
      <p className="text-xs text-muted-foreground mb-4">Last 10 posts with performance data</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(220,13%,91%)' }} />
          <Bar dataKey="impressions" name="Impressions" fill="hsl(214,82%,51%)" radius={[4,4,0,0]} opacity={0.7} />
          <Bar dataKey="referrals" name="Referrals" fill="hsl(38,92%,50%)" radius={[4,4,0,0]} />
          <Bar dataKey="hired" name="Hired" fill="hsl(142,71%,45%)" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}