import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Target, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  active: 'bg-accent/10 text-accent',
  paused: 'bg-chart-4/10 text-chart-4',
  completed: 'bg-muted text-muted-foreground',
};

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function Campaigns() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'active', target_hires: '', start_date: '', end_date: '', color: '#3b82f6' });
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setDialogOpen(false);
      setForm({ name: '', description: '', status: 'active', target_hires: '', start_date: '', end_date: '', color: '#3b82f6' });
      toast.success('Campaign created!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Campaign.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const getPostsForCampaign = (id) => posts.filter(p => p.campaign_id === id);

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Campaign name is required'); return; }
    createMutation.mutate({
      ...form,
      target_hires: form.target_hires ? Number(form.target_hires) : 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">Group posts under specific hiring initiatives</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Campaign Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q2 Engineering Drive" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this hiring drive about?" className="h-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Target Hires</Label>
                <Input type="number" value={form.target_hires} onChange={e => setForm({ ...form, target_hires: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 && !isLoading && (
        <Card className="p-12 text-center border-dashed">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No campaigns yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first hiring initiative to group posts</p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(campaign => {
          const campaignPosts = getPostsForCampaign(campaign.id);
          const published = campaignPosts.filter(p => p.status === 'published').length;
          const totalHired = campaignPosts.reduce((s, p) => s + (p.hired || 0), 0);

          return (
            <Card key={campaign.id} className="p-4 space-y-3 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: campaign.color || '#3b82f6' }} />
                  <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Select value={campaign.status} onValueChange={(v) => updateStatusMutation.mutate({ id: campaign.id, status: v })}>
                    <SelectTrigger className="h-6 text-[11px] w-24 border-0 p-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(campaign.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {campaign.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{campaignPosts.length} posts</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{published} published</span>
                {campaign.target_hires > 0 && (
                  <span className="flex items-center gap-1 text-accent font-medium">
                    {totalHired}/{campaign.target_hires} hired
                  </span>
                )}
              </div>

              {campaign.target_hires > 0 && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-accent h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalHired / campaign.target_hires) * 100)}%` }}
                  />
                </div>
              )}

              {(campaign.start_date || campaign.end_date) && (
                <p className="text-[11px] text-muted-foreground">
                  {campaign.start_date ? format(parseISO(campaign.start_date), 'MMM d') : '—'}
                  {' → '}
                  {campaign.end_date ? format(parseISO(campaign.end_date), 'MMM d, yyyy') : 'Ongoing'}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}