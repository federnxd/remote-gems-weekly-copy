import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STRATEGY_COLORS = {
  targeted_role: 'hsl(214,82%,51%)',
  storytelling: 'hsl(142,71%,45%)',
  urgency: 'hsl(0,84%,60%)',
  social_proof: 'hsl(38,92%,50%)',
  niche_community: 'hsl(262,83%,58%)',
  carousel_text: 'hsl(199,89%,48%)',
};

export default function StrategyBreakdownChart({ posts }) {
  const counts = {};
  posts.forEach((p) => {
    if (p.strategy) counts[p.strategy] = (counts[p.strategy] || 0) + 1;
  });

  const data = Object.entries(counts).map(([key, value]) => ({
    name: key.replace(/_/g, ' '),
    value,
    color: STRATEGY_COLORS[key] || 'hsl(220,9%,46%)',
  }));

  if (data.length === 0) {
    return (
      <Card className="p-6 flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No posts yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-sm mb-1">Strategy Breakdown</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribution of post strategies used</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(220,13%,91%)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}