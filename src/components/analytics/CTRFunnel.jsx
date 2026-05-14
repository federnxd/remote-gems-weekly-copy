import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const STEPS = [
  { key: 'impressions', label: 'Impressions', color: 'bg-primary' },
  { key: 'clicks', label: 'Link Clicks', color: 'bg-chart-4' },
  { key: 'referrals', label: 'Referrals', color: 'bg-accent' },
  { key: 'interviews', label: 'Interviews', color: 'bg-chart-3' },
  { key: 'certified', label: 'Certified', color: 'bg-chart-2' },
  { key: 'hired', label: 'Hired', color: 'bg-chart-5' },
];

export default function CTRFunnel({ posts }) {
  const totals = STEPS.map(s => ({
    ...s,
    value: posts.reduce((sum, p) => sum + (p[s.key] || 0), 0),
  }));

  const max = totals[0].value || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Engagement Funnel</CardTitle>
        <p className="text-xs text-muted-foreground">End-to-end conversion from impression to hire</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {totals.map((step, i) => {
            const pct = max > 0 ? (step.value / max) * 100 : 0;
            const dropOff = i > 0 && totals[i - 1].value > 0
              ? (((totals[i - 1].value - step.value) / totals[i - 1].value) * 100).toFixed(0)
              : null;
            return (
              <div key={step.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{step.label}</span>
                  <div className="flex items-center gap-3">
                    {dropOff !== null && (
                      <span className="text-[10px] text-muted-foreground">↓ {dropOff}% drop</span>
                    )}
                    <span className="text-xs font-bold w-16 text-right">{step.value.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded-md overflow-hidden">
                  <div
                    className={`h-full ${step.color} opacity-80 rounded-md transition-all duration-500`}
                    style={{ width: `${Math.max(pct, step.value > 0 ? 1.5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}