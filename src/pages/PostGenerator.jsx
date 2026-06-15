import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StrategySelector from '@/components/generator/StrategySelector';
import RoleSelector from '@/components/generator/RoleSelector';
import SegmentSelector, { SEGMENTS } from '@/components/generator/SegmentSelector';
import PlatformPostCard from '@/components/generator/PlatformPostCard';
import PlatformSelector from '@/components/generator/PlatformSelector';
import PersonaManager from '@/components/generator/PersonaManager';
import PlatformRecommender from '@/components/generator/PlatformRecommender';
import WhereToPostChecklist from '@/components/generator/WhereToPostChecklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, CalendarClock, GitCompare, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { parsePayMax } from '@/lib/pay-utils';

export default function PostGenerator() {
  const [strategy, setStrategy] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [activeSegments, setActiveSegments] = useState([]);
  // Stackable filter chips that narrow the role pool intersection-style.
  // Independent of segment selection and of the strategy — they always apply.
  const [filterHighDemand, setFilterHighDemand] = useState(false);
  const [filterNew, setFilterNew] = useState(false);
  const [filterHasOpenings, setFilterHasOpenings] = useState(false);
  const [referralLink, setReferralLink] = useState('https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral');
  const [customCta, setCustomCta] = useState(''); // optional override for link-restrictive platforms
  const [isRegeneratingCta, setIsRegeneratingCta] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  // Per-platform generated posts. Each: { platform, content, postId|null, error|null }
  const [posts, setPosts] = useState([]);
  const [postsB, setPostsB] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [needsReview, setNeedsReview] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin']);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [abMode, setAbMode] = useState(false);
  const [strategyB, setStrategyB] = useState('');
  const [isGeneratingNewRoles, setIsGeneratingNewRoles] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['open-roles'],
    queryFn: () => base44.entities.OpenRole.filter({ is_active: true }),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.filter({ status: 'active' }),
  });

  const regenerateCta = async () => {
    setIsRegeneratingCta(true);
    try {
      const targetPlatform = selectedPlatforms.find(p => !['linkedin','mastodon','bluesky'].includes(p)) || 'instagram';
      const res = await base44.functions.invoke('generatePost', {
        ctaMode: 'suggest',
        platforms: [targetPlatform],
      });
      const payload = res?.data ?? res ?? {};
      if (payload.cta) {
        setCustomCta(payload.cta);
      } else {
        toast.error('Could not generate a CTA — try again.');
      }
    } catch (err) {
      toast.error('CTA generation failed: ' + (err?.message || 'error'));
    }
    setIsRegeneratingCta(false);
  };

  // Save one platform's post, tagging notes with platform: so the scheduler
  // routes it to the right place (this was previously missing).
  const savePost = async ({ platform, content, strat, asScheduled }) => {
    const isThought = strat === 'thought_leadership';
    const created = await base44.entities.GeneratedPost.create({
      title: isThought
        ? `thought leadership — ${platform}`
        : `${strat.replace(/_/g, ' ')} — ${platform} — ${selectedRoles.slice(0, 2).join(', ') || 'all roles'}`,
      content,
      strategy: strat,
      campaign_id: campaignId || undefined,
      target_roles: isThought ? '' : selectedRoles.join(', '),
      status: asScheduled && scheduledDate ? 'scheduled' : 'draft',
      scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : undefined,
      scheduled_time: scheduledDate ? scheduledTime : undefined,
      needs_review: needsReview || undefined,
      notes: `platform:${platform} type:${isThought ? 'thought_leadership' : 'job_referral'}`,
    });
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
    return created;
  };

  const toggleRole = (title) => {
    setSelectedRoles(prev => 
      prev.includes(title) ? prev.filter(r => r !== title) : [...prev, title]
    );
  };

  // Map segment IDs to OpenRole categories for dynamic DB-driven role selection
  const SEGMENT_CATEGORY_MAP = {
    it: 'engineering',
    business: 'management',
    legal: 'finance_legal',
    media: 'media',
    creative: 'design',
    content: 'content',
    science: 'science',
    language: 'language',
  };

  const toggleSegment = (segId, segRoles) => {
    if (segId === 'all') {
      const allTitles = roles.map(r => r.title);
      const allSelected = allTitles.every(t => selectedRoles.includes(t));
      setSelectedRoles(allSelected ? [] : allTitles);
      setActiveSegments(allSelected ? [] : ['all']);
      return;
    }
    const isActive = activeSegments.includes(segId);
    setActiveSegments(prev => isActive ? prev.filter(s => s !== segId) : [...prev.filter(s => s !== 'all'), segId]);

    // Get roles from DB matching this segment's category, plus hardcoded segment roles
    const categoryKey = SEGMENT_CATEGORY_MAP[segId];
    const dbRolesForSegment = categoryKey
      ? roles.filter(r => r.category === categoryKey).map(r => r.title)
      : [];
    const allSegmentRoles = [...new Set([...segRoles, ...dbRolesForSegment])];

    if (isActive) {
      const otherActiveRoles = SEGMENTS
        .filter(s => activeSegments.includes(s.id) && s.id !== segId)
        .flatMap(s => {
          const catKey = SEGMENT_CATEGORY_MAP[s.id];
          const dbRoles = catKey ? roles.filter(r => r.category === catKey).map(r => r.title) : [];
          return [...new Set([...s.roles, ...dbRoles])];
        });
      setSelectedRoles(prev => prev.filter(r => !allSegmentRoles.includes(r) || otherActiveRoles.includes(r)));
    } else {
      setSelectedRoles(prev => [...new Set([...prev, ...allSegmentRoles])]);
    }
  };


  const handleGenerateNewRoles = async () => {
    // Filter only NEW-labeled roles that match the current target audience selection
    const newRoles = roles.filter(r => r.is_new && r.is_active);
    const audienceFilteredNew = selectedRoles.length > 0
      ? newRoles.filter(r => selectedRoles.includes(r.title))
      : newRoles;

    if (!audienceFilteredNew.length) {
      toast.error('No NEW-labeled roles found for the selected target audience.');
      return;
    }

    const platforms = selectedPlatforms.filter(p => p !== 'linkedin');
    if (!platforms.length) {
      toast.error('Please select at least one non-LinkedIn platform to generate new role posts for.');
      return;
    }

    setIsGeneratingNewRoles(true);
    const today = new Date();
    const scheduledDate = today.toISOString().split('T')[0];

    try {
      const result = await base44.functions.invoke('generateCampaignPosts', {
        roles: audienceFilteredNew.map(r => ({
          title: r.title,
          is_new: true,
          required_skills: r.required_skills || '',
          pay_rate: r.pay_rate || '',
          openings: r.openings || 0,
        })),
        platforms,
        scheduledDates: platforms.map(() => scheduledDate),
        scheduledTime: scheduledTime || '10:00',
        referralLink,
        titlePrefix: `New Roles — ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        highlightNew: true,
      });

      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success(
        `Generated ${result.data?.total || platforms.length} posts for ${audienceFilteredNew.length} NEW role(s) — saved as drafts for approval.`
      );
    } catch (err) {
      toast.error('Failed to generate new roles posts: ' + err.message);
    }
    setIsGeneratingNewRoles(false);
  };

  const handleGenerate = async () => {
    if (!strategy) { toast.error('Please select a post strategy'); return; }
    if (abMode && !strategyB) { toast.error('Please select a Strategy B for comparison'); return; }
    if (!selectedPlatforms.length) { toast.error('Please select at least one platform'); return; }

    // Thought-leadership posts are link-free; only referral strategies need a link.
    const isThought = (s) => s === 'thought_leadership';
    const needsLink = !isThought(strategy) || (abMode && !isThought(strategyB));
    if (needsLink && (!referralLink || !/^https?:\/\//.test(referralLink))) {
      toast.error('Please enter a valid referral link (must start with http/https)');
      return;
    }

    // ── Compose the role pool with intersection semantics ──────────────────
    //
    // Order of operations:
    //   1. Start from the user's selected roles (or all active roles if none).
    //   2. Apply the stackable filter chips (high demand, new, has openings).
    //   3. If the strategy is a spotlight strategy, further filter to its slice.
    //   4. For top-pay spotlight, also rank by pay and take the top N.
    //
    // Spotlight strategies are intersection-style: "🔥 High Demand" within
    // your selected "Engineering" segment means "high-demand engineering roles",
    // not "all high-demand roles ignoring your segment".
    const activeRoles = roles.filter(r => r.is_active !== false);
    const baseTitles = selectedRoles.length > 0 ? selectedRoles : activeRoles.map(r => r.title);
    const basePool = activeRoles.filter(r => baseTitles.includes(r.title));

    // Apply stackable chip filters (independent of strategy).
    const chipFilteredPool = basePool
      .filter(r => !filterHighDemand || r.is_high_demand)
      .filter(r => !filterNew || r.is_new)
      .filter(r => !filterHasOpenings || (Number(r.openings) || 0) > 0);

    // Strategy-specific further-narrowing.
    const poolForStrategy = (strat) => {
      if (strat === 'new_roles_spotlight') {
        return chipFilteredPool.filter(r => r.is_new);
      }
      if (strat === 'high_demand_spotlight') {
        return chipFilteredPool.filter(r => r.is_high_demand);
      }
      if (strat === 'top_pay_spotlight') {
        // Sort by parsed pay descending, take the top 8 with non-zero pay.
        // 8 keeps the post focused and gives the LLM enough to work with.
        return chipFilteredPool
          .map(r => ({ r, pay: parsePayMax(r.pay_rate) }))
          .filter(x => x.pay > 0)
          .sort((a, b) => b.pay - a.pay)
          .slice(0, 8)
          .map(x => x.r);
      }
      return chipFilteredPool;
    };

    // Guards: spotlight strategies fail loudly if their slice is empty.
    const guardSpotlight = (strat) => {
      if (!['new_roles_spotlight','high_demand_spotlight','top_pay_spotlight'].includes(strat)) return null;
      const pool = poolForStrategy(strat);
      if (pool.length === 0) {
        const labels = {
          new_roles_spotlight: 'No 🆕 New roles match your current selection + filters.',
          high_demand_spotlight: 'No 🔥 High Demand roles match your current selection + filters.',
          top_pay_spotlight: 'No roles with parseable pay info match your current selection + filters.',
        };
        return labels[strat];
      }
      return null;
    };

    const guardA = guardSpotlight(strategy);
    if (guardA) { toast.error(guardA); return; }
    if (abMode) {
      const guardB = guardSpotlight(strategyB);
      if (guardB) { toast.error(guardB + ' (Strategy B)'); return; }
    }

    const roleTitlesFor = (strat) => poolForStrategy(strat).map(r => r.title);

    setIsGenerating(true);
    setPosts([]);
    setPostsB([]);

    const callGen = async (strat) => {
      const res = await base44.functions.invoke('generatePost', {
        strategy: strat,
        platforms: selectedPlatforms,
        roleTitles: roleTitlesFor(strat),
        personalNote,
        referralLink,
        customCta: customCta.trim() || undefined,
      });
      const payload = res?.data ?? res ?? {};
      // Normalize to per-platform entries with a postId slot for later saving.
      return (payload.posts || []).map(p => ({ ...p, postId: null }));
    };

    try {
      if (abMode) {
        const [a, b] = await Promise.all([callGen(strategy), callGen(strategyB)]);
        setPosts(a);
        setPostsB(b);
      } else {
        setPosts(await callGen(strategy));
      }
    } catch (err) {
      toast.error('Generation failed: ' + (err?.message || err?.response?.data?.error || 'Unknown error'));
    }
    setIsGenerating(false);
  };

  // Save a single platform's post (variant A or B). Updates that entry with its postId.
  const handleSavePost = async (variant, platform, asScheduled = false) => {
    const list = variant === 'B' ? postsB : posts;
    const setList = variant === 'B' ? setPostsB : setPosts;
    const entry = list.find(p => p.platform === platform);
    if (!entry || !entry.content) return;
    const strat = variant === 'B' ? strategyB : strategy;
    try {
      const created = await savePost({ platform, content: entry.content, strat, asScheduled });
      setList(prev => prev.map(p => p.platform === platform ? { ...p, postId: created.id } : p));
      toast.success(`${platform} post ${asScheduled && scheduledDate ? 'scheduled' : 'saved'}!`);
    } catch (err) {
      toast.error(`Failed to save ${platform} post: ` + (err?.message || 'error'));
    }
  };

  // Update the editable content of one platform's post in place.
  const updatePostContent = (variant, platform, content) => {
    const setList = variant === 'B' ? setPostsB : setPosts;
    setList(prev => prev.map(p => p.platform === platform ? { ...p, content } : p));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post Generator</h1>
        <p className="text-sm text-muted-foreground">Create AI-optimized LinkedIn posts for maximum referrals</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">1. Choose Strategy</Label>
              <button
                onClick={() => { setAbMode(m => !m); setPostsB([]); }}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  abMode ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                <GitCompare className="w-3 h-3" />
                A/B Test {abMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className={abMode ? 'grid grid-cols-2 gap-3' : ''}>
              <div>
                {abMode && <p className="text-[10px] font-semibold text-muted-foreground mb-1">Strategy A</p>}
                <StrategySelector selected={strategy} onSelect={setStrategy} />
              </div>
              {abMode && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Strategy B</p>
                  <StrategySelector selected={strategyB} onSelect={setStrategyB} />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">
                2. Target Audience
                <span className="font-normal text-muted-foreground ml-1">(optional — targets all if empty)</span>
              </Label>
              <PersonaManager
                selectedRoles={selectedRoles}
                activeSegments={activeSegments}
                onApplyPersona={(roles, segments) => {
                  setSelectedRoles(roles);
                  setActiveSegments(segments);
                }}
              />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">By Segment</p>
                <SegmentSelector activeSegments={activeSegments} onToggleSegment={toggleSegment} />
              </div>

              {/* ── Stackable filter chips: narrow the role pool further ── */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                  Filters
                  {(filterHighDemand || filterNew || filterHasOpenings) && (
                    <button
                      onClick={() => { setFilterHighDemand(false); setFilterNew(false); setFilterHasOpenings(false); }}
                      className="ml-2 text-muted-foreground hover:text-foreground underline normal-case font-normal text-[10px]"
                    >
                      reset
                    </button>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    // Counts respect the user's current selection (selected
                    // roles or all active roles if none) so the numbers
                    // reflect what would actually remain after toggling.
                    const baseTitles = selectedRoles.length > 0 ? selectedRoles : roles.filter(r => r.is_active !== false).map(r => r.title);
                    const basePool = roles.filter(r => r.is_active !== false && baseTitles.includes(r.title));
                    const hdCount = basePool.filter(r => r.is_high_demand).length;
                    const newCount = basePool.filter(r => r.is_new).length;
                    const openCount = basePool.filter(r => (Number(r.openings) || 0) > 0).length;
                    return (
                      <>
                        <Button
                          variant={filterHighDemand ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFilterHighDemand(v => !v)}
                          className="text-xs whitespace-nowrap"
                        >
                          🔥 High Demand
                          <span className={`ml-1 font-bold ${filterHighDemand ? 'text-primary-foreground' : 'text-orange-500'}`}>
                            {hdCount}
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
                            {newCount}
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
                            {openCount}
                          </span>
                        </Button>
                      </>
                    );
                  })()}
                </div>
                {(filterHighDemand || filterNew || filterHasOpenings) && (
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    Active filters apply to the role pool used for generation (intersection-style with your segment / individual selection).
                  </p>
                )}
              </div>
              <div>
                <button
                  onClick={() => setRolesOpen(prev => !prev)}
                  className="flex items-center justify-between w-full text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <span>
                    Individual Roles
                    {selectedRoles.length > 0 && <span className="ml-1 text-primary normal-case">({selectedRoles.length} selected)</span>}
                  </span>
                  <span className="text-base leading-none">{rolesOpen ? '▲' : '▼'}</span>
                </button>
                {rolesOpen && <RoleSelector roles={roles} selectedRoles={selectedRoles} onToggle={toggleRole} />}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">3. Referral Link</Label>
            <Input 
              value={referralLink} 
              onChange={(e) => setReferralLink(e.target.value)}
              placeholder="Your referral link"
            />
          </div>

          {selectedPlatforms.some(p => !['linkedin','mastodon','bluesky'].includes(p)) && (
            <div>
              <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                <span>3b. CTA for link-restrictive platforms</span>
                <span className="font-normal text-xs text-muted-foreground">(optional override)</span>
              </Label>
              <div className="text-xs text-muted-foreground mb-2 leading-relaxed">
                Platforms like Instagram, Twitter, Facebook and Threads de-prioritize posts with links.
                On those, the generator ends the post with a CTA asking people to comment <span className="font-mono bg-muted px-1 rounded">Remote</span> — the DM responder then sends them the link.
                If you leave this empty, a fresh CTA is picked at random from a curated pool.
              </div>
              <div className="flex gap-2 items-start">
                <Input
                  value={customCta}
                  onChange={(e) => setCustomCta(e.target.value)}
                  placeholder={'e.g. Comment "Remote" and I\'ll DM you the link 🚀'}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={regenerateCta}
                  disabled={isRegeneratingCta}
                  title="Generate a fresh CTA with AI"
                  className="gap-1.5 shrink-0"
                >
                  {isRegeneratingCta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isRegeneratingCta ? 'Generating…' : '🎲 Regenerate'}
                </Button>
              </div>
              {customCta && !/\bremote\b/i.test(customCta) && (
                <div className="text-xs text-amber-700 mt-1">
                  ⚠ Your CTA must contain the word "Remote" — the DM responder uses it as the trigger keyword. The pool default will be used instead.
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-sm font-semibold mb-2 block">
              4. Personal Touch 
              <span className="font-normal text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Any specific personal experience, numbers, or angle you want included..."
              className="h-20"
            />
          </div>

          {campaigns.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                4. Campaign
                <span className="font-normal text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to a campaign…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No campaign</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color || '#3b82f6' }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Platform Recommender */}
          <PlatformRecommender selectedRoles={selectedRoles} activeSegments={activeSegments} />

          {/* Platform Selector */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Label className="text-sm font-semibold block">5. Publish / Post To</Label>
            <p className="text-[11px] text-muted-foreground -mt-1">Select all platforms — the AI will tailor the tone. Hover a platform for style tips.</p>
            <PlatformSelector selectedPlatforms={selectedPlatforms} onChange={setSelectedPlatforms} />
          </div>

          {/* Schedule Picker */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              6. Schedule <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-start text-left font-normal">
                    {scheduledDate ? format(scheduledDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                </PopoverContent>
              </Popover>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="border border-input rounded-md px-2 py-1 text-sm bg-background w-28"
              />
              {scheduledDate && (
                <Button variant="ghost" size="sm" onClick={() => setScheduledDate(null)}>✕</Button>
              )}
            </div>
            {scheduledDate && (
              <label className="flex items-start gap-2 mt-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={needsReview}
                  onChange={(e) => setNeedsReview(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">Hold for review before publishing</span>
                  {' — the scheduler will skip this post until you clear the flag from the Review queue.'}
                </span>
              </label>
            )}
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full gap-2 h-12 text-base"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {abMode ? 'Generating both variants…' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {abMode ? 'Generate A/B Variants' : 'Generate Post'}
              </>
            )}
          </Button>

          {/* New Roles Quick-Generate */}
          {roles.some(r => r.is_new && r.is_active) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-700 font-semibold text-xs uppercase tracking-wide">🆕 New Roles Detected</span>
                <span className="text-[10px] text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 font-medium">
                  {roles.filter(r => r.is_new && r.is_active && (selectedRoles.length === 0 || selectedRoles.includes(r.title))).length} role(s) match your audience
                </span>
              </div>
              <p className="text-[11px] text-amber-700">
                Auto-generate posts for NEW-labeled roles across selected platforms (excluding LinkedIn). Saved as scheduled drafts.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={handleGenerateNewRoles}
                disabled={isGeneratingNewRoles}
              >
                {isGeneratingNewRoles ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating New Role Posts…</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> Generate New Roles Posts</>
                )}
              </Button>
            </div>
          )}

        </div>

        {/* Preview — one post per selected platform */}
        <div className="lg:col-span-3 space-y-4">
          <WhereToPostChecklist selectedPlatforms={selectedPlatforms} />

          {isGenerating && posts.length === 0 && (
            <Card className="p-8 flex flex-col items-center justify-center text-center min-h-[200px] border-dashed">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Generating {selectedPlatforms.length} post{selectedPlatforms.length > 1 ? 's' : ''}{abMode ? ' × 2 variants' : ''}…
              </p>
            </Card>
          )}

          {!isGenerating && posts.length === 0 && (
            <Card className="p-8 flex flex-col items-center justify-center text-center min-h-[200px] border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl">✍️</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Your generated posts will appear here</p>
              <p className="text-xs text-muted-foreground mt-1">One tailored post per selected platform</p>
            </Card>
          )}

          {posts.map((entry) => {
            const bEntry = abMode ? postsB.find(p => p.platform === entry.platform) : null;
            return (
              <PlatformPostCard
                key={entry.platform}
                entry={entry}
                bEntry={bEntry}
                abMode={abMode}
                strategy={strategy}
                strategyB={strategyB}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                selectedRoles={selectedRoles}
                onEdit={(content) => updatePostContent('A', entry.platform, content)}
                onEditB={(content) => updatePostContent('B', entry.platform, content)}
                onSave={(asScheduled) => handleSavePost('A', entry.platform, asScheduled)}
                onSaveB={(asScheduled) => handleSavePost('B', entry.platform, asScheduled)}
                onPublished={() => queryClient.invalidateQueries({ queryKey: ['generated-posts'] })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}