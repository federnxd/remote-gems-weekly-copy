import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const STRATEGIES = [
  { key: 'targeted_role', label: 'Targeted Role', color: '#3b82f6' },
  { key: 'storytelling', label: 'Storytelling', color: '#f59e0b' },
  { key: 'urgency', label: 'Urgency', color: '#ef4444' },
  { key: 'social_proof', label: 'Social Proof', color: '#22c55e' },
  { key: 'niche_community', label: 'Niche Community', color: '#a855f7' },
  { key: 'carousel_text', label: 'Carousel Text', color: '#06b6d4' },
];

const METRICS = ['impressions', 'clicks', 'referrals', 'interviews', 'hired'];

function MetricBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-medium w-10 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

export default function StrategyCompareCard({ posts }) {
  const [stratA, setStratA] = useState('storytelling');
  const [stratB, setStratB] = useState('urgency');
  const [metric, setMetric] = useState('impressions');

  const aggregate = (strategy) => {
    const group = posts.filter(p => p.strategy === strategy);
    if (group.length === 0) return null;
    const totals = {};
    METRICS.forEach(m => { totals[m] = group.reduce((s, p) => s + (p[m] || 0), 0); });
    totals.count = group.length;
    totals.avgImpressions = Math.round(totals.impressions / group.length);
    totals.ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(1) : '0.0';
    totals.refRate = totals.impressions > 0 ? ((totals.referrals / totals.impressions) * 100).toFixed(2) : '0.00';
    return totals;
  };

  const dataA = aggregate(stratA);
  const dataB = aggregate(stratB);

  const winner = (key) => {
    if (!dataA || !dataB) return null;
    if (dataA[key] > dataB[key]) return 'A';
    if (dataB[key] > dataA[key]) return 'B';
    return 'tie';
  };

  const colorOf = (key) => STRATEGIES.find(s => s.key === key)?.color || '#94a3b8';
  const labelOf = (key) => STRATEGIES.find(s => s.key === key)?.label || key;

  const rows = [
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'ctr', label: 'CTR %', isRate: true },
    { key: 'referrals', label: 'Referrals' },
    { key: 'refRate', label: 'Ref Rate %', isRate: true },
    { key: 'interviews', label: 'Interviews' },
    { key: 'hired', label: 'Hired' },
    { key: 'count', label: 'Posts' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Strategy Head-to-Head</CardTitle>
        <p className="text-xs text-muted-foreground">Compare two strategies across all saved posts</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pickers */}
        <div className="grid grid-cols-2 gap-3">
          {[['A', stratA, setStratA], ['B', stratB, setStratB]].map(([label, val, setter]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Variant {label}</p>
              <div className="flex flex-wrap gap-1">
                {STRATEGIES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setter(s.key)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-all font-medium ${
                      val === s.key ? 'text-white border-transparent' : 'text-muted-foreground border-border hover:border-current'
                    }`}
                    style={val === s.key ? { backgroundColor: s.color, borderColor: s.color } : {}}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        {(!dataA && !dataB) ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Save posts with metrics to see strategy comparisons.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_2fr_2fr] gap-2 text-[10px] font-semibold text-muted-foreground px-1">
              <span>Metric</span>
              <span style={{ color: colorOf(stratA) }}>{labelOf(stratA)}</span>
              <span style={{ color: colorOf(stratB) }}>{labelOf(stratB)}</span>
            </div>
            {rows.map(row => {
              const vA = dataA ? (dataA[row.key] ?? '—') : '—';
              const vB = dataB ? (dataB[row.key] ?? '—') : '—';
              const w = winner(row.key);
              const maxVal = Math.max(
                typeof vA === 'number' ? vA : 0,
                typeof vB === 'number' ? vB : 0
              );
              return (
                <div key={row.key} className="grid grid-cols-[1fr_2fr_2fr] gap-2 items-center px-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{row.label}</span>
                  <div>
                    {row.isRate ? (
                      <span className={`text-xs font-bold ${w === 'A' ? '' : 'text-muted-foreground'}`}
                        style={w === 'A' ? { color: colorOf(stratA) } : {}}>
                        {vA}{typeof vA === 'number' || typeof vA === 'string' ? '%' : ''}
                        {w === 'A' && <span className="ml-1 text-[9px]">✓ better</span>}
                      </span>
                    ) : (
                      <MetricBar value={typeof vA === 'number' ? vA : 0} max={maxVal} color={colorOf(stratA)} />
                    )}
                  </div>
                  <div>
                    {row.isRate ? (
                      <span className={`text-xs font-bold ${w === 'B' ? '' : 'text-muted-foreground'}`}
                        style={w === 'B' ? { color: colorOf(stratB) } : {}}>
                        {vB}{typeof vB === 'number' || typeof vB === 'string' ? '%' : ''}
                        {w === 'B' && <span className="ml-1 text-[9px]">✓ better</span>}
                      </span>
                    ) : (
                      <MetricBar value={typeof vB === 'number' ? vB : 0} max={maxVal} color={colorOf(stratB)} />
                    )}
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