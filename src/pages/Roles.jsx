import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parsePayMax } from '@/lib/pay-utils';
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
  // Engineering
  if (/engineer|developer|devops|python|ios|android|backend|frontend|full.stack|full stack|ml |ai |machine learning|data engineer|data analyst|data science|software|cloud|cybersecurity|blockchain|qa |quality assurance|mobile dev|web dev|sre |site reliability|platform engineer|infrastructure|firmware|embedded|architect|data platform|mlops|llm|nlp|computer vision|robotics|database admin|dba|systems|gameplay|data capture|annotation|labeling|tagger/.test(t)) return 'engineering';
  // Design
  if (/ux|ui |user interface|user experience|graphic design|brand design|visual design|illustrat|adobe|motion graphic|animation|3d artist|photo|web design|product design|interaction design|figma|sketch/.test(t)) return 'design';
  // Media (audio/video/voice production)
  if (/audio|voice actor|voice over|voiceover|crowd worker|field record|recording expert|sound|music|speech|accent|dialect|film editor|video edit|video produc|runops|podcast|narrator|broadcaster|streamer|voice coach|voice director/.test(t)) return 'media';
  // Language
  if (/language expert|language specialist|linguist|translat|interpret|locali[sz]|subtitl|caption|transcri|proofreader|bilingual|multilingual|generalist.*english|english.*generalist|spanish|french|german|portuguese|italian|japanese|korean|chinese|arabic|hindi|bengali|urdu|swahili|polish|dutch|russian|turkish|persian|tagalog|malay|thai|vietnamese|ukrainian|czech|hungarian|romanian|greek|hebrew|danish|swedish|norwegian|finnish|indonesian|catalan|punjabi|tamil|telugu|kannada|gujarati|odia|belarusian|afrikaans|albanian|amharic|azerbaijani|basque|bosnian|bulgarian|burmese|croatian|estonian|georgian|icelandic|khmer|latvian|lithuanian|macedonian|maltese|mongolian|nepali|pashto|serbian|sinhala|slovak|slovenian|somali|yoruba|zulu/.test(t)) return 'language';
  // Content / Marketing
  if (/writer|author|journalist|content|copywriter|linguistic|philosophy|editor|blogger|seo|social media|marketing|communication|public relation|brand strategist/.test(t)) return 'content';
  // Strictly Legal (attorneys, compliance, paralegal)
  if (/attorney|general counsel|legal expert|legal counsel|paralegal|compliance officer|legal/.test(t)) return 'finance_legal';
  // Business & Finance (finance roles, investment, accounting — broader business)
  if (/finance|financial|investment|investor|cpa|accountant|tax|bookkeep|treasurer|controller|actuar|underwriter|banker|budget|audit|revenue|profit|economic|business analyst|business dev|sales|account manager|customer success|hr |human resource|recruiter|talent|product manager|project manager|program manager|operations|chief|director|vp |ceo|cto|cfo|manager|executive|coordinator|administrator|consultant|advisor|strategist|analyst|personal finance|wealth|portfolio|asset/.test(t)) return 'business';
  // Science / Health
  if (/biolog|health|medical|clinical|nurse|doctor|pharma|stem|scientist|researcher|lab|chemistry|physic|neuroscien|genomic|biotech|radiolog|psycholog|therapist|nutritionist|epidemiolog|neurolog|dentist|optometr|veterinar|surgeon/.test(t)) return 'science';
  // Management / Operations
  if (/supervisor|clerk|hospitality|hotel|motel|resort|landscap|groundskeep|service worker|specialist/.test(t)) return 'management';
  return 'other';
};

const categories = ['engineering', 'design', 'media', 'content', 'business', 'finance_legal', 'science', 'management', 'language', 'other'];
const categoryLabels = {
  engineering: 'IT & Engineering',
  design: 'Creative & Design',
  media: 'Audio, Video & Media',
  content: 'Content & Writing',
  business: 'Business & Finance',
  finance_legal: 'Legal & Compliance',
  science: 'Science & Healthcare',
  management: 'Management & Ops',
  language: 'Language & Translation',
  other: 'Other',
};
const categoryColors = {
  engineering: 'bg-primary/10 text-primary',
  design: 'bg-chart-3/10 text-chart-3',
  media: 'bg-chart-5/10 text-chart-5',
  content: 'bg-chart-4/10 text-chart-4',
  business: 'bg-amber-100 text-amber-700',
  finance_legal: 'bg-chart-2/10 text-chart-2',
  science: 'bg-accent/10 text-accent',
  management: 'bg-slate-100 text-slate-600',
  language: 'bg-violet-100 text-violet-700',
  other: 'bg-muted text-muted-foreground',
};



export default function Roles() {
  const [search, setSearch] = useState('');
  // Stackable filters — combine freely. Default: no filter active.
  const [filterHighDemand, setFilterHighDemand] = useState(false);
  const [filterNew, setFilterNew] = useState(false);
  const [filterHasOpenings, setFilterHasOpenings] = useState(false);
  const [segment, setSegment] = useState('all'); // category dropdown: 'all' or any category key
  const [sortBy, setSortBy] = useState('best_match'); // best_match | openings | pay | recent | alpha
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
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
    let response;
    try {
      response = await base44.functions.invoke('syncRoles', { syncText });
    } catch (err) {
      toast.error('Sync failed: ' + (err?.response?.data?.error || err?.message || 'Unknown error'));
      setIsSyncing(false);
      return;
    }

    const payload = response.data || {};
    if (payload.error) {
      toast.error('Sync failed: ' + payload.error);
      setIsSyncing(false);
      return;
    }

    // Backend already created/updated/deactivated the roles. Just refresh.
    queryClient.invalidateQueries({ queryKey: ['open-roles'] });
    setIsSyncing(false);
    setSyncOpen(false);
    setSyncText('');

    const added = payload.added ?? 0;
    const deactivated = payload.deactivated ?? 0;
    const newRoles = payload.newRoles || [];

    if (newRoles.length > 0) {
      setNewRolesDetected(newRoles.map(r => ({ ...r, isNew: true })));
      setPostGenOpen(true);
      toast.success(`Sync complete: +${added} added, ${deactivated} marked inactive. ${newRoles.length} NEW role(s) detected!`);
    } else {
      toast.success(`Sync complete: +${added} added, ${deactivated} marked inactive`);
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

  const filtered = roles
    .filter(r => showInactive ? true : r.is_active !== false)
    .filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    .filter(r => !filterHighDemand || r.is_high_demand)
    .filter(r => !filterNew || r.is_new)
    .filter(r => !filterHasOpenings || (Number(r.openings) || 0) > 0)
    .filter(r => {
      if (segment === 'all') return true;
      // Match the displayed category, which falls back to the regex-guessed
      // category when role.category === 'other'. Filter must mirror that
      // logic so the user's mental model matches what they see on screen.
      const effective = (!r.category || r.category === 'other') ? categoryGuess(r.title) : r.category;
      return effective === segment;
    })
    .sort((a, b) => {
      // Always keep active above inactive — applies to every sort mode.
      const aA = a.is_active !== false ? 1 : 0;
      const bA = b.is_active !== false ? 1 : 0;
      if (aA !== bA) return bA - aA;

      if (sortBy === 'openings') {
        return (Number(b.openings) || 0) - (Number(a.openings) || 0);
      }
      if (sortBy === 'pay') {
        // Highest-value-in-the-string sort. Roles with no parseable pay (=0)
        // naturally sink to the bottom of the pay-sorted list.
        return parsePayMax(b.pay_rate) - parsePayMax(a.pay_rate);
      }
      if (sortBy === 'recent') {
        const dB = b.created_date ? new Date(b.created_date).getTime() : 0;
        const dA = a.created_date ? new Date(a.created_date).getTime() : 0;
        return dB - dA;
      }
      if (sortBy === 'alpha') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // 'best_match' default: high-demand + new score, what was here before.
      const scoreB = (b.is_high_demand ? 2 : 0) + (b.is_new ? 1 : 0);
      const scoreA = (a.is_high_demand ? 2 : 0) + (a.is_new ? 1 : 0);
      return scoreB - scoreA;
    });

  const hasActiveFilters =
    search ||
    filterHighDemand ||
    filterNew ||
    filterHasOpenings ||
    segment !== 'all' ||
    sortBy !== 'best_match';

  const resetFilters = () => {
    setSearch('');
    setFilterHighDemand(false);
    setFilterNew(false);
    setFilterHasOpenings(false);
    setSegment('all');
    setSortBy('best_match');
  };

  const inactiveCount = roles.filter(r => r.is_active === false).length;

  const purgeInactive = async () => {
    if (inactiveCount === 0) {
      toast.info('No inactive roles to delete');
      return;
    }
    const ok = window.confirm(
      `Permanently delete ${inactiveCount} inactive role${inactiveCount === 1 ? '' : 's'}?\n\n` +
      `This cannot be undone. Posts you already created that targeted these roles will keep working, but the roles themselves will be gone from the database.`
    );
    if (!ok) return;
    setIsPurging(true);
    try {
      const toDelete = roles.filter(r => r.is_active === false);
      await Promise.all(toDelete.map(r => base44.entities.OpenRole.delete(r.id)));
      queryClient.invalidateQueries({ queryKey: ['open-roles'] });
      toast.success(`Deleted ${toDelete.length} inactive role${toDelete.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error('Purge failed: ' + (err?.message || 'error'));
    }
    setIsPurging(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Roles</h1>
          <p className="text-sm text-muted-foreground">
            {roles.filter(r => r.is_active !== false).length} active · {roles.filter(r => r.is_high_demand).length} high demand · {roles.filter(r => r.is_new).length} new
          </p>
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

      {/* Search + filters row */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles..."
              className="pl-10"
            />
          </div>

          {/* Segment (category) dropdown */}
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best_match">Best match (default)</SelectItem>
              <SelectItem value="openings">Most openings</SelectItem>
              <SelectItem value="pay">Highest pay</SelectItem>
              <SelectItem value="recent">Recently added</SelectItem>
              <SelectItem value="alpha">A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stackable boolean filters + reset */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={filterHighDemand ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterHighDemand(v => !v)}
            className="text-xs whitespace-nowrap"
          >
            🔥 High Demand
            <span className={`ml-1 font-bold ${filterHighDemand ? 'text-primary-foreground' : 'text-orange-500'}`}>
              {roles.filter(r => r.is_high_demand && r.is_active !== false).length}
            </span>
          </Button>
          <Button
            variant={filterNew ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterNew(v => !v)}
            className="text-xs whitespace-nowrap"
          >
            🆕 New
            <span className={`ml-1 font-bold ${filterNew ? 'text-primary-foreground' : 'text-amber-600'}`}>
              {roles.filter(r => r.is_new && r.is_active !== false).length}
            </span>
          </Button>
          <Button
            variant={filterHasOpenings ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterHasOpenings(v => !v)}
            className="text-xs whitespace-nowrap"
          >
            Has openings
            <span className={`ml-1 font-bold ${filterHasOpenings ? 'text-primary-foreground' : 'text-emerald-600'}`}>
              {roles.filter(r => (Number(r.openings) || 0) > 0 && r.is_active !== false).length}
            </span>
          </Button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
            >
              Reset filters
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {roles.filter(r => r.is_active !== false).length}
          </span>
        </div>
      </div>

      {inactiveCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-muted/40 border border-muted rounded-md text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{inactiveCount}</span> inactive role{inactiveCount === 1 ? '' : 's'} hidden from generators and the list above.
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-primary"
            />
            <span>Show inactive</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={purgeInactive}
            disabled={isPurging}
            className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
            {isPurging ? 'Deleting…' : `Permanently delete ${inactiveCount} inactive`}
          </Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((role) => (
          <Card
            key={role.id}
            className={`p-4 flex items-start justify-between group ${role.is_active === false ? 'opacity-60 border-dashed' : ''}`}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm font-medium truncate">{role.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {role.is_active === false && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] border border-muted">
                    inactive
                  </Badge>
                )}
                <Badge variant="secondary" className={categoryColors[role.category === 'other' ? categoryGuess(role.title) : role.category] || categoryColors.other}>
                  {categoryLabels[role.category === 'other' ? categoryGuess(role.title) : role.category] || 'Other'}
                </Badge>
                {role.is_new && (
                  <Badge variant="secondary" className="bg-amber-400/20 text-amber-700 text-[10px] font-bold border border-amber-300">
                    🆕 NEW
                  </Badge>
                )}
                {role.is_high_demand && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-300">
                    🔥 High Demand
                  </Badge>
                )}
                {role.priority === 'high' && !role.is_high_demand && (
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