import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const SORT_OPTIONS = [
  { key: 'impressions', label: 'Reach' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'hired', label: 'Hired' },
];

export default function TopPostsTable({ posts }) {
  const [sortBy, setSortBy] = useState('impressions');

  const sorted = [...posts]
    .filter(p => (p[sortBy] || 0) > 0)
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Top Performing Posts</CardTitle>
          <div className="flex gap-1">
            {SORT_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => setSortBy(o.key)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  sortBy === o.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No posts with {sortBy} data yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((post, i) => {
              const ctr = post.impressions > 0
                ? ((post.clicks || 0) / post.impressions * 100).toFixed(1) + '%'
                : '—';
              return (
                <div key={post.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{post.title}</p>
                    <p className="text-[10px] text-muted-foreground">{post.strategy?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex gap-3 text-xs shrink-0">
                    <span className="text-muted-foreground">{(post.impressions || 0).toLocaleString()} views</span>
                    <span className="text-chart-4">{ctr} CTR</span>
                    <span className="font-bold text-chart-3">{post[sortBy] || 0} {sortBy === 'impressions' ? '👁' : sortBy === 'clicks' ? '🔗' : sortBy === 'referrals' ? '🙋' : sortBy === 'likes' ? '❤' : sortBy === 'comments' ? '💬' : sortBy === 'shares' ? '🔁' : '✅'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}