import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Circle, Flame, Clock, CalendarCheck } from 'lucide-react';
import { DAILY_ACTIVITIES, todayKey } from '@/lib/daily-activities';
import GrowthHelper from '@/components/growth/GrowthHelper';

const PLATFORM_ORDER = ['linkedin', 'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads'];

export default function DailyGrowth() {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState('linkedin');
  const today = todayKey();

  // All activity records for the last ~60 days (for streak + today's checks).
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['daily-activities'],
    queryFn: () => base44.entities.DailyActivity.list('-activity_date', 1000),
  });

  const platformDef = DAILY_ACTIVITIES[platform];
  const activities = platformDef?.activities || [];

  // Map of activity_key -> record, for THIS platform TODAY.
  const todayMap = useMemo(() => {
    const m = {};
    for (const r of records) {
      if (r.activity_date === today && r.platform === platform) m[r.activity_key] = r;
    }
    return m;
  }, [records, today, platform]);

  const toggle = async (activityKey) => {
    const existing = todayMap[activityKey];
    try {
      if (existing) {
        await base44.entities.DailyActivity.update(existing.id, { completed: !existing.completed });
      } else {
        await base44.entities.DailyActivity.create({
          activity_date: today,
          platform,
          activity_key: activityKey,
          completed: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['daily-activities'] });
    } catch {
      // swallow — UI will reflect server state on next refetch
    }
  };

  // Today's completion for the selected platform (daily activities only).
  const dailyOnly = activities.filter(a => !a.weekly);
  const doneToday = dailyOnly.filter(a => todayMap[a.key]?.completed).length;
  const pct = dailyOnly.length ? Math.round((doneToday / dailyOnly.length) * 100) : 0;

  // Streak: consecutive days (ending today or yesterday) where ANY activity was
  // completed on this platform. A light, forgiving streak — rewards showing up.
  const streak = useMemo(() => {
    const daysWithActivity = new Set(
      records.filter(r => r.platform === platform && r.completed).map(r => r.activity_date)
    );
    let count = 0;
    const d = new Date();
    // allow streak to count from today or yesterday (so an unstarted today doesn't break it)
    if (!daysWithActivity.has(fmt(d))) d.setDate(d.getDate() - 1);
    while (daysWithActivity.has(fmt(d))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [records, platform]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" />
          Daily Growth
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Genuine activities to grow your reach and engagement — the kind a real person does, not a bot.
          Check them off as you go.
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {PLATFORM_ORDER.map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              platform === p ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            {DAILY_ACTIVITIES[p].label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Checklist */}
        <div className="lg:col-span-2 space-y-4">
          {/* Progress header */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">{platformDef?.label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{platformDef?.intro}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-orange-500 font-bold text-lg">
                    <Flame className="w-4 h-4" /> {streak}
                  </div>
                  <p className="text-[10px] text-muted-foreground">day streak</p>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{doneToday}/{dailyOnly.length}</div>
                  <p className="text-[10px] text-muted-foreground">today</p>
                </div>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </Card>

          {/* Activities */}
          {isLoading ? (
            <Card className="p-4 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</Card>
          ) : (
            <Card className="divide-y">
              {activities.map(a => {
                const done = todayMap[a.key]?.completed;
                return (
                  <button
                    key={a.key}
                    onClick={() => toggle(a.key)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    {done
                      ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      : <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                          {a.title}
                        </span>
                        {a.weekly && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">weekly</span>}
                        {a.time && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {a.time}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.detail}</p>
                    </div>
                  </button>
                );
              })}
            </Card>
          )}

          <p className="text-[11px] text-muted-foreground px-1">
            Tip: these reset each day. Consistency beats intensity — doing 3 of these daily for a month
            grows accounts faster than one big burst.
          </p>
        </div>

        {/* AI helper */}
        <div className="lg:col-span-1">
          <GrowthHelper platform={platform} platformLabel={platformDef?.label} />
        </div>
      </div>
    </div>
  );
}

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
