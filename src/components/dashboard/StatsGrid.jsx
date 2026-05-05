import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, Eye, UserCheck } from 'lucide-react';

export default function StatsGrid({ posts }) {
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalReferrals = posts.reduce((s, p) => s + (p.referrals || 0), 0);
  const totalHired = posts.reduce((s, p) => s + (p.hired || 0), 0);
  const conversionRate = totalReferrals > 0 
    ? ((totalHired / totalReferrals) * 100).toFixed(1) 
    : '0';

  const stats = [
    { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-primary bg-primary/10' },
    { label: 'Referrals', value: totalReferrals, icon: Users, color: 'text-chart-4 bg-chart-4/10' },
    { label: 'Hired', value: totalHired, icon: UserCheck, color: 'text-accent bg-accent/10' },
    { label: 'Conversion', value: conversionRate + '%', icon: TrendingUp, color: 'text-chart-3 bg-chart-3/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}