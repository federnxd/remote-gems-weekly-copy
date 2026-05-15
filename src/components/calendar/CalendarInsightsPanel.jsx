import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ChevronDown, ChevronUp, TrendingUp, Calendar, Lightbulb, X } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS = {
  topic:   'border-primary/30 bg-primary/5',
  timing:  'border-chart-2/30 bg-chart-2/5',
  insight: 'border-chart-3/30 bg-chart-3/5',
};

const TYPE_ICONS = {
  topic:   <Lightbulb className="w-3.5 h-3.5 text-primary" />,
  timing:  <Calendar className="w-3.5 h-3.5 text-chart-2" />,
  insight: <TrendingUp className="w-3.5 h-3.5 text-chart-3" />,
};

export default function CalendarInsightsPanel({ posts, snapshots }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const hasData = snapshots.length > 0 || posts.filter(p => p.impressions > 0).length > 0;

  const generate = async () => {
    setLoading(true);

    // Summarise post performance by day-of-week
    const byDay = Array(7).fill(null).map(() => ({ impressions: 0, clicks: 0, referrals: 0, count: 0 }));
    posts.filter(p => p.scheduled_date && p.impressions > 0).forEach(p => {
      try {
        const dow = new Date(p.scheduled_date).getDay();
        byDay[dow].impressions += p.impressions || 0;
        byDay[dow].clicks      += p.clicks || 0;
        byDay[dow].referrals   += p.referrals || 0;
        byDay[dow].count       += 1;
      } catch {}
    });
    const dayPerf = byDay.map((d, i) => ({
      day: DAY_NAMES[i],
      avg_impressions: d.count ? Math.round(d.impressions / d.count) : 0,
      avg_clicks:      d.count ? Math.round(d.clicks / d.count) : 0,
      avg_referrals:   d.count ? Math.round(d.referrals / d.count) : 0,
      posts: d.count,
    }));

    // Summarise strategy performance
    const byStrategy = {};
    posts.filter(p => p.impressions > 0).forEach(p => {
      if (!byStrategy[p.strategy]) byStrategy[p.strategy] = { impressions: 0, clicks: 0, referrals: 0, count: 0 };
      byStrategy[p.strategy].impressions += p.impressions || 0;
      byStrategy[p.strategy].clicks      += p.clicks || 0;
      byStrategy[p.strategy].referrals   += p.referrals || 0;
      byStrategy[p.strategy].count       += 1;
    });

    // Latest snapshot summary
    const latestSnap = snapshots.length ? snapshots[snapshots.length - 1] : null;
    const prevSnap   = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
    const snapSummary = latestSnap ? `
Latest snapshot (${latestSnap.snapshot_date}):
- Impressions: ${latestSnap.impressions} ${prevSnap ? `(prev: ${prevSnap.impressions})` : ''}
- Link clicks: ${latestSnap.link_clicks} ${prevSnap ? `(prev: ${prevSnap.link_clicks})` : ''}
- Reactions: ${latestSnap.reactions} ${prevSnap ? `(prev: ${prevSnap.reactions})` : ''}
- Followers gained: ${latestSnap.followers_gained}
- Referrals: ${latestSnap.total_referrals} | Hired: ${latestSnap.successful_referrals}
` : 'No LinkedIn snapshots available.';

    const prompt = `You are a LinkedIn content strategist. Analyze this recruitment campaign performance data and suggest specific content topics and ideal posting days for the next 2 weeks.

DAY-OF-WEEK PERFORMANCE (averaged per post):
${dayPerf.map(d => `${d.day}: ${d.posts} posts | avg impressions: ${d.avg_impressions} | avg clicks: ${d.avg_clicks} | avg referrals: ${d.avg_referrals}`).join('\n')}

STRATEGY PERFORMANCE:
${Object.entries(byStrategy).map(([s, d]) => `${s}: ${d.count} posts | avg impressions: ${Math.round(d.impressions/d.count)} | avg clicks: ${Math.round(d.clicks/d.count)} | avg referrals: ${Math.round(d.referrals/d.count)}`).join('\n') || 'No strategy data yet.'}

${snapSummary}

Based on the above, provide:
1. The top 2-3 best days to post (based on engagement peaks)
2. 4-6 specific content topic ideas tailored to what's been working, for a recruitment/referral LinkedIn campaign
3. 1-2 strategic insights about what the data reveals

Return JSON with:
{
  "best_days": [{ "day": string, "reason": string }],
  "topics": [{ "title": string, "strategy": string, "why": string, "suggested_day": string }],
  "insights": [{ "text": string }]
}`;

    const data = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          best_days: { type: 'array', items: { type: 'object', properties: { day: { type: 'string' }, reason: { type: 'string' } } } },
          topics:    { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, strategy: { type: 'string' }, why: { type: 'string' }, suggested_day: { type: 'string' } } } },
          insights:  { type: 'array', items: { type: 'object', properties: { text: { type: 'string' } } } },
        },
      },
    });
    setResult(data);
    setLoading(false);
    setOpen(true);
  };

  return (
    <div className="border-b border-border bg-card flex-shrink-0">
      {/* Trigger bar */}
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Content Suggestions</span>
          {!hasData && <span className="text-[10px] text-muted-foreground">(add metrics data to unlock)</span>}
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setOpen(o => !o)}>
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {open ? 'Collapse' : 'View suggestions'}
            </Button>
          )}
          <Button
            size="sm"
            variant={result ? 'outline' : 'default'}
            className="h-7 text-xs gap-1.5"
            onClick={generate}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loading ? 'Analyzing…' : result ? 'Refresh' : 'Suggest Topics & Days'}
          </Button>
        </div>
      </div>

      {/* Results panel */}
      {open && result && (
        <div className="px-6 pb-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">

            {/* Best days */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Best Days to Post
              </p>
              <div className="space-y-1.5">
                {(result.best_days || []).map((d, i) => (
                  <div key={i} className={`rounded-lg border p-2.5 ${TYPE_COLORS.timing}`}>
                    <p className="text-xs font-semibold text-foreground">{d.day}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{d.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div className="space-y-2 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Suggested Content Topics
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {(result.topics || []).map((t, i) => (
                  <div key={i} className={`rounded-lg border p-2.5 ${TYPE_COLORS.topic}`}>
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold text-foreground leading-snug">{t.title}</p>
                      {t.suggested_day && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 ml-1">{t.suggested_day}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-primary/70 font-medium">{t.strategy?.replace(/_/g,' ')}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.why}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          {result.insights?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              {result.insights.map((ins, i) => (
                <div key={i} className={`rounded-lg border px-3 py-2 flex items-start gap-2 ${TYPE_COLORS.insight} flex-1 min-w-[200px]`}>
                  <TrendingUp className="w-3.5 h-3.5 text-chart-3 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-snug">{ins.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}