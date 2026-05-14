import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StrategySelector from '@/components/generator/StrategySelector';
import HashtagSuggester from '@/components/generator/HashtagSuggester';
import RoleSelector from '@/components/generator/RoleSelector';
import SegmentSelector, { SEGMENTS } from '@/components/generator/SegmentSelector';
import PostPreview from '@/components/generator/PostPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function PostGenerator() {
  const [strategy, setStrategy] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [activeSegments, setActiveSegments] = useState([]);
  const [referralLink, setReferralLink] = useState('https://lnkd.in/gZXXSdt4');
  const [personalNote, setPersonalNote] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [campaignId, setCampaignId] = useState('');
  const [savedPostId, setSavedPostId] = useState(null);
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

  const handleGenerate = async () => {
    if (!strategy) {
      toast.error('Please select a post strategy');
      return;
    }

    setIsGenerating(true);
    const rolesList = selectedRoles.length > 0 ? selectedRoles : roles.map(r => r.title);
    
    const prompt = `You are an expert LinkedIn content strategist specializing in referral recruitment. Generate a high-converting LinkedIn post for micro1 (an AI training and development company) that maximizes referral sign-ups.

STRATEGY: ${strategy.replace(/_/g, ' ')}
REFERRAL LINK: ${referralLink}
TARGET ROLES: ${rolesList.join(', ')}
${personalNote ? `PERSONAL NOTE TO INCLUDE: ${personalNote}` : ''}

CRITICAL OPTIMIZATION RULES (based on data analysis):
- The post reached 390,000 impressions but only 100 referrals, 20 interviews, 10 met criteria, 9 certified, 1 hired.
- We need to 10x the referral-to-hired conversion. The benchmark is 367 hired/month by top performers.
- KEY PROBLEMS TO SOLVE:
  1. Most people scroll past → Need a POWERFUL hook in the first 2 lines
  2. Too general → Each post should target 1-3 specific roles maximum for targeted engagement
  3. No clear CTA → Need ONE clear, specific call-to-action
  4. No urgency → Add scarcity/urgency elements
  5. No social proof specifics → Include concrete numbers/results
  6. The post is too long → Keep it concise and scannable

FORMAT RULES:
- Start with an ATTENTION-GRABBING hook (question, bold claim, or surprising stat)
- Use emojis strategically (not excessively)
- Break text into short, scannable paragraphs
- Include the referral link naturally
- End with 5-8 highly relevant hashtags
- Keep under 1,500 characters for better engagement
- For "targeted_role" strategy: Focus on ONLY the selected roles, speak their language
- For "storytelling": Share a genuine personal experience that resonates
- For "urgency": Create FOMO with specific deadlines or limited spots
- For "social_proof": Highlight specific achievements, pay, flexibility
- For "niche_community": Use industry-specific language and references
- For "carousel_text": Create a structured, shareable list format

TONE: Professional but approachable. Authentic, not salesy. Like a friend sharing a great opportunity.

Generate ONLY the post content, no explanations.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setGeneratedContent(result);
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
            <Label className="text-sm font-semibold mb-3 block">1. Choose Strategy</Label>
            <StrategySelector selected={strategy} onSelect={setStrategy} />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-3 block">
              2. Target Audience
              <span className="font-normal text-muted-foreground ml-1">(optional — targets all if empty)</span>
            </Label>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">By Segment</p>
                <SegmentSelector activeSegments={activeSegments} onToggleSegment={toggleSegment} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                  Individual Roles
                  {selectedRoles.length > 0 && <span className="ml-1 text-primary">({selectedRoles.length} selected)</span>}
                </p>
                <RoleSelector roles={roles} selectedRoles={selectedRoles} onToggle={toggleRole} />
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

          {/* Schedule Picker */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              5. Schedule <span className="font-normal text-muted-foreground">(optional)</span>
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
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Post
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3 space-y-4">
          <HashtagSuggester
            content={generatedContent}
            selectedRoles={selectedRoles}
            onInsertHashtag={(tag) => setGeneratedContent(prev => prev ? prev.trimEnd() + '\n' + tag : tag)}
          />
          <PostPreview
            content={generatedContent}
            postId={savedPostId}
            onSave={() => handleSave(false)}
            onSaveScheduled={scheduledDate ? () => handleSave(true) : null}
            scheduledDate={scheduledDate}
            scheduledTime={scheduledTime}
            onRegenerate={handleGenerate}
            isSaving={saveMutation.isPending}
            onPublished={() => queryClient.invalidateQueries({ queryKey: ['generated-posts'] })}
          />
        </div>
      </div>
    </div>
  );
}