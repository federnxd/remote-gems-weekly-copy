import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, TrendingUp, DollarSign, Users, Calendar, 
  MessageSquare, Share2, Lightbulb, AlertTriangle, CheckCircle2 
} from 'lucide-react';

const budgetPlan = [
  { item: 'LinkedIn Post Boosting (2 targeted posts/week)', cost: 20, impact: 'High' },
  { item: 'Canva Pro (carousel/infographic posts)', cost: 13, impact: 'Medium' },
  { item: 'LinkedIn Premium (InMail + profile views)', cost: 0, impact: 'High', note: 'Free trial first month' },
  { item: 'Fiverr micro-tasks (post graphics)', cost: 10, impact: 'Medium' },
  { item: 'Buffer/Later (scheduling tool free tier)', cost: 0, impact: 'Low' },
  { item: 'Reserve/testing budget', cost: 7, impact: 'Variable' },
];

const weeklySchedule = [
  { day: 'Monday', time: '8-9 AM', action: 'Targeted role post (1-2 specific roles)', type: 'post' },
  { day: 'Tuesday', time: '12-1 PM', action: 'Engage in 5+ LinkedIn groups, comment on 10+ posts', type: 'engage' },
  { day: 'Wednesday', time: '8-9 AM', action: 'Personal story / social proof post', type: 'post' },
  { day: 'Thursday', time: '12-1 PM', action: 'DM outreach to 20 warm leads', type: 'outreach' },
  { day: 'Friday', time: '8-9 AM', action: 'Carousel / list post + community engagement', type: 'post' },
  { day: 'Saturday', time: '10-11 AM', action: 'Weekend urgency post (boost this one)', type: 'post' },
  { day: 'Sunday', time: 'Anytime', action: 'Review metrics, plan next week, optimize', type: 'review' },
];

const funnelFixes = [
  {
    stage: 'Impressions → Clicks',
    current: '390K → ~2K (0.5%)',
    target: '500K → 15K (3%)',
    fixes: [
      'Use hooks that create curiosity gaps ("I made $X in 3 months working remotely")',
      'Post at peak times: Tue-Thu 8-10 AM EST',
      'Target posts to 1-3 specific roles instead of listing all 30',
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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing & Recruiting Strategy</h1>
        <p className="text-sm text-muted-foreground">Your roadmap to 100+ hired referrals per month</p>
      </div>

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
          {weeklySchedule.map((item, i) => {
            const typeColors = {
              post: 'bg-primary/10 text-primary',
              engage: 'bg-chart-4/10 text-chart-4',
              outreach: 'bg-chart-3/10 text-chart-3',
              review: 'bg-muted text-muted-foreground',
            };
            return (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="w-20 text-xs font-semibold">{item.day}</div>
                <div className="w-20 text-xs text-muted-foreground">{item.time}</div>
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