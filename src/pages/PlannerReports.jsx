import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Target, Clock, Hash, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function safeJSON(str, fallback = []) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str || fallback); } catch { return fallback; }
}

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  const actionItems = safeJSON(report.action_items, []);
  const banRisks = safeJSON(report.ban_risk_flags, []);
  const topStrategies = safeJSON(report.top_performing_strategies, []);
  const underStrategies = safeJSON(report.underperforming_strategies, []);
  const platformInsights = safeJSON(report.platform_insights, {});
  const recommendedStrategies = safeJSON(report.recommended_strategies, []);
  const postingTimes = safeJSON(report.recommended_posting_times, {});
  const pausedPlatforms = report.community_managing_paused_platforms
    ? report.community_managing_paused_platforms.split(',').filter(Boolean)
    : [];

  return (
    <Card className={`border-2 ${report.report_type === 'monthly' ? 'border-chart-3/30' : 'border-primary/20'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${report.report_type === 'monthly' ? 'bg-chart-3/10' : 'bg-primary/10'}`}>
              <Brain className={`w-4 h-4 ${report.report_type === 'monthly' ? 'text-chart-3' : 'text-primary'}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{report.period_label}</CardTitle>
              <p className="text-xs text-muted-foreground">{format(new Date(report.created_date), 'MMM d, yyyy · HH:mm')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={report.report_type === 'monthly' ? 'bg-chart-3/10 text-chart-3' : 'bg-primary/10 text-primary'}>
              {report.report_type === 'monthly' ? '📊 Monthly Deep Analysis' : '📅 Weekly Analysis'}
            </Badge>
            {pausedPlatforms.length > 0 && (
              <Badge className="bg-destructive/10 text-destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                CM Paused
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Full Analysis */}
        {report.full_analysis && (
          <div className="bg-muted/40 rounded-lg p-4">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{report.full_analysis}</p>
          </div>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Action Items
            </h4>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{item.priority || i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    {item.rationale && <p className="text-xs text-muted-foreground mt-0.5">{item.rationale}</p>}
                    {item.platform && item.platform !== 'all' && (
                      <Badge variant="outline" className="text-[10px] mt-1">{item.platform}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ban Risk Flags */}
        {(banRisks.length > 0 || pausedPlatforms.length > 0) && (
          <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
            <h4 className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Risk Flags
            </h4>
            {banRisks.map((r, i) => (
              <div key={i} className="text-xs flex items-start gap-2 mb-1">
                <span className="font-semibold text-destructive">{r.platform}:</span>
                <span className="text-muted-foreground">{r.reason} → {r.recommendation}</span>
              </div>
            ))}
            {pausedPlatforms.length > 0 && (
              <p className="text-xs font-medium text-destructive mt-1">
                ⚠️ Community Managing was auto-paused for: {pausedPlatforms.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Expandable details */}
        <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide details' : 'Show strategy details'}
        </Button>

        {expanded && (
          <div className="space-y-4 pt-1">
            {/* Top vs Under Strategies */}
            <div className="grid sm:grid-cols-2 gap-3">
              {topStrategies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-accent" /> Top Strategies
                  </h4>
                  <div className="space-y-1.5">
                    {topStrategies.map((s, i) => (
                      <div key={i} className="p-2 rounded-lg bg-accent/5 border border-accent/20 text-xs">
                        <p className="font-semibold text-accent">{s.strategy?.replace(/_/g, ' ')}</p>
                        <p className="text-muted-foreground">{s.why}</p>
                        {s.engagement_rate && <p className="mt-0.5">Eng. rate: {s.engagement_rate}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {underStrategies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-destructive" /> Underperforming
                  </h4>
                  <div className="space-y-1.5">
                    {underStrategies.map((s, i) => (
                      <div key={i} className="p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
                        <p className="font-semibold text-destructive">{s.strategy?.replace(/_/g, ' ')}</p>
                        <p className="text-muted-foreground">{s.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Platform Insights */}
            {Object.keys(platformInsights).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Platform Insights</h4>
                <div className="space-y-1.5">
                  {Object.entries(platformInsights).map(([platform, insight]) => (
                    insight && (
                      <div key={platform} className="flex gap-2 text-xs p-2 rounded bg-muted/40">
                        <span className="font-semibold capitalize w-16 shrink-0">{platform}:</span>
                        <span className="text-muted-foreground">{insight}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Recommended strategies + times */}
            <div className="grid sm:grid-cols-2 gap-3">
              {recommendedStrategies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Priority Strategies
                  </h4>
                  <ol className="space-y-1">
                    {recommendedStrategies.map((s, i) => (
                      <li key={i} className="text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                        {s.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {Object.keys(postingTimes).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Optimal Post Times
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(postingTimes).map(([platform, time]) => (
                      <div key={platform} className="text-xs flex items-center gap-2">
                        <span className="font-medium capitalize w-16">{platform}:</span>
                        <Badge variant="outline" className="text-[10px]">{time}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recommended hashtags */}
            {report.recommended_hashtags && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Recommended Hashtags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {report.recommended_hashtags.split(',').filter(Boolean).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">#{tag.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* CM Adjustments */}
            {report.community_managing_paused_platforms && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                <span className="font-semibold">Community Managing adjustments:</span> {report.community_managing_paused_platforms}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlannerReports() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['planner-reports'],
    queryFn: () => base44.entities.PlannerReport.list('-created_date', 20),
  });

  const handleRunNow = async (type) => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('dataAnalystPlanner', { report_type: type });
      if (res.data?.success) {
        toast.success(`${type === 'monthly' ? 'Monthly' : 'Weekly'} analysis complete!`);
        queryClient.invalidateQueries({ queryKey: ['planner-reports'] });
      } else {
        toast.error(res.data?.error || 'Analysis failed');
      }
    } catch (e) {
      toast.error(e.message);
    }
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            DataAnalystPlanner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly & monthly AI-driven strategy analysis — auto-runs every Sunday + last day of month
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleRunNow('weekly')} disabled={running}>
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            Run Weekly Now
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleRunNow('monthly')} disabled={running}>
            <Brain className="w-4 h-4" />
            Run Monthly Now
          </Button>
        </div>
      </div>

      {/* Automation schedule info */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-primary">Automated Schedule</p>
            <p className="text-muted-foreground">Runs automatically every <strong>Sunday at 11:30 PM</strong> (weekly) and on the <strong>last day of each month at 11:00 PM</strong> (deep analysis). Results are saved here and feed back into automations.</p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/40" />)}
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">No reports yet</p>
          <p className="text-sm text-muted-foreground mt-1">Run your first analysis using the buttons above, or wait for the automated Sunday run.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}