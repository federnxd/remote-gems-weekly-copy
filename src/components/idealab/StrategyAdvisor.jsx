import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Target, BarChart2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, getDay } from 'date-fns';
import { postImpressions, postLikes, postComments, postShares, postReferrals, postHired } from '@/lib/post-metrics';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = ['Early morning (6–9am)', 'Morning (9–12pm)', 'Afternoon (12–5pm)', 'Evening (5–9pm)', 'Night (9pm+)'];

function getHourBucket(timeStr) {
  if (!timeStr) return null;
  const h = parseInt(timeStr.split(':')[0], 10);
  if (h < 9) return 'Early morning (6–9am)';
  if (h < 12) return 'Morning (9–12pm)';
  if (h < 17) return 'Afternoon (12–5pm)';
  if (h < 21) return 'Evening (5–9pm)';
  return 'Night (9pm+)';
}

const ADVICE_ICONS = {
  positive: CheckCircle2,
  warning: AlertCircle,
  tip: Target,
  timing: Clock,
  strategy: BarChart2,
  schedule: Calendar,
};

const ADVICE_COLORS = {
  positive: { border: 'border-green-200', bg: 'bg-green-50', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  warning: { border: 'border-amber-200', bg: 'bg-amber-50', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  tip: { border: 'border-blue-200', bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  timing: { border: 'border-purple-200', bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  strategy: { border: 'border-cyan-200', bg: 'bg-cyan-50', icon: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700' },
  schedule: { border: 'border-violet-200', bg: 'bg-violet-50', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
};

function AdviceCard({ item }) {
  const type = item.type || 'tip';
  const colors = ADVICE_COLORS[type] || ADVICE_COLORS.tip;
  const Icon = ADVICE_ICONS[type] || Target;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colors.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-foreground">{item.headline}</p>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${colors.badge}`}>{type}</span>
          </div>
          <p className="text-xs text-foreground/75 leading-relaxed">{item.detail}</p>
          {item.action && (
            <p className="text-xs font-medium text-foreground mt-2 pt-2 border-t border-current/10">
              💡 {item.action}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, sub, color = 'text-foreground' }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-medium text-foreground/80">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StrategyAdvisor({ posts }) {
  const [advice, setAdvice] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const publishedPosts = posts.filter(p => p.status === 'published');

  // Pre-compute stats for the LLM context
  const buildStats = () => {
    // Strategy performance
    const byStrategy = {};
    publishedPosts.forEach(p => {
      const s = p.strategy || 'unknown';
      if (!byStrategy[s]) byStrategy[s] = { posts: 0, impressions: 0, likes: 0, comments: 0, shares: 0, referrals: 0, hired: 0 };
      byStrategy[s].posts++;
      byStrategy[s].impressions += postImpressions(p);
      byStrategy[s].likes += postLikes(p);
      byStrategy[s].comments += postComments(p);
      byStrategy[s].shares += postShares(p);
      byStrategy[s].referrals += postReferrals(p);
      byStrategy[s].hired += postHired(p);
    });
    const strategyStats = Object.entries(byStrategy).map(([strategy, d]) => ({
      strategy,
      posts: d.posts,
      avgImpressions: d.posts ? Math.round(d.impressions / d.posts) : 0,
      avgLikes: d.posts ? Math.round(d.likes / d.posts) : 0,
      avgComments: d.posts ? +(d.comments / d.posts).toFixed(1) : 0,
      avgShares: d.posts ? +(d.shares / d.posts).toFixed(1) : 0,
      totalReferrals: d.referrals,
      totalHired: d.hired,
    })).sort((a, b) => b.totalReferrals - a.totalReferrals);

    // Day-of-week performance
    const byDay = {};
    publishedPosts.forEach(p => {
      const dateStr = p.scheduled_date || p.created_date?.split('T')[0];
      if (!dateStr) return;
      try {
        const day = DAYS[getDay(parseISO(dateStr))];
        if (!byDay[day]) byDay[day] = { posts: 0, impressions: 0, referrals: 0, likes: 0 };
        byDay[day].posts++;
        byDay[day].impressions += postImpressions(p);
        byDay[day].referrals += postReferrals(p);
        byDay[day].likes += postLikes(p);
      } catch {}
    });
    const dayStats = Object.entries(byDay).map(([day, d]) => ({
      day,
      posts: d.posts,
      avgImpressions: d.posts ? Math.round(d.impressions / d.posts) : 0,
      avgReferrals: d.posts ? +(d.referrals / d.posts).toFixed(2) : 0,
      avgLikes: d.posts ? +(d.likes / d.posts).toFixed(1) : 0,
    })).sort((a, b) => b.avgReferrals - a.avgReferrals);

    // Time-of-day performance
    const byHour = {};
    publishedPosts.forEach(p => {
      const bucket = getHourBucket(p.scheduled_time);
      if (!bucket) return;
      if (!byHour[bucket]) byHour[bucket] = { posts: 0, impressions: 0, referrals: 0 };
      byHour[bucket].posts++;
      byHour[bucket].impressions += postImpressions(p);
      byHour[bucket].referrals += postReferrals(p);
    });
    const hourStats = Object.entries(byHour).map(([slot, d]) => ({
      slot,
      posts: d.posts,
      avgImpressions: d.posts ? Math.round(d.impressions / d.posts) : 0,
      avgReferrals: d.posts ? +(d.referrals / d.posts).toFixed(2) : 0,
    })).sort((a, b) => b.avgReferrals - a.avgReferrals);

    // Posting frequency / volume
    const totalPosts = publishedPosts.length;
    const totalImpressions = publishedPosts.reduce((s, p) => s + postImpressions(p), 0);
    const totalReferrals = publishedPosts.reduce((s, p) => s + postReferrals(p), 0);
    const totalLikes = publishedPosts.reduce((s, p) => s + postLikes(p), 0);
    const totalHired = publishedPosts.reduce((s, p) => s + postHired(p), 0);

    return { strategyStats, dayStats, hourStats, totalPosts, totalImpressions, totalReferrals, totalLikes, totalHired };
  };

  const handleAnalyze = async () => {
    if (publishedPosts.length < 3) {
      toast.error('Need at least 3 published posts with data to analyze strategy.');
      return;
    }
    setIsAnalyzing(true);
    setAdvice(null);

    const stats = buildStats();

    const prompt = `You are an expert LinkedIn content strategist analyzing post performance data for a micro1 recruiter.

Your job: analyze the data and return specific, quantified, actionable advice. Be direct and data-driven. Use actual numbers from the data. Avoid vague platitudes.

OVERALL STATS:
- Total published posts: ${stats.totalPosts}
- Total impressions: ${stats.totalImpressions.toLocaleString()}
- Total referrals: ${stats.totalReferrals}
- Total likes: ${stats.totalLikes}
- Total hired: ${stats.totalHired}

STRATEGY PERFORMANCE (sorted by referrals):
${JSON.stringify(stats.strategyStats, null, 2)}

DAY-OF-WEEK PERFORMANCE (sorted by avg referrals):
${JSON.stringify(stats.dayStats, null, 2)}

TIME-OF-DAY PERFORMANCE (sorted by avg referrals):
${JSON.stringify(stats.hourStats, null, 2)}

Generate 6–8 pieces of specific, actionable advice. Each should feel like a real insight from the numbers above.

Examples of good advice:
- "Your social_proof posts average 2x more referrals than storytelling — double down on social proof"
- "Tuesday posts get 34% more impressions than average — prioritize Tuesday publishing"
- "Morning slots (9–12pm) drive 3x your referral rate vs evening posts"
- "You haven't tried niche_community strategy yet — it's worth testing"
- "Your last 3 posts had 0 engagement — consider changing your content angle"

Return JSON exactly:
{
  "summary": "2-sentence executive summary of the key finding and single most important action to take",
  "score": <number 1-10: overall strategy health score>,
  "advice": [
    {
      "type": "positive|warning|tip|timing|strategy|schedule",
      "headline": "Short punchy finding (max 12 words)",
      "detail": "1-2 sentences with specifics from the data",
      "action": "Concrete next step the user should take"
    }
  ]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          score: { type: 'number' },
          advice: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                headline: { type: 'string' },
                detail: { type: 'string' },
                action: { type: 'string' },
              },
            },
          },
        },
      },
    });

    setAdvice({ ...result, stats });
    setIsAnalyzing(false);
  };

  const scoreColor = advice?.score >= 7 ? 'text-green-600' : advice?.score >= 4 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="space-y-5">
      {/* Header + CTA */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            AI analyzes your posting patterns, strategy performance, and timing to surface specific, data-backed improvements.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on <span className="font-semibold text-foreground">{publishedPosts.length}</span> published posts
            {publishedPosts.length < 3 && <span className="text-amber-600 ml-1">— need at least 3 to analyze</span>}
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing || publishedPosts.length < 3} className="gap-2 shrink-0">
          {isAnalyzing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            : <><Sparkles className="w-4 h-4" /> {advice ? 'Re-analyze' : 'Analyze My Strategy'}</>
          }
        </Button>
      </div>

      {/* Loading state */}
      {isAnalyzing && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border bg-card p-4 animate-pulse flex gap-3">
              <div className="w-4 h-4 bg-muted rounded-full mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {advice && !isAnalyzing && (
        <div className="space-y-5">
          {/* Score + summary */}
          <div className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row gap-5 items-start">
            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-muted shrink-0">
              <span className={`text-3xl font-black ${scoreColor}`}>{advice.score}</span>
              <span className="text-[10px] text-muted-foreground font-medium">/10</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Strategy Health Score</p>
              <p className="text-sm text-foreground/85 leading-relaxed">{advice.summary}</p>
            </div>
          </div>

          {/* Quick stats row */}
          {advice.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Published Posts" value={advice.stats.totalPosts} color="text-primary" />
              <StatPill label="Total Impressions" value={advice.stats.totalImpressions.toLocaleString()} color="text-blue-600" />
              <StatPill label="Total Referrals" value={advice.stats.totalReferrals} color="text-green-600" sub="from all posts" />
              <StatPill label="Total Hired" value={advice.stats.totalHired} color="text-violet-600" sub="conversions" />
            </div>
          )}

          {/* Advice cards */}
          <div className="grid md:grid-cols-2 gap-3">
            {(advice.advice || []).map((item, i) => (
              <AdviceCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!advice && !isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-blue-400" />
          </div>
          <p className="font-semibold">No analysis yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Click "Analyze My Strategy" to get personalized, data-driven advice based on your posting history.
          </p>
        </div>
      )}
    </div>
  );
}