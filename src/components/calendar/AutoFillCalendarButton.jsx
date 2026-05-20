import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, getDay, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
  'indiehackers', 'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const ALL_PLATFORMS = ['linkedin', ...NON_LINKEDIN_PLATFORMS];

// Full weekly strategy
// Mon: All-roles job post — ALL platforms (LinkedIn + non-LinkedIn)
// Tue: Thought leadership — non-LinkedIn
// Wed: Social proof / personal story job post — non-LinkedIn
// Thu: Thought leadership — non-LinkedIn
// Fri: Carousel/list job post — non-LinkedIn
// Sat: Urgency job post — non-LinkedIn
// Sun: Thought leadership — non-LinkedIn

const WEEKLY_SCHEDULE = [
  { dayOfWeek: 1, day: 'Monday',    time: '08:00', type: 'job',           strategy: 'targeted_role',  label: 'All roles post (LinkedIn + all platforms)', platforms: ALL_PLATFORMS },
  { dayOfWeek: 2, day: 'Tuesday',   time: '11:00', type: 'thought',       strategy: 'storytelling',   label: 'Thought leadership (AI/Remote)', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 3, day: 'Wednesday', time: '08:00', type: 'job',           strategy: 'social_proof',   label: 'Social proof / personal story', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 4, day: 'Thursday',  time: '11:00', type: 'thought',       strategy: 'storytelling',   label: 'Thought leadership (AI/Remote)', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 5, day: 'Friday',    time: '08:00', type: 'job',           strategy: 'carousel_text',  label: 'Carousel / list job post', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 6, day: 'Saturday',  time: '10:00', type: 'job',           strategy: 'urgency',        label: 'Weekend urgency post', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 0, day: 'Sunday',    time: '11:00', type: 'thought',       strategy: 'storytelling',   label: 'Thought leadership (AI/Remote)', platforms: NON_LINKEDIN_PLATFORMS },
];

const THOUGHT_LEADERSHIP_TOPICS = [
  { theme: 'AI job displacement vs. job creation', angle: 'Use current data (2024-2025 reports from WEF, McKinsey, OECD) showing that while AI automates tasks, it also creates new roles.' },
  { theme: 'The rise of remote AI-assisted work', angle: 'Real stats on remote work adoption post-2023, how AI tools are integrated into remote workflows.' },
  { theme: 'Human-in-the-loop AI training as a real profession', angle: 'Explain RLHF, the growing demand for domain experts to review AI outputs, and why this is a legitimate growing field.' },
  { theme: 'Remote work in 2025: state of the market', angle: 'How many companies still hire remote, which industries are most remote-friendly, average salaries globally.' },
  { theme: 'AI literacy as the most in-demand skill', angle: 'Data from LinkedIn, Indeed, WEF showing AI-related skills are the fastest growing and what companies pay for them.' },
  { theme: 'The gig economy meets AI: new opportunity landscape', angle: 'How platforms use AI to match gig workers with projects. Data on freelance market growth and AI-adjacent roles.' },
  { theme: 'Robots, AI agents, and the human experts behind them', angle: 'How autonomous AI still requires vast human expert data. What this means for employment in specialized fields.' },
];

const PLATFORM_TONES = {
  linkedin: 'Professional, insightful, story-driven. Use industry language. 3,000 char limit.',
  twitter: 'Punchy, hook immediately. Max 280 characters. No fluff.',
  facebook: 'Friendly, community-focused, conversational. Use emojis, keep it engaging and shareable.',
  instagram: 'Visual-first, warm and inspiring. Use line breaks and emojis for readability.',
  mastodon: 'Open, community-driven, no-algorithm feed. Authentic and conversational. Use hashtags for discoverability. Max 500 chars.',
  bluesky: 'Conversational, authentic, tech-savvy. Max 300 chars. Community-first tone, no corporate speak.',
  threads: 'Casual, conversational, Instagram-like. Friendly and approachable. Use emojis naturally.',
  indiehackers: 'Founder-friendly, builder community. Emphasize mission, equity, growth potential, and bootstrapped culture.',
  weworkremotely: 'Remote-first, flexible work focus. Emphasize async culture and global team.',
  wellfound: 'Startup-oriented, founder-to-candidate feel. Emphasize mission and impact.',
  remotive: 'Community-driven. Speak to remote work lifestyle. Tech-forward language.',
  flexjobs: 'Professional, vetted, serious tone. Emphasize legitimacy and career growth.',
  remoteok: 'Digital nomad audience. Highlight location freedom and remote-first perks.',
  reddit: 'Conversational, no-BS, community-first. Share value first, then the opportunity.',
  discord: 'Ultra-casual, direct, community-insider tone. Short messages. Use emojis.',
};

function getMonday(fromDate) {
  const today = fromDate || new Date();
  const dow = getDay(today);
  const daysUntilMonday = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  return addDays(today, daysUntilMonday);
}

function getWeekSlotDates(fromDate) {
  const monday = getMonday(fromDate);
  return WEEKLY_SCHEDULE.map(slot => {
    const dayOffset = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1; // Sun = day 6 of week
    const date = addDays(monday, dayOffset);
    return {
      ...slot,
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
    };
  });
}

async function buildJobPostPrompt(slot, roles, platform) {
  const roleList = roles.map(r => `- ${r.title}${r.pay_rate ? ` (${r.pay_rate})` : ''}`).join('\n');
  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const isLinkedInPersonalStory = platform === 'linkedin' && slot.strategy === 'social_proof';

  const headlineExamples = `
HEADLINE EXAMPLES (pick ONE creative variation — never repeat the same formula):
- "Been exploring remote AI work lately — here's what I found at micro1 👇"
- "If you're a specialist looking for legit remote work, this might be for you 🌍"
- "micro1 is quietly building something big — and they need experts like you"
- "Real remote roles. Real pay. No gimmicks. micro1 is hiring across 30+ fields."
- "Tired of vague job listings? Here are actual open roles with actual pay rates."
- "A friend asked me last week: 'Is micro1 legit?' — here's the honest answer."
- "Not another generic job post — these are verified, paid, remote expert roles."
- "What does it actually take to work with micro1? A short interview + your expertise."
- "Remote + specialized + well-paid — the trifecta most platforms can't offer. micro1 can."
- "Sharing this because I wish someone had told me about this sooner:"
Pick something fresh and fitting for the PLATFORM TONE and STRATEGY. Make the first line grab attention naturally.`;

  const personalStorySection = isLinkedInPersonalStory ? `
2. PERSONAL INTRO (1 short paragraph):
   - First person, mention working at micro1 since October 2025 as Audio Expert, as Reviewer since March 2026
   - Genuine and warm — mention reliable pay, flexible remote hours, supportive team` : `
2. BRIEF CONTEXT (1–2 sentences):
   - Do NOT mention your personal job role or story
   - Briefly frame WHY micro1 is worth paying attention to (e.g. AI company, global remote hiring, growing platform)
   - Keep it natural, not promotional`;

  return `You are writing a referral post for micro1. Write in first person, credible and genuine.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
STRATEGY: ${slot.strategy.replace(/_/g, ' ')}
REFERRAL LINK: ${REFERRAL_LINK}
CURRENT MONTH/YEAR: ${currentMonth} ${currentYear}

ROLES TO FEATURE:
${roleList}

FOLLOW THIS STRUCTURE:

1. HEADLINE (first 1–2 lines — must be unique, creative, and human):
${headlineExamples}
   ALWAYS add the referral link on its own line right after: ➡️ ${REFERRAL_LINK}
${personalStorySection}

3. WHO SHOULD APPLY (1 short paragraph with 👉):
   - Professionals with solid expertise and good English
   - ~30 min interview → certification → possibility of being hired
   - Include: ( 🛑 Always check your spam folder just in case!!! 🛑 )

4. ROLES LIST:
   - "micro1 is hiring experts across many fields — here's a sample of open roles:"
   - Use the roles listed above, clean dash bullet format
   - End with: "...and many more!"

5. REFERRAL PERK: Once certified, you get your own referral link to earn bonuses.

6. CLOSING: Invite sharing and DMs, friendly and open.

7. HASHTAGS: 6-8 relevant hashtags

STRICT RULES:
- NO "earn money", "make money", "easy income", "extra cash", "side hustle"
- NO fake urgency or hype
- NO fixed/template headlines — every post must open differently
- For Twitter: keep under 280 characters, just hook + link
- For Reddit/Discord: sound like a real person sharing an opportunity
- Personal story (working at micro1 as Audio Expert/Reviewer) is ONLY allowed on LinkedIn social_proof posts

Generate ONLY the post content, no explanations.`;
}

function buildThoughtLeadershipPrompt(platform, topicIndex) {
  const topic = THOUGHT_LEADERSHIP_TOPICS[topicIndex % THOUGHT_LEADERSHIP_TOPICS.length];
  const tone = PLATFORM_TONES[platform] || 'Informative, engaging.';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return `You are writing a thought leadership post for ${platform.toUpperCase()} on behalf of a professional working at micro1 as an Audio Expert Reviewer. Write in first person — personal, credible, genuine. This is NOT a job ad.

TODAY: ${currentDate}
PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
TOPIC: ${topic.theme}
ANGLE: ${topic.angle}

INSTRUCTIONS:
- Write an educational/informative post about the topic
- Use real, plausible data from 2024-2025 (cite WEF, McKinsey, LinkedIn, OECD naturally)
- Connect to your personal experience working remotely in AI
- Do NOT mention job openings, referral links, or micro1 hiring
- End with an open question or discussion invite (except Twitter: hashtags instead)
- Twitter: max 280 chars, one punchy stat, 2 hashtags max
- Reddit: conversational, curious, invite genuine discussion
- Discord: super short, casual, start a convo

STRICT: No job posts, no referral links, no fake urgency.
Generate ONLY the post content. No explanations.`;
}

const strategyBadgeColor = {
  targeted_role: 'bg-primary/10 text-primary',
  social_proof: 'bg-chart-2/10 text-chart-2',
  carousel_text: 'bg-accent/10 text-accent',
  urgency: 'bg-destructive/10 text-destructive',
  storytelling: 'bg-chart-3/10 text-chart-3',
};

export default function AutoFillCalendarButton({ currentMonth, onPostsCreated }) {
  const { data: roles = [] } = useQuery({
    queryKey: ['open-roles-active'],
    queryFn: () => base44.entities.OpenRole.filter({ is_active: true }),
  });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('preview');
  const [slots, setSlots] = useState([]);
  const [progress, setProgress] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date());

  const updateWeek = (fromDate) => {
    const nextSlots = getWeekSlotDates(fromDate);
    setSlots(nextSlots);
  };

  const openDialog = async () => {
    const today = new Date();
    setSelectedWeekDate(today);
    updateWeek(today);
    setStep('preview');
    setProgress(0);
    setGeneratedCount(0);
    setTotalTasks(0);
    setOpen(true);
  };

  const handleWeekChange = (direction) => {
    const newDate = direction === 'prev' ? subWeeks(selectedWeekDate, 1) : addWeeks(selectedWeekDate, 1);
    setSelectedWeekDate(newDate);
    updateWeek(newDate);
  };

  const handleGenerate = async () => {
    setStep('generating');
    setProgress(0);

    // Count total posts to generate (one per platform per slot)
    const total = slots.reduce((sum, slot) => sum + slot.platforms.length, 0);
    setTotalTasks(total);

    let done = 0;
    let created = 0;
    const topicIndex = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
      const slot = slots[slotIdx];

      for (let pIdx = 0; pIdx < slot.platforms.length; pIdx++) {
        const platform = slot.platforms[pIdx];

        // Small delay between calls to avoid rate limiting
        if (done > 0) await sleep(800);

        let content;
        if (slot.type === 'thought') {
          content = await base44.integrations.Core.InvokeLLM({
            prompt: buildThoughtLeadershipPrompt(platform, topicIndex + slotIdx),
            add_context_from_internet: true,
            model: 'gemini_3_flash',
          });
        } else {
          const prompt = await buildJobPostPrompt(slot, roles, platform);
          content = await base44.integrations.Core.InvokeLLM({ prompt });
        }

        await base44.entities.GeneratedPost.create({
          title: `${slot.label} — ${platform} — ${format(slot.date, 'MMM d')}`,
          content,
          strategy: slot.strategy,
          status: 'scheduled',
          scheduled_date: slot.dateStr,
          scheduled_time: slot.time,
          target_roles: slot.type === 'job' ? roles.map(r => r.title).join(', ') : 'general audience',
          notes: `[AUTO_GENERATED] platform:${platform} type:${slot.type}`,
        });

        done++;
        created++;
        setProgress(done);
        setGeneratedCount(created);
      }
    }

    setStep('done');
    toast.success(`${created} posts added to your calendar!`);
    onPostsCreated?.();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog} className="gap-2">
        <Wand2 className="w-4 h-4" />
        Auto-fill Week
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (step !== 'generating') setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Auto-fill Full Week
            </DialogTitle>
          </DialogHeader>

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generates posts for the <strong>full week</strong> following the strategy plan — job posts on Mon/Wed/Fri/Sat, thought leadership on Tue/Thu/Sun, across all platforms.
              </p>

              {/* Week selector */}
              <div className="flex items-center justify-center gap-3 py-1 border rounded-lg bg-muted/30">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleWeekChange('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold w-48 text-center">
                  {format(startOfWeek(selectedWeekDate, { weekStartsOn: 1 }), 'MMM d')} – {format(endOfWeek(selectedWeekDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleWeekChange('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{slot.day}, {format(slot.date, 'MMM d')} · {slot.time}</p>
                      <p className="text-xs text-muted-foreground">{slot.label} · {slot.platforms.length} platforms</p>
                    </div>
                    <Badge className={`text-[10px] ${strategyBadgeColor[slot.strategy] || ''}`}>
                      {slot.type === 'thought' ? 'thought leader' : slot.strategy.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground border rounded-lg p-2 bg-muted/30">
                ⚠️ This will generate ~<strong>{slots.reduce((s, sl) => s + sl.platforms.length, 0)} posts</strong> total. Each requires AI generation — this may take a few minutes.
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleGenerate}>
                  <Wand2 className="w-4 h-4" /> Generate All
                </Button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="space-y-5 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="font-semibold">Generating your posts…</p>
                <p className="text-sm text-muted-foreground">{progress} of {totalTasks} complete</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: totalTasks > 0 ? `${(progress / totalTasks) * 100}%` : '0%' }}
                />
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted shrink-0" />
                    {slot.day} — {slot.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                </div>
                <p className="font-semibold">{generatedCount} posts added to your calendar!</p>
                <p className="text-sm text-muted-foreground">
                  Full week scheduled: job posts + thought leadership across all platforms. All pending approval before publishing.
                </p>
              </div>
              <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}