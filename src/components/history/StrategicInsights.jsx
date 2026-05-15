import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const TYPE_CONFIG = {
  opportunity: { icon: TrendingUp,     color: 'text-green-600',   bg: 'bg-green-50',   label: 'Opportunity'  },
  warning:     { icon: AlertTriangle,  color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Watch Out'    },
  action:      { icon: Target,         color: 'text-primary',     bg: 'bg-primary/5',  label: 'Action Item'  },
  insight:     { icon: Lightbulb,      color: 'text-chart-3',     bg: 'bg-chart-3/5',  label: 'Insight'      },
};

function InsightCard({ insight }) {
  const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.insight;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} space-y-1.5`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${cfg.color}`} />
        <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current`}>{cfg.label}</Badge>
        <span className="text-xs font-semibold text-foreground">{insight.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
      {insight.recommendation && (
        <p className="text-xs font-medium text-foreground border-t border-border/40 pt-1.5 mt-1.5">
          → {insight.recommendation}
        </p>
      )}
    </div>
  );
}

export default function StrategicInsights({ snapshots }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    const recent = snapshots.slice(-5);
    const summaryLines = recent.map(s =>
      `Date: ${s.snapshot_date} | Referrals: ${s.total_referrals} | AI Interview: ${s.ai_interview_completed} | Min Criteria: ${s.minimum_criteria_met} | Certified: ${s.certified} | Matched: ${s.matched_to_project} | Hired: ${s.successful_referrals} | Impressions: ${s.impressions} | Reach: ${s.reach} | Reactions: ${s.reactions} | Link Clicks: ${s.link_clicks} | Followers: ${s.followers_gained} | Cash Earned: $${s.total_cash_earned}`
    ).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a LinkedIn recruitment analytics expert. Analyze this time-series data from a LinkedIn referral campaign and provide strategic insights.

DATA (chronological):
${summaryLines}

Analyze the trends, identify what's working and what's underperforming, and give 4-6 actionable insights. For each insight respond in JSON.

Focus on:
- Which funnel stages have the best/worst conversion rates
- Whether LinkedIn engagement is translating to referrals
- What content or timing strategies should be adjusted
- Specific actions to improve the weakest stage
- What momentum to double down on

Return JSON with an "insights" array. Each item: { type: "opportunity"|"warning"|"action"|"insight", title: string, body: string, recommendation: string }`,
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type:           { type: 'string' },
                title:          { type: 'string' },
                body:           { type: 'string' },
                recommendation: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      },
    });

    setInsights(result);
    setLoading(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">AI Strategic Insights</h3>
        </div>
        <Button size="sm" onClick={generateInsights} disabled={loading || snapshots.length < 1} className="gap-2">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {insights ? 'Refresh Insights' : 'Generate Insights'}
        </Button>
      </div>

      {!insights && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Click "Generate Insights" to get AI-powered analysis of your trends and strategic recommendations to improve performance.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
          <p className="text-sm">Analyzing your performance trends…</p>
        </div>
      )}

      {insights && (
        <div className="space-y-3">
          {insights.summary && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground border">
              <span className="font-semibold text-foreground">Summary: </span>{insights.summary}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {(insights.insights || []).map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}