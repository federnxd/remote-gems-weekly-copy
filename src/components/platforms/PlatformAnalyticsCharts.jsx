import React from 'react';
import { Card } from '@/components/ui/card';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Target, Award, BarChart2 } from 'lucide-react';

// Engagement rate trend over time (line chart)
function EngagementTrendChart({ posts, engagementFn, color }) {
  const data = posts.slice(-12).map((p, i) => ({
    name: p.title?.slice(0, 12) + '…',
    idx: i + 1,
    rate: engagementFn(p),
  }));
  if (data.length < 2) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Engagement Rate Trend</h3>
        <span className="text-xs text-muted-foreground ml-auto">last {data.length} posts</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="idx" tick={{ fontSize: 10 }} label={{ value: 'Post #', position: 'insideBottom', offset: -2, fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}%`} />
          <Tooltip formatter={(v) => [`${v.toFixed(2)}%`, 'Eng. Rate']} labelFormatter={(l) => `Post ${l}`} />
          <Line type="monotone" dataKey="rate" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Strategy performance – avg engagement per strategy
function StrategyPerformanceChart({ posts, engagementFn, color }) {
  const stratMap = {};
  posts.forEach(p => {
    const s = p.strategy?.replace(/_/g, ' ') || 'unknown';
    if (!stratMap[s]) stratMap[s] = { total: 0, count: 0 };
    stratMap[s].total += engagementFn(p);
    stratMap[s].count += 1;
  });
  const data = Object.entries(stratMap)
    .map(([strategy, { total, count }]) => ({ strategy, avg: parseFloat((total / count).toFixed(2)), count }))
    .sort((a, b) => b.avg - a.avg);
  if (data.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Avg Engagement by Strategy</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="strategy" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(v) => [`${v}%`, 'Avg Eng.']} />
          <Bar dataKey="avg" fill={color} radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, formatter: v => `${v}%` }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Top 5 posts by engagement metric
function TopPostsChart({ posts, metricKey, metricLabel, color }) {
  const sorted = [...posts]
    .filter(p => (p[metricKey] || 0) > 0)
    .sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0))
    .slice(0, 5);
  if (sorted.length === 0) return null;
  const data = sorted.map(p => ({
    name: p.title?.slice(0, 18) + (p.title?.length > 18 ? '…' : ''),
    value: p[metricKey] || 0,
  }));
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Top 5 Posts by {metricLabel}</h3>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{d.name}</p>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.value / data[0].value) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
            <span className="text-xs font-bold flex-shrink-0" style={{ color }}>{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Engagement mix donut
function EngagementMixChart({ metrics, colors }) {
  const data = metrics.filter(m => m.value > 0);
  if (data.length === 0) return null;
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Engagement Mix</h3>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={70} labelLine={false} label={renderLabel}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-xs text-muted-foreground flex-1">{m.label}</span>
              <span className="text-xs font-semibold">{m.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export { EngagementTrendChart, StrategyPerformanceChart, TopPostsChart, EngagementMixChart };