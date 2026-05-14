import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Users, Brain, CheckCircle, Award, Briefcase, Trophy, DollarSign, Wallet } from 'lucide-react';

const STATS_CONFIG = [
  { key: 'total_referrals',        label: 'Total Referrals',          icon: Users,        color: 'text-primary bg-primary/10' },
  { key: 'ai_interview_completed', label: 'AI Interview Completed',   icon: Brain,        color: 'text-chart-1 bg-chart-1/10' },
  { key: 'minimum_criteria_met',   label: 'Min. Criteria Met',        icon: CheckCircle,  color: 'text-chart-3 bg-chart-3/10' },
  { key: 'certified',              label: 'Certified',                icon: Award,        color: 'text-accent bg-accent/10' },
  { key: 'matched_to_project',     label: 'Matched to Project',       icon: Briefcase,    color: 'text-chart-4 bg-chart-4/10' },
  { key: 'successful_referrals',   label: 'Successful Referrals',     icon: Trophy,       color: 'text-chart-5 bg-chart-5/10' },
  { key: 'total_cash_earned',      label: 'Total Cash Earned',        icon: DollarSign,   color: 'text-accent bg-accent/10', dollar: true },
  { key: 'available_balance',      label: 'Available Balance',        icon: Wallet,       color: 'text-primary bg-primary/10', dollar: true },
];

export default function ReferralStatsGrid() {
  const { data: snapshots = [] } = useQuery({
    queryKey: ['dashboard-snapshots'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('-snapshot_date', 1),
  });

  const latest = snapshots[0];

  if (!latest) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">micro1 Referral Dashboard</h2>
        <span className="text-xs text-muted-foreground">as of {latest.snapshot_date}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {STATS_CONFIG.map(({ key, label, icon: Icon, color, dollar }) => {
          const raw = latest[key] || 0;
          const display = dollar ? `$${raw.toFixed(2)}` : raw.toLocaleString();
          return (
            <Card key={key} className="p-3 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight leading-tight">{display}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}