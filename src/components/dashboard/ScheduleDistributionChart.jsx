import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_COLORS = {
  draft: 'hsl(220,9%,46%)',
  scheduled: 'hsl(38,92%,50%)',
  published: 'hsl(142,71%,45%)',
};

export default function ScheduleDistributionChart({ posts }) {
  const counts = { draft: 0, scheduled: 0, published: 0 };
  posts.forEach((p) => {
    if (p.status && counts[p.status] !== undefined) counts[p.status]++;
  });

  const data = Object.entries(counts).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    color: STATUS_COLORS[status],
  }));

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-sm mb-1">Post Status Distribution</h3>
      <p className="text-xs text-muted-foreground mb-4">Draft vs scheduled vs published</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
          <XAxis dataKey="status" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(220,13%,91%)' }}
          />
          <Bar dataKey="count" name="Posts" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}