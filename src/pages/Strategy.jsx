import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, TrendingUp, DollarSign, Users, Calendar, 
  MessageSquare, Share2, Lightbulb, AlertTriangle, CheckCircle2, Brain
} from 'lucide-react';

function safeJSON(str, fallback) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str ?? fallback); } catch { return fallback; }
}

const budgetPlan = [
  { item: 'LinkedIn Post Boosting (2 targeted posts/week)', cost: 20, impact: 'High' },
  { item: 'Canva Pro (carousel/infographic posts)', cost: 13, impact: 'Medium' },
  { item: 'LinkedIn Premium (InMail + profile views)', cost: 0, impact: 'High', note: 'Free trial first month' },
  { item: 'Fiverr micro-tasks (post graphics)', cost: 10, impact: 'Medium' },
  { item: 'Buffer/Later (scheduling tool free tier)', cost: 0, impact: 'Low' },
  { item: 'Reserve/testing budget', cost: 7, impact: 'Variable' },
];

const weeklySchedule = [
  { day: 'Monday',    time: '8:00 AM',  action: 'All roles job post — LinkedIn + ALL platforms (new roles highlighted)', type: 'post' },
  { day: 'Tuesday',   time: '11:00 AM', action: 'Thought leadership: AI & remote work trends — non-LinkedIn platforms', type: 'thought' },
  { day: 'Wednesday', time: '8:00 AM',  action: 'Social proof / personal story job post — non-LinkedIn platforms', type: 'post' },
  { day: 'Thursday',  time: '11:00 AM', action: 'Thought leadership: AI & remote work trends — non-LinkedIn platforms', type: 'thought' },
  { day: 'Friday',    time: '8:00 AM',  action: 'Carousel / list job post — non-LinkedIn platforms', type: 'post' },
  { day: 'Saturday',  time: '10:00 AM', action: 'Weekend urgency job post — non-LinkedIn platforms', type: 'post' },
  { day: 'Sunday',    time: '11:00 AM', action: 'Thought leadership: AI & remote work trends — non-LinkedIn platforms', type: 'thought' },
];

const funnelFixes = [
  {
    stage: 'Impressions → Clicks',
    current: '390K → ~2K (0.5%)',
    target: '500K → 15K (3%)',
    fixes: [
      'Lead with a professional insight: "The AI industry is reshaping how top [role]s contribute remotely."',
      'Speak to career identity: "If you\'re a [role] who values autonomy and expert-level work, this is for you."',
      'Post at peak times: Tue-Thu 8-10 AM EST',
      'Target posts to 1-3 specific roles — speak their professional language',
      'Use carousel/image posts (2x more engagement vs text)',
    ]
  },
  {
    stage: 'Clicks → Applications',
    current: '~2K → 100 (5%)',
    target: '15K → 2,000 (13%)',
    fixes: [
      'Pre-qualify in the post: "If you have X years of experience in Y..."',
      'Mention specific pay ranges when possible',
      'Add a clear single CTA: "Click the link below to apply in 5 minutes"',
      'Remove friction: explain the 30-min interview process upfront',
    ]
  },
  {
    stage: 'Applications → Interviews',
    current: '100 → 20 (20%)',
    target: '2,000 → 600 (30%)',
    fixes: [
      'Follow up with applicants via DM within 24 hours',
      'Create a "What to Expect" guide to share with applicants',
      'Remind them to check spam folders (bold this in posts)',
      'Send a prep checklist before the interview',
    ]
  },
  {
    stage: 'Interviews → Certified',
    current: '20 → 9 (45%)',
    target: '600 → 300 (50%)',
    fixes: [
      'Share tips on passing the certification',
      'Target senior/experienced professionals (higher pass rate)',
      'Create a FAQ document addressing common concerns',
    ]
  },
  {
    stage: 'Certified → Hired',
    current: '9 → 1 (11%)',
    target: '300 → 120 (40%)',
    fixes: [
      'Focus on roles with highest demand (engineering, AI)',
      'Target candidates already in relevant fields',
      'Quality over quantity: better targeting = better conversion',
    ]
  },
];

export default function Strategy() {
  // The latest DataAnalystPlanner report drives the live strategy view.
  const { data: reports = [] } = useQuery({
    queryKey: ['planner-reports'],
    queryFn: () => base44.entities.PlannerReport.list('-created_date', 1),
  });
  const latest = reports.find(r => r.status === 'completed') || null;

  const recommendedStrategies = latest ? safeJSON(latest.recommended_strategies, []) : [];
  const recommendedTimes = latest ? safeJSON(latest.recommended_posting_times, {}) : {};
  const actionItems = latest ? safeJSON(latest.action_items, []) : [];
  const recommendedHashtags = latest?.recommended_hashtags
    ? latest.recommended_hashtags.split(',').map(h => h.trim()).filter(Boolean)
    : [];

  // Overlay planner-recommended posting times onto the baseline weekly schedule.
  const dayToPlatform = {
    Monday: 'linkedin', Tuesday: 'twitter', Wednesday: 'facebook',
    Thursday: 'instagram', Friday: 'mastodon', Saturday: 'bluesky', Sunday: 'threads',
  };
  const liveSchedule = weeklySchedule.map(item => {
    const plat = dayToPlatform[item.day];
    const plannerTime = plat && recommendedTimes[plat];
    return plannerTime ? { ...item, time: plannerTime, plannerAdjusted: true } : item;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing & Recruiting Strategy</h1>
        <p className="text-sm text-muted-foreground">Your roadmap to 100+ hired referrals per month</p>
      </div>

      {/* Live DataAnalystPlanner recommendations */}
      {latest ? (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">DataAnalystPlanner Recommendations</h3>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {latest.period_label} · {latest.report_type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            These are applied automatically to post generation and community managing. The plan below adapts as new reports come in.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {recommendedStrategies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Priority Strategies</p>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedStrategies.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[11px] bg-primary/10 text-primary">
                      {i + 1}. {String(s).replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {recommendedHashtags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommended Hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedHashtags.slice(0, 12).map((h, i) => (
                    <Badge key={i} variant="outline" className="text-[11px]">{h.startsWith('#') ? h : '#' + h}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          {actionItems.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Action Items</p>
              <ul className="space-y-1.5">
                {actionItems.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {typeof a === 'string' ? a : (a.action || JSON.stringify(a))}
                    {a && a.platform && a.platform !== 'all' && (
                      <Badge variant="outline" className="text-[10px] ml-1">{a.platform}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-4 border-dashed bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>No DataAnalystPlanner report yet. The baseline plan below is in effect — it will adapt automatically once the planner runs on real performance data.</span>
          </div>
        </Card>
      )}

      {/* Current vs Target */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-6 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-sm">Current Performance</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>390,000 impressions</p>
            <p>100 referrals (0.026% conversion)</p>
            <p>20 interviews taken</p>
            <p>9 certified</p>
            <p className="font-bold text-destructive">1 hired</p>
          </div>
        </Card>
        <Card className="p-6 border-accent/20 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-sm">Target Performance</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p>500,000+ impressions/month</p>
            <p>2,000 referrals (0.4% conversion)</p>
            <p>600 interviews</p>
            <p>300 certified</p>
            <p className="font-bold text-accent">100+ hired</p>
          </div>
        </Card>
      </div>

      {/* Budget Allocation */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">$50 Monthly Budget Allocation</h3>
        </div>
        <div className="space-y-3">
          {budgetPlan.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.item}</p>
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{item.impact}</Badge>
                <span className="text-sm font-mono font-semibold w-10 text-right">${item.cost}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 border-t">
            <span className="font-semibold">Total: $50</span>
          </div>
        </div>
      </Card>

      {/* Weekly Schedule */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Weekly Posting Schedule</h3>
        </div>
        <div className="space-y-2">
          {liveSchedule.map((item, i) => {
            const typeColors = {
              post: 'bg-primary/10 text-primary',
              thought: 'bg-chart-3/10 text-chart-3',
              engage: 'bg-chart-4/10 text-chart-4',
              outreach: 'bg-chart-3/10 text-chart-3',
              review: 'bg-muted text-muted-foreground',
            };
            return (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="w-20 text-xs font-semibold">{item.day}</div>
                <div className="w-24 text-xs text-muted-foreground flex items-center gap-1">
                  {item.time}
                  {item.plannerAdjusted && <span className="text-primary" title="Adjusted by DataAnalystPlanner">●</span>}
                </div>
                <div className="flex-1 text-sm">{item.action}</div>
                <Badge variant="secondary" className={typeColors[item.type]}>{item.type}</Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Funnel Optimization */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Funnel Optimization Plan</h3>
        </div>
        <div className="space-y-4">
          {funnelFixes.map((stage, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-sm">{stage.stage}</h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-destructive">{stage.current}</span>
                  <span>→</span>
                  <span className="text-accent font-semibold">{stage.target}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {stage.fixes.map((fix, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    {fix}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}