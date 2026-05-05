import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const funnelSteps = [
  { key: 'impressions', label: 'Impressions', color: 'bg-primary/10 text-primary' },
  { key: 'clicks', label: 'Clicks', color: 'bg-chart-3/10 text-chart-3' },
  { key: 'referrals', label: 'Referrals', color: 'bg-chart-4/10 text-chart-4' },
  { key: 'interviews', label: 'Interviews', color: 'bg-chart-2/10 text-chart-2' },
  { key: 'certified', label: 'Certified', color: 'bg-accent/10 text-accent' },
  { key: 'hired', label: 'Hired', color: 'bg-accent text-accent-foreground' },
];

export default function FunnelCard({ data }) {
  const totals = {
    impressions: data.reduce((s, p) => s + (p.impressions || 0), 0),
    clicks: data.reduce((s, p) => s + (p.clicks || 0), 0),
    referrals: data.reduce((s, p) => s + (p.referrals || 0), 0),
    interviews: data.reduce((s, p) => s + (p.interviews || 0), 0),
    certified: data.reduce((s, p) => s + (p.certified || 0), 0),
    hired: data.reduce((s, p) => s + (p.hired || 0), 0),
  };

  const getRate = (current, previous) => {
    if (!previous || previous === 0) return '—';
    return ((current / previous) * 100).toFixed(1) + '%';
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-sm text-foreground mb-4">Referral Funnel</h3>
      <div className="space-y-3">
        {funnelSteps.map((step, i) => {
          const value = totals[step.key];
          const prevValue = i > 0 ? totals[funnelSteps[i - 1].key] : null;
          const rate = i > 0 ? getRate(value, prevValue) : null;
          const barWidth = totals.impressions > 0 
            ? Math.max(4, (value / totals.impressions) * 100) 
            : (i === 0 ? 100 : 4);
          
          return (
            <div key={step.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
                <div className="flex items-center gap-2">
                  {rate && <span className="text-[10px] text-muted-foreground">{rate}</span>}
                  <span className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", step.color.split(' ')[0].replace('/10', ''))}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}