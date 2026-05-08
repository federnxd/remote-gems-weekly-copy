import React from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';

export default function PostsOverTimeChart({ posts }) {
  // Build weekly buckets for the last 8 weeks
  const now = new Date();
  const weeks = eachWeekOfInterval({ start: subWeeks(now, 7), end: now });

  const data = weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const inWeek = posts.filter((p) => {
      const d = new Date(p.created_date);
      return d >= weekStart && d <= weekEnd;
    });
    return {
      week: format(weekStart, 'MMM d'),
      posts: inWeek.length,
      impressions: inWeek.reduce((s, p) => s + (p.impressions || 0), 0),
      referrals: inWeek.reduce((s, p) => s + (p.referrals || 0), 0),
    };
  });

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-sm mb-1">Posts & Performance Over Time</h3>
      <p className="text-xs text-muted-foreground mb-4">Weekly breakdown — last 8 weeks</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(214,82%,51%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(214,82%,51%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorReferrals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142,71%,45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(220,13%,91%)' }}
          />
          <Area type="monotone" dataKey="posts" name="Posts" stroke="hsl(214,82%,51%)" strokeWidth={2} fill="url(#colorPosts)" />
          <Area type="monotone" dataKey="referrals" name="Referrals" stroke="hsl(142,71%,45%)" strokeWidth={2} fill="url(#colorReferrals)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}