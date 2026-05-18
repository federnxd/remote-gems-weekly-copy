import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, ClipboardPaste, Eye, Users, ThumbsUp, MessageSquare, Share2, MousePointer, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

const STATS = [
  { key: 'impressions',      label: 'Impressions',       icon: Eye,          color: 'text-blue-600 bg-blue-50' },
  { key: 'reach',            label: 'Members Reached',   icon: Users,        color: 'text-indigo-600 bg-indigo-50' },
  { key: 'reactions',        label: 'Reactions',         icon: ThumbsUp,     color: 'text-pink-600 bg-pink-50' },
  { key: 'comments',         label: 'Comments',          icon: MessageSquare,color: 'text-amber-600 bg-amber-50' },
  { key: 'reposts',          label: 'Reposts',           icon: Share2,       color: 'text-purple-600 bg-purple-50' },
  { key: 'link_clicks',      label: 'Link Clicks',       icon: MousePointer, color: 'text-green-600 bg-green-50' },
  { key: 'followers_gained', label: 'New Followers',     icon: UserPlus,     color: 'text-teal-600 bg-teal-50' },
];

export default function LinkedInOverallStats({ onPasteClick }) {
  const { data: snapshots = [] } = useQuery({
    queryKey: ['dashboard-snapshots'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('-snapshot_date', 1),
  });

  const latest = snapshots[0];

  if (!latest || !latest.impressions) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0a66c2]" />
            <h3 className="font-semibold text-sm">LinkedIn Profile Analytics</h3>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onPasteClick}>
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste Data
          </Button>
        </div>
        <p className="text-sm text-muted-foreground py-3">
          No LinkedIn analytics yet. Click "Paste Dashboard Data" to add your stats from LinkedIn.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Linkedin className="w-4 h-4 text-[#0a66c2]" />
          <h3 className="font-semibold text-sm">LinkedIn Profile Analytics</h3>
          <span className="text-xs text-muted-foreground">
            · {format(new Date(latest.snapshot_date), 'MMM d, yyyy')}
          </span>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onPasteClick}>
          <ClipboardPaste className="w-3.5 h-3.5" />
          Update
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STATS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className={`rounded-xl p-3 text-center ${color.split(' ')[1]}`}>
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color.split(' ')[0]}`} />
            <p className={`text-lg font-bold ${color.split(' ')[0]}`}>
              {(latest[key] || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}