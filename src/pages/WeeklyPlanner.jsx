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
import { Plus, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';

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
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Week</Button>
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

            {plan.strategy_notes && (
              <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                {plan.strategy_notes}
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