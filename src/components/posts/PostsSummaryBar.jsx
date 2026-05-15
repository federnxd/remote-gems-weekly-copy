import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, MousePointerClick, Users, UserCheck, BadgeCheck, Briefcase } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  );
}

export default function PostsSummaryBar({ posts, onExport }) {
  const totals = posts.reduce(
    (acc, p) => ({
      impressions: acc.impressions + (p.impressions || 0),
      clicks:      acc.clicks      + (p.clicks      || 0),
      referrals:   acc.referrals   + (p.referrals   || 0),
      interviews:  acc.interviews  + (p.interviews  || 0),
      certified:   acc.certified   + (p.certified   || 0),
      hired:       acc.hired       + (p.hired       || 0),
    }),
    { impressions: 0, clicks: 0, referrals: 0, interviews: 0, certified: 0, hired: 0 }
  );

  const ctr    = totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
  const refRate = totals.clicks ? ((totals.referrals / totals.clicks) * 100).toFixed(1) : '0.0';
  const hireRate = totals.referrals ? ((totals.hired / totals.referrals) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aggregate Performance</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Eye}              label="Impressions"  value={totals.impressions.toLocaleString()} sub={`CTR ${ctr}%`}         color="bg-primary/10 text-primary" />
        <StatCard icon={MousePointerClick} label="Clicks"       value={totals.clicks.toLocaleString()}      sub={`${ctr}% of impressions`} color="bg-chart-4/10 text-chart-4" />
        <StatCard icon={Users}            label="Referrals"    value={totals.referrals.toLocaleString()}   sub={`${refRate}% of clicks`}  color="bg-chart-3/10 text-chart-3" />
        <StatCard icon={UserCheck}        label="Interviews"   value={totals.interviews.toLocaleString()}  sub=""                         color="bg-chart-2/10 text-chart-2" />
        <StatCard icon={BadgeCheck}       label="Certified"    value={totals.certified.toLocaleString()}   sub=""                         color="bg-accent/10 text-accent" />
        <StatCard icon={Briefcase}        label="Hired"        value={totals.hired.toLocaleString()}       sub={`${hireRate}% of referrals`} color="bg-green-500/10 text-green-600" />
      </div>
    </div>
  );
}