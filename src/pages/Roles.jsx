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
import { Plus, Trash2, Search, RefreshCw, Sparkles, DollarSign, Wrench, Zap } from 'lucide-react';
import { toast } from 'sonner';

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'instagram', 'weworkremotely', 'wellfound',
  'remotive', 'flexjobs', 'remoteok', 'reddit', 'discord',
];

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
  const [newRolesDetected, setNewRolesDetected] = useState([]);
  const [postGenOpen, setPostGenOpen] = useState(false);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
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
      prompt: `Extract all job roles from the following text. For each role extract:
- "title": the job title (string)
- "is_new": true if the role is labeled or tagged as "NEW" (e.g. "NEW", "🆕", "new role"), false otherwise
- "openings": number of open positions (look for patterns like "3 openings", "(5)", "x2", "2 positions"). Use 0 if not found.
- "required_skills": key skills or requirements mentioned for this role (short comma-separated string, e.g. "Python, 3+ years exp, ML"). Empty string if not found.
- "pay_rate": any pay/compensation info for this role (e.g. "$25/hr", "$80k-120k", "up to $50/hr"). Empty string if not found.

Return a JSON object with a "roles" array.

Text:
${syncText}`,
      response_json_schema: {
        type: 'object',
        properties: {
          roles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                is_new: { type: 'boolean' },
                openings: { type: 'number' },
                required_skills: { type: 'string' },
                pay_rate: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const extracted = result?.roles || [];
    const extractedTitles = extracted.map(r => r.title.toLowerCase());
    const existingTitles = roles.map(r => r.title.toLowerCase());
    const newOnes = extracted.filter(r => !existingTitles.includes(r.title.toLowerCase()));
    const removed = roles.filter(r => !extractedTitles.includes(r.title.toLowerCase()));
    const existing = roles.filter(r => extractedTitles.includes(r.title.toLowerCase()));

    // Add new roles
    for (const r of newOnes) {
      await base44.entities.OpenRole.create({
        title: r.title,
        category: categoryGuess(r.title),
        priority: 'medium',
        is_active: true,
        is_new: r.is_new || false,
        openings: r.openings || 0,
        required_skills: r.required_skills || '',
        pay_rate: r.pay_rate || '',
      });
    }
    // Update existing roles with latest extracted data
    for (const role of existing) {
      const matched = extracted.find(r => r.title.toLowerCase() === role.title.toLowerCase());
      if (matched) {
        await base44.entities.OpenRole.update(role.id, {
          openings: matched.openings ?? role.openings,
          is_new: matched.is_new || false,
          required_skills: matched.required_skills || role.required_skills || '',
          pay_rate: matched.pay_rate || role.pay_rate || '',
          is_active: true,
        });
      }
    }
    // Deactivate removed roles (mark inactive rather than delete)
    for (const role of removed) {
      await base44.entities.OpenRole.update(role.id, { is_active: false, is_new: false });
    }

    queryClient.invalidateQueries({ queryKey: ['open-roles'] });
    setIsSyncing(false);
    setSyncOpen(false);
    setSyncText('');

    // Detect brand-new roles (didn't exist before) OR newly-labeled ones
    const brandNew = newOnes.filter(r => r.is_new);
    const relabeledNew = existing
      .filter(r => !r.is_new)
      .filter(r => {
        const matched = extracted.find(e => e.title.toLowerCase() === r.title.toLowerCase());
        return matched?.is_new;
      });
    const allNewRoles = [...newOnes.map(r => ({ ...r, isNew: true })), ...relabeledNew.map(r => {
      const matched = extracted.find(e => e.title.toLowerCase() === r.title.toLowerCase());
      return { ...r, ...matched, isNew: true };
    })];

    if (allNewRoles.length > 0) {
      setNewRolesDetected(allNewRoles);
      setPostGenOpen(true);
      toast.success(`Sync complete: +${newOnes.length} added, ${removed.length} marked inactive. ${allNewRoles.length} NEW role(s) detected!`);
    } else {
      toast.success(`Sync complete: +${newOnes.length} added, ${removed.length} marked inactive`);
    }
  };

  const handleGenerateNewRolesPosts = async () => {
    setIsGeneratingPosts(true);
    try {
      // Spread across 5 days starting today
      const today = new Date();
      const scheduledDates = NON_LINKEDIN_PLATFORMS.map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + Math.floor(i * (7 / NON_LINKEDIN_PLATFORMS.length)));
        return d.toISOString().split('T')[0];
      });

      const result = await base44.functions.invoke('generateCampaignPosts', {
        roles: newRolesDetected.map(r => ({
          title: r.title,
          is_new: true,
          required_skills: r.required_skills || '',
          pay_rate: r.pay_rate || '',
          openings: r.openings || 0,
        })),
        platforms: NON_LINKEDIN_PLATFORMS,
        scheduledDates,
        scheduledTime: '10:00',
        titlePrefix: `New Roles — ${today.toISOString().split('T')[0]}`,
        highlightNew: true,
      });

      setPostGenOpen(false);
      setNewRolesDetected([]);
      toast.success(`Generated ${result.data?.total || 0} posts for new roles — pending approval before publishing.`);
    } catch (err) {
      toast.error('Post generation failed: ' + err.message);
    }
    setIsGeneratingPosts(false);
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
          <Card key={role.id} className="p-4 flex items-start justify-between group">
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm font-medium truncate">{role.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={categoryColors[role.category]}>
                  {role.category?.replace(/_/g, ' ')}
                </Badge>
                {role.is_new && (
                  <Badge variant="secondary" className="bg-amber-400/20 text-amber-700 text-[10px] font-bold border border-amber-300">
                    🆕 NEW
                  </Badge>
                )}
                {role.priority === 'high' && (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">
                    High Priority
                  </Badge>
                )}
                {role.openings > 0 && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    {role.openings} {role.openings === 1 ? 'opening' : 'openings'}
                  </span>
                )}
              </div>
              {role.pay_rate && (
                <div className="flex items-center gap-1 text-[11px] text-green-700">
                  <DollarSign className="w-3 h-3 flex-shrink-0" />
                  <span className="font-medium">{role.pay_rate}</span>
                </div>
              )}
              {role.required_skills && (
                <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
                  <Wrench className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed line-clamp-2">{role.required_skills}</span>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => deleteMutation.mutate(role.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0 ml-2"
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

      {/* New Roles Detected — Post Generation Confirmation */}
      <Dialog open={postGenOpen} onOpenChange={setPostGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {newRolesDetected.length} New Role{newRolesDetected.length > 1 ? 's' : ''} Detected!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              The following roles are marked as <strong>NEW</strong> in this sync. Would you like to auto-generate posts for them across all non-LinkedIn platforms, spread across this week?
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 max-h-40 overflow-y-auto">
              {newRolesDetected.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">NEW</Badge>
                  <span className="font-medium">{r.title}</span>
                  {r.pay_rate && <span className="text-muted-foreground text-xs">· {r.pay_rate}</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Posts will be saved as <strong>scheduled drafts</strong>. You'll receive an approval email before each one goes live.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setPostGenOpen(false); setNewRolesDetected([]); }}>
                Skip for now
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleGenerateNewRolesPosts}
                disabled={isGeneratingPosts}
              >
                {isGeneratingPosts
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-4 h-4" /> Generate Posts</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}