import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DollarSign, Calendar, Target, Brain } from 'lucide-react';
import { toast } from 'sonner';

function safeJSON(str, fallback) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str ?? fallback); } catch { return fallback; }
}

export default function WeeklyPlanner() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    week_label: '',
    budget_allocated: 50,
    strategy_notes: '',
    status: 'planning',
  });
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => base44.entities.WeeklyPlan.list('-created_date'),
  });

  // Latest DataAnalystPlanner report — drives the suggested focus for new weeks.
  const { data: reports = [] } = useQuery({
    queryKey: ['planner-reports'],
    queryFn: () => base44.entities.PlannerReport.list('-created_date', 1),
  });
  const latestReport = reports.find(r => r.status === 'completed') || null;
  const plannerStrategies = latestReport ? safeJSON(latestReport.recommended_strategies, []) : [];
  const plannerActions = latestReport ? safeJSON(latestReport.action_items, []) : [];
  const plannerNote = latestReport
    ? [
        plannerStrategies.length ? `Priority strategies: ${plannerStrategies.map(s => String(s).replace(/_/g, ' ')).join(' > ')}.` : '',
        ...plannerActions.slice(0, 3).map((a, i) => `${i + 1}. ${typeof a === 'string' ? a : (a.action || '')}`),
      ].filter(Boolean).join('\n')
    : '';

  // Open the new-week dialog prefilled with the planner's current guidance.
  const openNewWeek = () => {
    setNewPlan(p => ({ ...p, strategy_notes: plannerNote || p.strategy_notes }));
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WeeklyPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plans'] });
      setDialogOpen(false);
      toast.success('Plan created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WeeklyPlan.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-plans'] }),
  });

  const statusColors = {
    planning: 'bg-chart-4/10 text-chart-4',
    active: 'bg-primary/10 text-primary',
    completed: 'bg-accent/10 text-accent',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground">Plan and track your weekly campaigns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openNewWeek}><Plus className="w-4 h-4" /> New Week</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Weekly Plan</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Week Label</Label>
                <Input value={newPlan.week_label} onChange={(e) => setNewPlan({...newPlan, week_label: e.target.value})} placeholder="e.g. Week 1 - May 5-11" />
              </div>
              <div>
                <Label>Budget ($)</Label>
                <Input type="number" value={newPlan.budget_allocated} onChange={(e) => setNewPlan({...newPlan, budget_allocated: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Strategy Notes</Label>
                <Textarea value={newPlan.strategy_notes} onChange={(e) => setNewPlan({...newPlan, strategy_notes: e.target.value})} placeholder="What's the focus this week?" />
              </div>
              <Button onClick={() => createMutation.mutate(newPlan)} disabled={!newPlan.week_label} className="w-full">Create Plan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {latestReport && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Current planner guidance</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">{latestReport.period_label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {plannerNote || 'No specific guidance in the latest report.'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            New weeks are prefilled with this guidance, and post generation already applies it automatically.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{plan.week_label}</h3>
                  <Badge variant="secondary" className={statusColors[plan.status]}>{plan.status}</Badge>
                </div>
              </div>
              <Select value={plan.status} onValueChange={(v) => updateMutation.mutate({ id: plan.id, data: { status: v } })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold font-mono">${plan.budget_allocated}</p>
                <p className="text-xs text-muted-foreground">Spent: ${plan.budget_spent || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Posts</p>
                <p className="text-lg font-bold font-mono">{plan.posts_published || 0}</p>
                <p className="text-xs text-muted-foreground">Planned: {plan.posts_planned || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Impressions</p>
                <p className="text-lg font-bold font-mono">{(plan.total_impressions || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/5">
                <p className="text-xs text-muted-foreground">Hired</p>
                <p className="text-lg font-bold font-mono text-accent">{plan.total_hired || 0}</p>
                <p className="text-xs text-muted-foreground">Referrals: {plan.total_referrals || 0}</p>
              </div>
            </div>

            {plan.last_planner_sync && (
              <div className="mb-3 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium mb-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  Auto-synced from planner
                  {plan.planner_report_period && <span className="text-muted-foreground font-normal">· {plan.planner_report_period}</span>}
                  <span className="text-muted-foreground font-normal ml-auto">
                    {new Date(plan.last_planner_sync).toLocaleDateString()}
                  </span>
                </div>
                {plan.active_strategies && (
                  <div className="flex flex-wrap gap-1">
                    {plan.active_strategies.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {plan.strategy_notes && (
              <div className="space-y-2">
                {plan.strategy_notes.split('\n').map((line, idx) => {
                  if (!line.trim()) return null;
                  if (line.startsWith('FOCUS:')) return (
                    <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      <Target className="w-3.5 h-3.5" /> {line.replace('FOCUS:', '').trim()}
                    </div>
                  );
                  if (line.startsWith('📅')) return (
                    <div key={idx} className="mt-3 mb-1 text-xs font-bold text-foreground tracking-wide">
                      {line}
                    </div>
                  );
                  if (line.startsWith('→')) return (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground pl-3">
                      <span className="text-primary shrink-0 mt-0.5">→</span>
                      <span>{line.replace('→', '').trim()}</span>
                    </div>
                  );
                  return (
                    <p key={idx} className="text-xs text-muted-foreground">{line}</p>
                  );
                })}
              </div>
            )}
          </Card>
        ))}

        {plans.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Create your first weekly plan to start tracking progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}