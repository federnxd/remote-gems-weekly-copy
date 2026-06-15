import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
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

function getWeekSlotDates(fromDate) {
  const monday = startOfWeek(fromDate || new Date(), { weekStartsOn: 1 });
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
  const isLinkedIn = platform === 'linkedin';
  const isLinkedInPersonalStory = isLinkedIn && slot.strategy === 'social_proof';

  // Use fixed monthly header only for the first post of the month (Monday of first week, day 1–7)
  const isFirstWeekOfMonth = slot.date && slot.date.getDate() <= 7 && slot.dayOfWeek === 1;
  const fixedMonthlyHeader = `📍 ${currentMonth} - Remote Opportunities at Leading AI Companies 🤖\n➡️ ${REFERRAL_LINK}`;

  const headlineSection = isFirstWeekOfMonth
    ? `1. HEADLINE (first 2 lines — use this EXACT header, do not change it):
   ${fixedMonthlyHeader}`
    : `1. HEADLINE (first 1–2 lines — must be unique, creative, and human):
HEADLINE EXAMPLES (pick ONE creative variation — never repeat the same formula):
${isLinkedIn ? `- "Been exploring remote AI work lately — here's what I found 👇"
- "Leading AI labs are quietly building something big — and they need experts like you"
- "Real remote roles. Real pay. No gimmicks. Top AI companies are hiring across 30+ fields."
- "A friend asked me last week: 'Are these AI expert roles legit?' — here's the honest answer."
- "What does it actually take to get an AI expert role? A short interview + your expertise."` : `- "Been looking at remote AI jobs lately — here's what I found 👇"
- "If you're a specialist looking for legit remote work, this might be for you 🌍"
- "Leading AI companies are quietly hiring across 30+ fields — here's the list"
- "Tired of vague job listings? Here are actual open roles with actual pay rates."
- "Not another generic job post — these are verified, paid, remote expert roles."
- "Remote + specialized + well-paid — a combo most platforms can't offer. But this one can."
- "Sharing this because I wish someone had told me about this sooner:"`}
Pick something fresh and fitting for the PLATFORM TONE and STRATEGY. Make the first line grab attention naturally.
   ALWAYS add the referral link on its own line right after: ➡️ ${REFERRAL_LINK}`;

  const rolesIntro = 'Leading AI companies are hiring experts across many fields — here\'s a sample of open roles:';

  const personalStorySection = `
2. BRIEF CONTEXT (1–2 sentences):
   - Do NOT mention any specific company name
   - Briefly frame the opportunity: remote expert roles at leading AI companies, global hiring, growing field
   - Keep it natural, not promotional`;

  return `You are writing a referral recruitment post. Write in first person, credible and genuine.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
STRATEGY: ${slot.strategy.replace(/_/g, ' ')}
REFERRAL LINK: ${REFERRAL_LINK}
CURRENT MONTH/YEAR: ${currentMonth} ${currentYear}

ROLES TO FEATURE:
${roleList}

FOLLOW THIS STRUCTURE:

${headlineSection}
${personalStorySection}

3. WHO SHOULD APPLY (1 short paragraph with 👉):
   - Professionals with solid expertise and good English
   - ~30 min interview → certification → possibility of being hired
   - Include: ( 🛑 Always check your spam folder just in case!!! 🛑 )

4. ROLES LIST:
   - "${rolesIntro}"
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
- CRITICAL: Do NOT mention "micro1" or any specific company name anywhere in the post. Refer only to "leading AI companies" or "top AI labs".

Generate ONLY the post content, no explanations.`;
}

function buildThoughtLeadershipPrompt(platform, topicIndex) {
  const topic = THOUGHT_LEADERSHIP_TOPICS[topicIndex % THOUGHT_LEADERSHIP_TOPICS.length];
  const tone = PLATFORM_TONES[platform] || 'Informative, engaging.';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return `You are writing a thought leadership post for ${platform.toUpperCase()} on behalf of a professional working in the AI industry. Write in first person — personal, credible, genuine. This is NOT a job ad.

TODAY: ${currentDate}
PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
TOPIC: ${topic.theme}
ANGLE: ${topic.angle}

INSTRUCTIONS:
- Write an educational/informative post about the topic
- Use real, plausible data from 2024-2025 (cite WEF, McKinsey, LinkedIn, OECD naturally)
- Connect to your personal experience working remotely in AI
- Do NOT mention job openings, referral links, or any specific company name
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
  const [totalTasks, setTotalTasks] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date());
  const isGenerating = step === 'generating';
  const isCallingRef = React.useRef(false);

  const updateWeek = (fromDate) => {
    const nextSlots = getWeekSlotDates(fromDate);
    setSlots(nextSlots);
  };

  const openDialog = async () => {
    if (isGenerating) return;
    const today = new Date();
    setSelectedWeekDate(today);
    updateWeek(today);
    setStep('preview');
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
    if (isGenerating || isCallingRef.current) return;
    isCallingRef.current = true;
    // We now generate one DAY per request (7 sequential requests) so no single
    // request risks the platform timeout. Progress is real, not animated.
    setTotalTasks(7);
    setDisplayCount(0);
    setStep('generating');

    const monday = startOfWeek(selectedWeekDate, { weekStartsOn: 1 });

    let totalCreated = 0;
    let daysDone = 0;
    const dayErrors = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(monday, i);
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      try {
        const response = await base44.functions.invoke('autoFillDay', {
          target_date: dateStr,
        });
        const payload = response?.data ?? response ?? {};
        totalCreated += payload?.totalCreated ?? 0;
      } catch (err) {
        // One day failing should not abort the whole week — record and continue.
        dayErrors.push(`${format(dayDate, 'EEE')}: ${err?.message || err?.response?.data?.error || 'failed'}`);
      }
      daysDone++;
      setDisplayCount(daysDone);
      setGeneratedCount(totalCreated);
      // Let the calendar reflect each day's posts as they land.
      onPostsCreated?.();
    }

    setStep('done');
    if (dayErrors.length === 0) {
      toast.success(`${totalCreated} posts added to your calendar!`);
    } else if (totalCreated > 0) {
      toast.success(`${totalCreated} posts added. ${dayErrors.length} day(s) had issues — you can retry those days individually.`);
    } else {
      toast.error('Generation failed for all days. Please try again.');
      setStep('preview');
    }
    isCallingRef.current = false;
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog} disabled={isGenerating} className="gap-2">
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
                <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Wand2 className="w-4 h-4" /> Generate All</>}
                </Button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="space-y-6 py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div>
                  <p className="font-semibold">Generating your posts…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please keep this window open while all platforms are filled.
                  </p>
                </div>
              </div>

              {/* Live counter */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold tabular-nums text-primary transition-all">
                  {displayCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  day <span className="font-semibold text-foreground">{displayCount}</span> of <span className="font-semibold text-foreground">{totalTasks}</span>
                  {generatedCount > 0 && <> · {generatedCount} posts so far</>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-100"
                  style={{ width: `${totalTasks > 0 ? (displayCount / totalTasks) * 100 : 0}%` }}
                />
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