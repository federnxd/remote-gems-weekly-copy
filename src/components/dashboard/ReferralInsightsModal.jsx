import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Users, Star, BarChart2, RefreshCw } from 'lucide-react';

export default function ReferralInsightsModal({ open, onClose }) {
  const [pastedText, setPastedText] = useState('');
  const [step, setStep] = useState('paste'); // paste | analyzing | results
  const [insights, setInsights] = useState(null);

  const handleAnalyze = async () => {
    if (!pastedText.trim()) return;
    setStep('analyzing');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing referral application data from micro1's referral program.

Extract and analyze the following from the pasted text:
1. Which job roles received the most referral applications?
2. Count how many referrals each role got (look for patterns like role names next to numbers, or repeated mentions).
3. If you can detect status info (pending, certified, hired, interview, etc.) — capture it per role.
4. Identify the top 5 most applied-to roles.
5. Provide a brief insight: which roles to prioritize in future posts based on demand.

TEXT:
${pastedText}

Return a JSON object with this exact structure:
{
  "total_referrals": number,
  "roles": [
    {
      "title": string,
      "count": number,
      "certified": number (or 0),
      "hired": number (or 0),
      "demand_level": "high" | "medium" | "low"
    }
  ],
  "top_roles": [string, string, string],
  "insight": string (1-2 sentences on what to focus next),
  "summary": string (1 sentence overview of the data)
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          total_referrals: { type: 'number' },
          roles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                count: { type: 'number' },
                certified: { type: 'number' },
                hired: { type: 'number' },
                demand_level: { type: 'string' },
              },
            },
          },
          top_roles: { type: 'array', items: { type: 'string' } },
          insight: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    });

    setInsights(result);
    setStep('results');
  };

  const handleReset = () => {
    setPastedText('');
    setInsights(null);
    setStep('paste');
  };

  const demandColors = {
    high: 'bg-accent/10 text-accent border-accent/20',
    medium: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  const maxCount = insights?.roles?.length > 0 ? Math.max(...insights.roles.map(r => r.count)) : 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Referral Demand Insights
          </DialogTitle>
        </DialogHeader>

        {step === 'paste' && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Paste your referrals data below (e.g. from micro1's referral dashboard, an export, or a list of applicants with their roles). The AI will extract which roles are most in demand.
            </p>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your referrals data here — role names, applicant counts, statuses, etc..."
              className="w-full h-52 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!pastedText.trim()}
              className="w-full gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Referral Demand
            </Button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-semibold">Analyzing referral data…</p>
            <p className="text-sm text-muted-foreground">Extracting role demand, counts, and insights</p>
          </div>
        )}

        {step === 'results' && insights && (
          <div className="space-y-5 pt-1">
            {/* Summary */}
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-sm text-foreground">
              <p className="font-medium text-primary mb-0.5">Overview</p>
              <p>{insights.summary}</p>
            </div>

            {/* Top-level stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-2xl font-bold">{insights.total_referrals || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Referrals</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-2xl font-bold">{insights.roles?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Roles Detected</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-accent">
                  {insights.roles?.reduce((s, r) => s + (r.hired || 0), 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Hired</p>
              </div>
            </div>

            {/* Roles bar chart */}
            {insights.roles?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Role Demand Breakdown
                </p>
                <div className="space-y-2">
                  {insights.roles
                    .sort((a, b) => b.count - a.count)
                    .map((role, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {i < 3 && <Star className="w-3.5 h-3.5 text-chart-4 flex-shrink-0" />}
                            <span className="font-medium truncate">{role.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${demandColors[role.demand_level] || demandColors.low}`}
                            >
                              {role.demand_level}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {role.certified > 0 && <span className="text-chart-2">✓ {role.certified} cert</span>}
                            {role.hired > 0 && <span className="text-accent font-semibold">{role.hired} hired</span>}
                            <span className="font-mono font-semibold text-foreground">{role.count}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, (role.count / maxCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Top roles to target */}
            {insights.top_roles?.length > 0 && (
              <div className="rounded-lg border bg-chart-4/5 p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-chart-4" />
                  Top Roles to Prioritize in Posts
                </p>
                <div className="flex flex-wrap gap-2">
                  {insights.top_roles.map((role, i) => (
                    <Badge key={i} className="bg-chart-4/15 text-chart-4 border-chart-4/20 font-medium">
                      #{i + 1} {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insight */}
            {insights.insight && (
              <div className="rounded-lg bg-accent/5 border border-accent/15 p-3">
                <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Strategy Insight
                </p>
                <p className="text-sm text-foreground">{insights.insight}</p>
              </div>
            )}

            <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" /> Analyze New Data
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}