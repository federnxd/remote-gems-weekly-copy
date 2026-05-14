import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, TrendingDown } from 'lucide-react';

const STAGES = [
  { key: 'total_referrals', label: 'Total Referrals', color: 'bg-primary' },
  { key: 'ai_interview_completed', label: 'AI Interview Done', color: 'bg-chart-1' },
  { key: 'minimum_criteria_met', label: 'Min. Criteria Met', color: 'bg-chart-3' },
  { key: 'certified', label: 'Certified', color: 'bg-accent' },
  { key: 'matched_to_project', label: 'Matched to Project', color: 'bg-chart-4' },
  { key: 'successful_referrals', label: 'Successful Referrals', color: 'bg-chart-5' },
];

export default function ReferralFunnelCard() {
  const { data: snapshots = [] } = useQuery({
    queryKey: ['dashboard-snapshots'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('-snapshot_date', 1),
  });

  const latest = snapshots[0];

  if (!latest) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[200px] border-dashed">
        <Users className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No referral data yet</p>
        <p className="text-xs text-muted-foreground mt-1">Use "Paste Dashboard Data" to add your first snapshot</p>
      </Card>
    );
  }

  const top = latest.total_referrals || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Referral Funnel</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">as of {latest.snapshot_date}</p>
            {(latest.total_cash_earned > 0 || latest.available_balance > 0) && (
              <p className="text-xs font-semibold text-accent mt-0.5">
                ${latest.total_cash_earned?.toFixed(2)} earned · ${latest.available_balance?.toFixed(2)} available
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {STAGES.map((stage, i) => {
          const value = latest[stage.key] || 0;
          const prev = i > 0 ? (latest[STAGES[i - 1].key] || 0) : null;
          const dropPct = prev && prev > 0 ? Math.round(((prev - value) / prev) * 100) : null;
          const width = Math.round((value / top) * 100);

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{stage.label}</span>
                <div className="flex items-center gap-2">
                  {dropPct !== null && dropPct > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" />-{dropPct}%
                    </span>
                  )}
                  <span className="text-sm font-bold tabular-nums">{value.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stage.color}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}