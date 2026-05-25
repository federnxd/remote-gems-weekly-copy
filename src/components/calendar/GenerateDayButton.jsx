import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
  'indiehackers', 'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const ALL_PLATFORMS = ['linkedin', ...NON_LINKEDIN_PLATFORMS];

// Matches autoFillWeek backend logic exactly
// DAY_STRATEGIES: job referral post strategy for each day (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_STRATEGIES = [
  'targeted_role',      // Sunday (0) - job referral
  'targeted_role',      // Monday (1) - job referral
  'storytelling',       // Tuesday (2) - job referral
  'social_proof',       // Wednesday (3) - job referral
  'urgency',            // Thursday (4) - job referral
  'carousel_text',      // Friday (5) - job referral
  'niche_community',    // Saturday (6) - job referral
];

// Thought leadership days: 1=Tue, 3=Thu, 6=Sun (backend uses dayOffset where 0=Mon)
// But frontend dayOfWeek uses 0=Sun convention, so convert:
// Backend dayOffset 1 (Tue) = frontend dayOfWeek 2
// Backend dayOffset 3 (Thu) = frontend dayOfWeek 4
// Backend dayOffset 6 (Sun) = frontend dayOfWeek 0
const THOUGHT_LEADERSHIP_DAYS = [0, 2, 4]; // Sun, Tue, Thu (frontend 0=Sun convention)

// Schedule shows what gets generated each day
const WEEKLY_SCHEDULE = [
  { dayOfWeek: 0, day: 'Sunday',    time: '11:00', type: 'both',          strategy: 'targeted_role',  label: 'Job referral + Thought leadership', platforms: ALL_PLATFORMS },
  { dayOfWeek: 1, day: 'Monday',    time: '08:00', type: 'job',           strategy: 'targeted_role',  label: 'Job referral (all roles)', platforms: ALL_PLATFORMS },
  { dayOfWeek: 2, day: 'Tuesday',   time: '11:00', type: 'both',          strategy: 'storytelling',   label: 'Job referral + Thought leadership', platforms: ALL_PLATFORMS },
  { dayOfWeek: 3, day: 'Wednesday', time: '08:00', type: 'job',           strategy: 'social_proof',   label: 'Job referral', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 4, day: 'Thursday',  time: '11:00', type: 'both',          strategy: 'urgency',        label: 'Job referral + Thought leadership', platforms: ALL_PLATFORMS },
  { dayOfWeek: 5, day: 'Friday',    time: '08:00', type: 'job',           strategy: 'carousel_text',  label: 'Job referral', platforms: NON_LINKEDIN_PLATFORMS },
  { dayOfWeek: 6, day: 'Saturday',  time: '10:00', type: 'job',           strategy: 'niche_community',label: 'Job referral', platforms: NON_LINKEDIN_PLATFORMS },
];

const strategyBadgeColor = {
  targeted_role: 'bg-primary/10 text-primary',
  social_proof: 'bg-chart-2/10 text-chart-2',
  carousel_text: 'bg-accent/10 text-accent',
  urgency: 'bg-destructive/10 text-destructive',
  storytelling: 'bg-chart-3/10 text-chart-3',
};

export default function GenerateDayButton({ date, onPostsCreated }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('preview');
  const [slots, setSlots] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const counterRef = React.useRef(null);
  const isGenerating = step === 'generating';
  const isCallingRef = React.useRef(false);

  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
  const slot = WEEKLY_SCHEDULE.find(s => s.dayOfWeek === dayOfWeek);

  const openDialog = async () => {
    if (isGenerating || !slot) return;
    setSlots([slot]);
    setStep('preview');
    setGeneratedCount(0);
    setTotalTasks(0);
    setOpen(true);
  };

  const handleGenerate = async () => {
    if (isGenerating || isCallingRef.current) return;
    isCallingRef.current = true;
    const total = slot.platforms.length;
    setTotalTasks(total);
    setDisplayCount(0);
    setStep('generating');

    // Timeout after 5 minutes
    const timeoutId = setTimeout(() => {
      clearInterval(counterRef.current);
      toast.error('Generation timed out. Please try again.');
      setStep('preview');
      isCallingRef.current = false;
    }, 300000);

    const estimatedMs = total * 3000;
    const intervalMs = 150;
    const incrementPerTick = total / (estimatedMs / intervalMs);
    let current = 0;

    counterRef.current = setInterval(() => {
      current += incrementPerTick;
      const display = Math.min(Math.floor(current), total - 1);
      setDisplayCount(display);
    }, intervalMs);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      const response = await base44.functions.invoke('autoFillDay', {
        target_date: dateStr,
      });

      clearTimeout(timeoutId);
      clearInterval(counterRef.current);
      const payload = response?.data ?? response ?? {};
      const created = payload?.totalCreated ?? 0;
      setGeneratedCount(created);
      setDisplayCount(created);
      setStep('done');
      toast.success(`${created} posts added for ${format(date, 'MMM d')}`);
      onPostsCreated?.();
    } catch (err) {
      clearTimeout(timeoutId);
      clearInterval(counterRef.current);
      toast.error('Generation failed: ' + (err?.message || err?.response?.data?.error || 'Unknown error'));
      setStep('preview');
    } finally {
      isCallingRef.current = false;
    }
  };

  if (!slot) return null; // Should not happen

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openDialog}
        disabled={isGenerating}
        className="h-6 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
      >
        <Wand2 className="w-3 h-3" />
        Generate
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (step !== 'generating') setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Generate Posts for {format(date, 'EEEE, MMM d')}
            </DialogTitle>
          </DialogHeader>

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generates posts for <strong>{slot.day}</strong> following the weekly strategy:
              </p>

              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Badge className={`text-[10px] ${strategyBadgeColor[slot.strategy] || ''}`}>
                  {slot.strategy.replace(/_/g, ' ')}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.type === 'both' ? 'Job referral + Thought leadership' : slot.type === 'thought' ? 'Thought leadership only' : 'Job referral only'} • {slot.platforms.length} platforms
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Platforms:</p>
                <div className="flex flex-wrap gap-1">
                  {slot.platforms.map((p, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground border rounded-lg p-2 bg-muted/30">
                ⚠️ This will generate <strong>{slot.platforms.length} posts</strong>. Each requires AI generation — may take a minute.
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Wand2 className="w-4 h-4" /> Generate</>}
                </Button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="space-y-6 py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div>
                  <p className="font-semibold">Generating posts for {format(date, 'MMM d')}…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please keep this window open.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold tabular-nums text-primary transition-all">
                  {displayCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  of <span className="font-semibold text-foreground">{totalTasks}</span> posts scheduled
                </div>
              </div>

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
                <p className="font-semibold">{generatedCount} posts added!</p>
                <p className="text-sm text-muted-foreground">
                  All posts pending approval before publishing.
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