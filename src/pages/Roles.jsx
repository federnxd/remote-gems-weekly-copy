import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Search, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const categoryGuess = (title) => {
  const t = title.toLowerCase();
  if (/engineer|developer|devops|python|ios|backend|frontend|full.stack|full stack|ml |ai |machine learning|data engineer|data analyst|data science|software|cloud|cybersecurity|blockchain|qa |quality assurance|mobile dev/.test(t)) return 'engineering';
  if (/ux|ui |user interface|user experience|graphic design|brand design|visual design|illustrat|adobe|motion graphic|animation|3d artist|photo/.test(t)) return 'design';
  if (/audio|voice actor|voice over|voiceover|crowd worker|field record|recording expert|sound|music|speech|accent|dialect|bilingual|film editor|video edit|video produc|motion graphic|runops|platform.*infra/.test(t)) return 'media';
  if (/writer|author|journalist|content|copywriter|linguistic|translat|philosophy|transcription|caption|subtitl|editor|proofreader/.test(t)) return 'content';
  if (/attorney|legal|counsel|compliance|cpa|accountant|tax|financial advisor|finance|auditor|paralegal/.test(t)) return 'finance_legal';
  if (/biolog|health|medical|clinical|nurse|doctor|pharma|stem|scientist|researcher|lab|chemistry|physic|neuroscien|genomic/.test(t)) return 'science';
  if (/hr |human resource|recruiter|product manager|project manager|program manager|operations|chief|director|vp |ceo|cto|cfo|manager/.test(t)) return 'management';
  return 'other';
};

const categories = ['engineering', 'design', 'media', 'content', 'finance_legal', 'science', 'management', 'other'];
const categoryColors = {
  engineering: 'bg-primary/10 text-primary',
  design: 'bg-chart-3/10 text-chart-3',
  media: 'bg-chart-5/10 text-chart-5',
  content: 'bg-chart-4/10 text-chart-4',
  finance_legal: 'bg-chart-2/10 text-chart-2',
  science: 'bg-accent/10 text-accent',
  management: 'bg-chart-5/10 text-chart-5',
  other: 'bg-muted text-muted-foreground',
};

export default function Roles() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [newRole, setNewRole] = useState({ title: '', category: 'engineering', priority: 'medium' });
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['open-roles'],
    queryFn: () => base44.entities.OpenRole.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OpenRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-roles'] });
      setDialogOpen(false);
      setNewRole({ title: '', category: 'engineering', priority: 'medium' });
      toast.success('Role added!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OpenRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-roles'] });
      toast.success('Role removed');
    },
  });

  const handleSync = async () => {
    if (!syncText.trim()) return;
    setIsSyncing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract all job role titles from the following text. Return ONLY a JSON array of strings with the exact job titles, nothing else. No explanations.

Text:
${syncText}`,
      response_json_schema: {
        type: 'object',
        properties: { roles: { type: 'array', items: { type: 'string' } } },
      },
    });

    const extracted = result?.roles || [];
    const existingTitles = roles.map(r => r.title.toLowerCase());
    const newOnes = extracted.filter(t => !existingTitles.includes(t.toLowerCase()));
    const removed = roles.filter(r => !extracted.map(t => t.toLowerCase()).includes(r.title.toLowerCase()));

    // Add new roles
    for (const title of newOnes) {
      await base44.entities.OpenRole.create({
        title,
        category: categoryGuess(title),
        priority: 'medium',
        is_active: true,
      });
    }
    // Deactivate removed roles (mark inactive rather than delete)
    for (const role of removed) {
      await base44.entities.OpenRole.update(role.id, { is_active: false });
    }

    queryClient.invalidateQueries({ queryKey: ['open-roles'] });
    setIsSyncing(false);
    setSyncOpen(false);
    setSyncText('');
    toast.success(`Sync complete: +${newOnes.length} added, ${removed.length} marked inactive`);
  };

  const filtered = roles.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Roles</h1>
          <p className="text-sm text-muted-foreground">{roles.length} active positions</p>
        </div>
        <div className="flex gap-2">
        {/* Sync Dialog */}
        <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" /> Sync Roles</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>AI Role Sync</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Paste the current job list from micro1 (copy it directly from the website or your referral page). The AI will extract all roles, add new ones, and mark removed ones as inactive.
              </p>
              <textarea
                value={syncText}
                onChange={(e) => setSyncText(e.target.value)}
                placeholder="Paste the full job list text here..."
                className="w-full h-48 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleSync} disabled={!syncText.trim() || isSyncing} className="w-full gap-2">
                {isSyncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</> : <><Sparkles className="w-4 h-4" /> Sync with AI</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Job Title</Label>
                <Input value={newRole.title} onChange={(e) => setNewRole({...newRole, title: e.target.value})} placeholder="e.g. ML Engineer" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newRole.category} onValueChange={(v) => setNewRole({...newRole, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newRole.priority} onValueChange={(v) => setNewRole({...newRole, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate(newRole)} disabled={!newRole.title || createMutation.isPending} className="w-full">
                Add Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search roles..." 
          className="pl-10"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((role) => (
          <Card key={role.id} className="p-4 flex items-center justify-between group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{role.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className={categoryColors[role.category]}>
                  {role.category?.replace(/_/g, ' ')}
                </Badge>
                {role.priority === 'high' && (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">
                    High Priority
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => deleteMutation.mutate(role.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No roles found. Add your first role to get started.</p>
        </div>
      )}
    </div>
  );
}