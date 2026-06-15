import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Mail, MessageSquare, Reply, AlertTriangle, Clock, Filter } from 'lucide-react';

// Constants mirroring the backend LIMITS — kept here just for the headroom UI.
// If you tune backend limits, update these to match for accurate headroom display.
const HOUR_CAP = 8;
const DAY_CAP = 20;

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-700' },
  { id: 'facebook',  label: 'Facebook',  color: 'bg-blue-100 text-blue-700' },
  { id: 'threads',   label: 'Threads',   color: 'bg-slate-100 text-slate-700' },
  { id: 'mastodon',  label: 'Mastodon',  color: 'bg-violet-100 text-violet-700' },
  { id: 'bluesky',   label: 'Bluesky',   color: 'bg-sky-100 text-sky-700' },
  { id: 'twitter',   label: 'Twitter',   color: 'bg-zinc-100 text-zinc-700' },
];

const ACTION_TYPES = {
  dm:            { label: 'DM',            icon: Mail,         color: 'text-emerald-600' },
  public_reply:  { label: 'Public reply',  icon: Reply,        color: 'text-amber-600' },
  comment_reply: { label: 'Comment reply', icon: MessageSquare, color: 'text-sky-600' },
};

function StatCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ResponderActivity() {
  const [platformFilter, setPlatformFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  // Pull all recent actions (page caps at 500 — 30 days × ~100/day budget = max ~3,000;
  // 500 is enough for a usable timeline view; deeper history lives in CommunityEngagementLog).
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['responder-actions'],
    queryFn: () => base44.entities.ResponderAction.list('-created_date', 500),
    refetchInterval: 60_000, // refresh every minute so newly-fired actions appear without manual reload
  });

  // 24h windows for the top metrics + headroom view.
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    return actions.filter(a => a.created_date && new Date(a.created_date).getTime() >= cutoff);
  }, [actions]);

  const lastHour = useMemo(() => {
    const cutoff = Date.now() - 3600 * 1000;
    return actions.filter(a => a.created_date && new Date(a.created_date).getTime() >= cutoff);
  }, [actions]);

  // Filtered timeline based on chips.
  const filtered = useMemo(() => {
    return actions.filter(a => {
      if (platformFilter !== 'all' && a.platform !== platformFilter) return false;
      if (actionFilter === 'all') return true;
      if (actionFilter === 'errors') return a.status === 'error' || a.status === 'rate_limited';
      return a.action_type === actionFilter;
    });
  }, [actions, platformFilter, actionFilter]);

  // Counts for top metrics.
  const dmsLast24 = last24h.filter(a => a.action_type === 'dm' && a.status === 'sent').length;
  const repliesLast24 = last24h.filter(a => a.action_type === 'comment_reply' && a.status === 'sent').length;
  const publicLast24 = last24h.filter(a => a.action_type === 'public_reply' && a.status === 'sent').length;
  const errorsLast24 = last24h.filter(a => a.status === 'error' || a.status === 'rate_limited').length;

  // Per-platform headroom: how many of the day/hour budgets are used.
  const headroom = useMemo(() => {
    const out = {};
    for (const p of PLATFORMS) {
      const dayCount = last24h.filter(a => a.platform === p.id && a.status === 'sent').length;
      const hourCount = lastHour.filter(a => a.platform === p.id && a.status === 'sent').length;
      out[p.id] = { dayCount, hourCount };
    }
    return out;
  }, [last24h, lastHour]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Responder Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            What the community-managing responder has done on your behalf. Last 30 days. Auto-refreshes every minute.
          </p>
        </div>
      </div>

      {/* Top metrics — last 24 hours */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="DMs sent" value={dmsLast24} sub="last 24h" color="text-emerald-600" />
        <StatCard label="Comment replies" value={repliesLast24} sub="last 24h" color="text-sky-600" />
        <StatCard label="Public replies" value={publicLast24} sub="last 24h" color="text-amber-600" />
        <StatCard label="Errors / rate-limited" value={errorsLast24} sub="last 24h" color={errorsLast24 > 0 ? 'text-destructive' : 'text-muted-foreground'} />
      </div>

      {/* Per-platform headroom */}
      <Card className="p-5">
        <h2 className="font-semibold mb-3 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" /> Platform usage vs. limits (new-account caps)
        </h2>
        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const room = headroom[p.id] || { dayCount: 0, hourCount: 0 };
            const dayPct = Math.min(100, (room.dayCount / DAY_CAP) * 100);
            const hourPct = Math.min(100, (room.hourCount / HOUR_CAP) * 100);
            return (
              <div key={p.id} className="grid grid-cols-12 gap-3 items-center text-xs">
                <span className={`col-span-2 px-2 py-1 rounded text-center font-medium ${p.color}`}>{p.label}</span>
                <div className="col-span-5">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                    <span>Today</span><span>{room.dayCount} / {DAY_CAP}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${dayPct > 80 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${dayPct}%` }} />
                  </div>
                </div>
                <div className="col-span-5">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                    <span>Last hour</span><span>{room.hourCount} / {HOUR_CAP}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${hourPct > 80 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${hourPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Platform:</span>
        {['all', ...PLATFORMS.map(p => p.id)].map(p => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${platformFilter === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {p === 'all' ? 'All' : PLATFORMS.find(x => x.id === p)?.label || p}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-3 mr-1">Type:</span>
        {[
          { id: 'all', label: 'All actions' },
          { id: 'dm', label: 'DMs' },
          { id: 'comment_reply', label: 'Comment replies' },
          { id: 'public_reply', label: 'Public replies' },
          { id: 'errors', label: 'Errors' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActionFilter(t.id)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${actionFilter === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Card className="divide-y">
        {isLoading && (
          <div className="p-4 space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No responder actions matching the current filter.
            {actions.length === 0 && <div className="text-xs mt-2">When someone comments "Remote" on a post or replies to one of your posts, it'll show up here.</div>}
          </div>
        )}
        {!isLoading && filtered.map(a => {
          const at = ACTION_TYPES[a.action_type] || ACTION_TYPES.comment_reply;
          const Icon = at.icon;
          const platform = PLATFORMS.find(p => p.id === a.platform);
          const isProblem = a.status === 'error' || a.status === 'rate_limited';
          return (
            <div key={a.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 mt-0.5 ${isProblem ? 'text-destructive' : at.color}`}>
                  {isProblem ? <AlertTriangle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{at.label}</span>
                    {platform && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${platform.color}`}>{platform.label}</span>}
                    {a.recipient_handle && a.recipient_handle !== 'unknown' && (
                      <span className="text-muted-foreground">to <span className="font-medium text-foreground">@{a.recipient_handle}</span></span>
                    )}
                    {isProblem && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">{a.status}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{timeAgo(a.created_date)}</span>
                  </div>
                  {a.trigger_text && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                      Triggered by: "{a.trigger_text}"
                    </p>
                  )}
                  {a.notes && (
                    <p className="text-xs text-destructive/80 mt-1">{a.notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
