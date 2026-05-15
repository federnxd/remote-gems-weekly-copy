import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const METRICS = [
  { key: 'impressions', label: 'Impressions', color: '#3b82f6' },
  { key: 'clicks', label: 'Clicks', color: '#f59e0b' },
  { key: 'likes', label: 'Likes', color: '#ec4899' },
  { key: 'comments', label: 'Comments', color: '#8b5cf6' },
  { key: 'shares', label: 'Shares', color: '#06b6d4' },
  { key: 'referrals', label: 'Referrals', color: '#22c55e' },
];

export default function EngagementTrendsChart({ posts }) {
  const [activeMetrics, setActiveMetrics] = useState(['impressions', 'likes', 'referrals']);

  // Build chronological data points from published posts with a scheduled_date
  const dataPoints = posts
    .filter(p => p.scheduled_date || p.created_date)
    .map(p => ({
      ...p,
      _date: p.scheduled_date || p.created_date?.split('T')[0],
    }))
    .sort((a, b) => a._date.localeCompare(b._date));

  // Group by date (aggregate multiple posts on same day)
  const byDate = {};
  dataPoints.forEach(p => {
    if (!byDate[p._date]) byDate[p._date] = { date: p._date, impressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0, referrals: 0, count: 0 };
    METRICS.forEach(m => { byDate[p._date][m.key] += p[m.key] || 0; });
    byDate[p._date].count++;
  });

  const chartData = Object.values(byDate).map(d => ({
    ...d,
    label: (() => { try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; } })(),
  }));

  const toggleMetric = (key) => {
    setActiveMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">Engagement Trends Over Time</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">All published posts by date — toggle metrics below</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all"
              style={{
                backgroundColor: activeMetrics.includes(m.key) ? m.color + '20' : 'transparent',
                borderColor: activeMetrics.includes(m.key) ? m.color : '#e2e8f0',
                color: activeMetrics.includes(m.key) ? m.color : '#94a3b8',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeMetrics.includes(m.key) ? m.color : '#cbd5e1' }}
              />
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length < 2 ? (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
            Not enough data yet — sync from LinkedIn or add post metrics to see trends.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(val, name) => [val.toLocaleString(), name]}
              />
              {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: m.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}