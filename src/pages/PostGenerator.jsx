import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StrategySelector from '@/components/generator/StrategySelector';
import HashtagSuggester from '@/components/generator/HashtagSuggester';
import RoleSelector from '@/components/generator/RoleSelector';
import SegmentSelector, { SEGMENTS } from '@/components/generator/SegmentSelector';
import PostPreview from '@/components/generator/PostPreview';
import PlatformSelector from '@/components/generator/PlatformSelector';
import PersonaManager from '@/components/generator/PersonaManager';
import PlatformRecommender from '@/components/generator/PlatformRecommender';
import WhereToPostChecklist from '@/components/generator/WhereToPostChecklist';
import { PLATFORMS } from '@/components/generator/PlatformSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ABComparePreview from '@/components/generator/ABComparePreview';
import { Loader2, Sparkles, CalendarClock, GitCompare, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CEO_CONTEXT } from '@/lib/ceo-context';

export default function PostGenerator() {
  const [strategy, setStrategy] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [activeSegments, setActiveSegments] = useState([]);
  const [referralLink, setReferralLink] = useState('https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral');
  const [personalNote, setPersonalNote] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [campaignId, setCampaignId] = useState('');
  const [savedPostId, setSavedPostId] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin']);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [abMode, setAbMode] = useState(false);
  const [strategyB, setStrategyB] = useState('');
  const [contentB, setContentB] = useState('');
  const [savedPostIdB, setSavedPostIdB] = useState(null);
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

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.GeneratedPost.create(data),
    onSuccess: (post) => {
      setSavedPostId(post.id);
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success('Post saved!');
    },
  });

  const saveMutationB = useMutation({
    mutationFn: (data) => base44.entities.GeneratedPost.create(data),
    onSuccess: (post) => {
      setSavedPostIdB(post.id);
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success('Variant B saved!');
    },
  });

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

  // Build enriched role data for prompt context
  const rolesWithOpenings = roles
    .filter(r => r.openings > 0)
    .map(r => `${r.title} (${r.openings} ${r.openings === 1 ? 'opening' : 'openings'})`)
    .join(', ');

  const rolesEnrichedContext = roles
    .filter(r => r.required_skills || r.pay_rate)
    .map(r => {
      const parts = [r.title];
      if (r.pay_rate) parts.push(`pay: ${r.pay_rate}`);
      if (r.required_skills) parts.push(`skills: ${r.required_skills}`);
      return parts.join(' | ');
    })
    .join('\n');

  const buildPrompt = (strat, rolesList, platformInstruction, isNewRolesSpotlight = false) => `${CEO_CONTEXT}

NOTE: The above context is provided as optional background reference. Use it only where it genuinely strengthens the post — do not force it into every piece of content.

You are writing a LinkedIn referral post on behalf of a professional who works at micro1 as an Audio Expert Reviewer. The post must attract experienced professionals to apply through their referral link. Write in first person, personal and credible — as if a real professional is genuinely recommending this opportunity to their network.

STRATEGY: ${strat === 'new_roles_spotlight' ? 'targeted_role' : strat.replace(/_/g, ' ')}${isNewRolesSpotlight ? '\nFOCUS: These are NEWLY ADDED roles — emphasize that they are fresh opportunities just opened up, encourage urgent action, and highlight that spots may fill fast.' : ''}
REFERRAL LINK: ${referralLink}
TARGET ROLES: ${rolesList.join(', ')}
${(strat === 'urgency' || strat === 'niche_community') && rolesWithOpenings ? `VACANCY DATA (use naturally for urgency/FOMO — mention specific open counts to drive action, e.g. "only 2 spots left for X"): ${rolesWithOpenings}` : ''}
${rolesEnrichedContext ? `ROLE DETAILS (use where relevant — mention pay rates to attract applicants, reference required skills to speak directly to the right audience. Only include details that naturally strengthen the post.):
${rolesEnrichedContext}` : ''}
${personalNote ? `PERSONAL NOTE TO INCLUDE: ${personalNote}` : ''}${platformInstruction}

SIGNATURE STRUCTURE — FOLLOW THIS FORMAT EXACTLY:

1. HEADLINE (first 2 lines — CRITICAL: must be fully visible without "See more"):
   Use this format as the opening:
   📍 [Month] - Remote Opportunities at Leading AI Company micro1 🤖
   ➡️ [REFERRAL LINK]

2. PERSONAL INTRO (1 short paragraph):
   - Written in first person
   - Mention working at micro1 since October 2025 as Audio Expert, and as Reviewer since March 2026
   - Genuine, warm, and credible — mention reliable pay, flexible remote hours, supportive team
   - Keep it authentic, not salesy

3. WHO SHOULD APPLY (1 short paragraph with 👉):
   - Professionals with solid expertise and good English
   - Mention the interview process briefly: ~30 min interview → certification → possibility of being hired
   - Include the spam folder reminder: ( 🛑 Always check your spam folder just in case!!! 🛑 )

4. ROLES LIST:
   - Introduce with: "micro1 is hiring experts across many fields — here's a sample relevant to this post:"
   - List the TARGET ROLES provided, using a clean bullet format with dashes
   - End with: "...and many more!"

5. REFERRAL PERK (1 line):
   - Mention that once certified, you get your own referral link to earn bonuses

6. CLOSING (1-2 lines):
   - Invite sharing and DMs for questions
   - Keep it friendly and open

7. HASHTAGS: 6-8 relevant professional hashtags

STRICT TONE RULES:
- NO "earn money", "make money", "easy income", "extra cash", "side hustle", "get paid fast"
- NO fake urgency or hype
- Write as a real, trustworthy professional — not an advertiser
- Compensation: mention "reliable pay" or "competitive compensation" naturally, once
- Emojis: use purposefully for structure and warmth (👉 📍 ➡️ 🙌 👍 🛑), not for hype

Generate ONLY the post content, no explanations or preamble.`;

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

    setIsGenerating(true);

    // For "new_roles_spotlight", only include NEW-labeled roles from the selected audience
    const newRolesOnly = roles.filter(r => r.is_new && r.is_active).map(r => r.title);
    const audiencePool = selectedRoles.length > 0 ? selectedRoles : roles.map(r => r.title);
    const newAudienceRoles = newRolesOnly.filter(t => audiencePool.includes(t));

    if (strategy === 'new_roles_spotlight' && newAudienceRoles.length === 0) {
      toast.error('No NEW-labeled roles found for the selected target audience.');
      setIsGenerating(false);
      return;
    }

    const rolesList = strategy === 'new_roles_spotlight'
      ? newAudienceRoles
      : (selectedRoles.length > 0 ? selectedRoles : roles.map(r => r.title));

    const platformTones = selectedPlatforms
      .map(id => PLATFORMS.find(p => p.id === id))
      .filter(Boolean)
      .map(p => `- ${p.label}: ${p.tone}`)
      .join('\n');
    const platformInstruction = selectedPlatforms.length > 0
      ? `\nPLATFORM TARGETING:\nThis post will be published on: ${selectedPlatforms.map(id => PLATFORMS.find(p => p.id === id)?.label).filter(Boolean).join(', ')}.\nAdapt the tone and format accordingly:\n${platformTones}\nIf multiple platforms are selected, optimize for the PRIMARY platform (first listed) but keep it adaptable.`
      : '';

    if (abMode) {
      const [resultA, resultB] = await Promise.all([
        base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(strategy, rolesList, platformInstruction, strategy === 'new_roles_spotlight') }),
        base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(strategyB, rolesList, platformInstruction, strategyB === 'new_roles_spotlight') }),
      ]);
      setGeneratedContent(resultA);
      setContentB(resultB);
    } else {
      const result = await base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(strategy, rolesList, platformInstruction, strategy === 'new_roles_spotlight') });
      setGeneratedContent(result);
    }
    setIsGenerating(false);
  };

  const handleSave = (asScheduled = false) => {
    saveMutation.mutate({
      title: `${strategy.replace(/_/g, ' ')} - ${selectedRoles.slice(0, 3).join(', ') || 'All roles'}`,
      content: generatedContent,
      strategy,
      campaign_id: campaignId || undefined,
      target_roles: selectedRoles.join(', '),
      status: asScheduled && scheduledDate ? 'scheduled' : 'draft',
      scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : undefined,
      scheduled_time: scheduledDate ? scheduledTime : undefined,
    });
  };

  const handleSaveB = () => {
    saveMutationB.mutate({
      title: `${strategyB.replace(/_/g, ' ')} - ${selectedRoles.slice(0, 3).join(', ') || 'All roles'}`,
      content: contentB,
      strategy: strategyB,
      campaign_id: campaignId || undefined,
      target_roles: selectedRoles.join(', '),
      status: 'draft',
    });
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
                onClick={() => { setAbMode(m => !m); setContentB(''); }}
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

        {/* Preview */}
        <div className="lg:col-span-3 space-y-4">
          <WhereToPostChecklist selectedPlatforms={selectedPlatforms} />
          {!abMode && (
            <HashtagSuggester
              content={generatedContent}
              selectedRoles={selectedRoles}
              onInsertHashtag={(tag) => setGeneratedContent(prev => prev ? prev.trimEnd() + '\n' + tag : tag)}
            />
          )}
          {abMode ? (
            <ABComparePreview
              strategyA={strategy}
              strategyB={strategyB}
              contentA={generatedContent}
              contentB={contentB}
              isGenerating={isGenerating}
              onSaveA={() => handleSave(false)}
              onSaveB={handleSaveB}
              isSaving={saveMutation.isPending || saveMutationB.isPending}
            />
          ) : (
            <PostPreview
              content={generatedContent}
              postId={savedPostId}
              selectedPlatforms={selectedPlatforms}
              onSave={() => handleSave(false)}
              onSaveScheduled={scheduledDate ? () => handleSave(true) : null}
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              onRegenerate={handleGenerate}
              isSaving={saveMutation.isPending}
              onPublished={() => queryClient.invalidateQueries({ queryKey: ['generated-posts'] })}
            />
          )}
        </div>
      </div>
    </div>
  );
}