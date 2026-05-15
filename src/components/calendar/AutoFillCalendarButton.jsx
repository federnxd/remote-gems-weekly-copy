import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CalendarDays, CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, nextMonday, startOfWeek, getDay } from 'date-fns';
import { CEO_CONTEXT } from '@/lib/ceo-context';

// From Strategy page — the optimal weekly schedule
const WEEKLY_SCHEDULE = [
  { dayOfWeek: 1, day: 'Monday',   time: '08:00', strategy: 'targeted_role',  label: 'Targeted role post' },
  { dayOfWeek: 3, day: 'Wednesday',time: '08:00', strategy: 'social_proof',   label: 'Personal story / social proof' },
  { dayOfWeek: 5, day: 'Friday',   time: '08:00', strategy: 'carousel_text',  label: 'Carousel / list post' },
  { dayOfWeek: 6, day: 'Saturday', time: '10:00', strategy: 'urgency',        label: 'Weekend urgency post' },
];

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

function getNextWeekDates(fromDate) {
  // Get the Monday of next week (or this week if today is before Monday)
  const today = fromDate || new Date();
  const dow = getDay(today); // 0=Sun
  // Start from the Monday on or after today
  const daysUntilMonday = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  const monday = addDays(today, daysUntilMonday);
  return WEEKLY_SCHEDULE.map(slot => ({
    ...slot,
    date: addDays(monday, slot.dayOfWeek - 1),
    dateStr: format(addDays(monday, slot.dayOfWeek - 1), 'yyyy-MM-dd'),
  }));
}

async function generatePostContent(slot, activePlan, roles) {
  const rolesList = roles.length > 0 ? roles.map(r => r.title).join(', ') : 'Software Engineer, Data Scientist, AI Researcher, Product Manager';
  const weekContext = activePlan?.strategy_notes
    ? `\nWEEKLY FOCUS (from planner): ${activePlan.strategy_notes}`
    : '';

  const prompt = `${CEO_CONTEXT}

You are writing a LinkedIn referral post for a micro1 Audio Expert Reviewer. Write in first person, personal and credible.

STRATEGY: ${slot.strategy.replace(/_/g, ' ')}
DAY/TIME: ${slot.day} at ${slot.time} (peak engagement window)
REFERRAL LINK: ${REFERRAL_LINK}
TARGET ROLES: ${rolesList}${weekContext}

SIGNATURE STRUCTURE — FOLLOW THIS FORMAT EXACTLY:

1. HEADLINE (first 2 lines — CRITICAL: must be fully visible without "See more"):
   📍 [Month] - Remote Opportunities at Leading AI Company micro1 🤖
   ➡️ [REFERRAL LINK]

2. PERSONAL INTRO (1 short paragraph): first person, mention working at micro1 since October 2025 as Audio Expert, and as Reviewer since March 2026. Genuine, warm, credible.

3. WHO SHOULD APPLY: professionals with solid expertise and good English. Mention ~30 min interview → certification → hired. Include: 🛑 Always check your spam folder just in case!!! 🛑

4. ROLES LIST: "micro1 is hiring experts across many fields — here's a sample relevant to this post:" then list the TARGET ROLES with dashes. End with "...and many more!"

5. REFERRAL PERK: once certified, you get your own referral link to earn bonuses.

6. CLOSING: invite sharing and DMs. Friendly and open.

7. HASHTAGS: 6-8 relevant professional hashtags

TONE: NO "earn money", "easy income", "side hustle". Write as a real trustworthy professional.
Generate ONLY the post content, no explanations.`;

  return base44.integrations.Core.InvokeLLM({ prompt });
}

export default function AutoFillCalendarButton({ currentMonth, onPostsCreated }) {
  const { data: roles = [] } = useQuery({
    queryKey: ['open-roles-active'],
    queryFn: () => base44.entities.OpenRole.filter({ is_active: true }),
  });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('preview'); // preview | generating | done
  const [slots, setSlots] = useState([]);
  const [generatedPosts, setGeneratedPosts] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [progress, setProgress] = useState(0);

  const openDialog = async () => {
    // Fetch active weekly plan
    const plans = await base44.entities.WeeklyPlan.filter({ status: 'active' });
    setActivePlan(plans[0] || null);

    // Calculate dates for next week starting from current month view
    const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const today = new Date();
    const fromDate = firstOfMonth > today ? firstOfMonth : today;
    const nextSlots = getNextWeekDates(fromDate);
    setSlots(nextSlots);
    setStep('preview');
    setGeneratedPosts([]);
    setProgress(0);
    setOpen(true);
  };

  const handleGenerate = async () => {
    setStep('generating');
    setProgress(0);
    const results = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const content = await generatePostContent(slot, activePlan, roles);
      results.push({ slot, content });
      setProgress(i + 1);
    }

    // Bulk save to DB
    const saved = [];
    for (const { slot, content } of results) {
      const post = await base44.entities.GeneratedPost.create({
        title: `${slot.label} — ${format(slot.date, 'MMM d')}`,
        content,
        strategy: slot.strategy,
        status: 'scheduled',
        scheduled_date: slot.dateStr,
        scheduled_time: slot.time,
      });
      saved.push(post);
    }

    setGeneratedPosts(saved);
    setStep('done');
    toast.success(`${saved.length} posts added to your calendar!`);
    onPostsCreated?.();
  };

  const strategyBadgeColor = {
    targeted_role: 'bg-primary/10 text-primary',
    social_proof: 'bg-chart-2/10 text-chart-2',
    carousel_text: 'bg-accent/10 text-accent',
    urgency: 'bg-destructive/10 text-destructive',
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog} className="gap-2">
        <Wand2 className="w-4 h-4" />
        Auto-fill Week
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (step !== 'generating') setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Auto-fill Calendar
            </DialogTitle>
          </DialogHeader>

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will generate <strong>{slots.length} posts</strong> following your Strategy Plan's optimal schedule, scheduled for the next available week.
              </p>

              {activePlan && (
                <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 text-xs">
                  <p className="font-semibold text-primary mb-0.5">Using active plan: {activePlan.week_label}</p>
                  {activePlan.strategy_notes && (
                    <p className="text-muted-foreground line-clamp-2">{activePlan.strategy_notes}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{slot.day}, {format(slot.date, 'MMM d')}</p>
                      <p className="text-xs text-muted-foreground">{slot.time} · {slot.label}</p>
                    </div>
                    <Badge className={`text-[10px] ${strategyBadgeColor[slot.strategy] || ''}`}>
                      {slot.strategy.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleGenerate}>
                  <Wand2 className="w-4 h-4" /> Generate Posts
                </Button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="space-y-5 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="font-semibold">Generating your posts…</p>
                <p className="text-sm text-muted-foreground">{progress} of {slots.length} complete</p>
              </div>
              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded-lg transition-colors ${i < progress ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {i < progress
                      ? <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      : i === progress
                        ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                    }
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
                <p className="font-semibold">{generatedPosts.length} posts added to your calendar!</p>
                <p className="text-sm text-muted-foreground">They're now scheduled and visible on the calendar. You can edit, reschedule, or publish them any time.</p>
              </div>
              <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}