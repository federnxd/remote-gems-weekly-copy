import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs on Wednesdays, Fridays, and Saturdays (scheduled automation).
 * Generates job-focused recruitment posts for all non-LinkedIn platforms.
 * - Wed: social_proof / personal story style
 * - Fri: carousel_text / list style
 * - Sat: urgency style
 * Always saves as 'scheduled' drafts — approval required before publishing.
 */

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'instagram',
  'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const PLATFORM_TONES = {
  twitter:        'Punchy, hook immediately. Max 280 characters. No fluff.',
  instagram:      'Visual-first, warm and inspiring. Use line breaks and emojis.',
  weworkremotely: 'Remote-first, flexible work focus. Emphasize async culture and global team.',
  wellfound:      'Startup-oriented, founder-to-candidate feel. Emphasize mission and impact.',
  remotive:       'Community-driven. Speak to remote work lifestyle. Tech-forward language.',
  flexjobs:       'Professional, vetted, serious tone. Emphasize legitimacy and career growth.',
  remoteok:       'Digital nomad audience. Highlight location freedom and remote-first perks.',
  reddit:         'Conversational, no-BS, community-first. Share value first, then the opportunity.',
  discord:        'Ultra-casual, direct, community-insider tone. Short messages. Use emojis.',
};

const DAY_STRATEGY = {
  3: { strategy: 'social_proof',  styleNote: 'Write as a personal story / social proof post. Share your genuine experience working at micro1 and why you\'d recommend it to others. Authentic and warm.' },
  5: { strategy: 'carousel_text', styleNote: 'Write as a list/carousel-style post. Use numbered points or clear sections to highlight key reasons to join micro1 and featured open roles. Scannable and shareable.' },
  6: { strategy: 'urgency',       styleNote: 'Write with a mild weekend urgency angle. Mention that the week is ending, now is a great time to apply, positions fill up. NOT fake panic — just a genuine nudge.' },
};

function buildPrompt(roles, platform, dayLabel, styleNote, plannerContext = '') {
  const roleList = roles.slice(0, 20).map(r => {
    let line = `- ${r.title}`;
    if (r.is_new) line += ' 🆕';
    if (r.pay_rate) line += ` (${r.pay_rate})`;
    return line;
  }).join('\n');

  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const currentYear = new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

  return `You are writing a referral post for micro1 on behalf of a professional who works there as an Audio Expert Reviewer. Write in first person, personal and credible.

PLATFORM: ${platform.toUpperCase()}
DAY: ${dayLabel}
PLATFORM TONE: ${tone}
REFERRAL LINK: ${REFERRAL_LINK}
CURRENT MONTH/YEAR: ${currentMonth} ${currentYear}

POST STYLE FOR TODAY: ${styleNote}

ROLES TO FEATURE:
${roleList}

FOLLOW THIS EXACT STRUCTURE (adapt for platform tone and today's style):

1. HEADLINE (first 2 lines — fully visible without "See more"):
   📍 ${currentMonth} - Remote Opportunities at Leading AI Company micro1 🤖
   ➡️ ${REFERRAL_LINK}

2. PERSONAL INTRO (1 short paragraph):
   - First person, mention working at micro1 since October 2025 as Audio Expert, as Reviewer since March 2026
   - Genuine and warm — mention reliable pay, flexible remote hours, supportive team

3. WHO SHOULD APPLY (1 short paragraph with 👉):
   - Professionals with solid expertise and good English
   - ~30 min interview → certification → possibility of being hired
   - Include: ( 🛑 Always check your spam folder just in case!!! 🛑 )

4. ROLES LIST:
   - "micro1 is hiring experts across many fields — here's a sample of open roles:"
   - Use the roles above, clean dash format. Mark 🆕 new ones if any.
   - End with: "...and many more!"

5. REFERRAL PERK: Once certified, you get your own referral link to earn bonuses.

6. CLOSING: Invite sharing and DMs, friendly and open.

7. HASHTAGS: 6-8 relevant hashtags

STRICT RULES:
- NO "earn money", "make money", "easy income", "extra cash", "side hustle"
- NO fake urgency or hype (urgency posts should feel like a genuine helpful reminder)
- For Twitter: max 280 characters, just hook + link
- For Reddit/Discord: sound like a real person sharing an opportunity

${plannerContext ? plannerContext + '\n\nAPPLY THE PLANNER FEEDBACK ABOVE: adjust your tone, hashtags, and angle based on what has been proven to drive referrals. Prioritize the recommended strategies and incorporate top-performing hashtags naturally.' : ''}

Generate ONLY the post content, no explanations.`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 3=Wed, 5=Fri, 6=Sat
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayLabel = DAY_NAMES[dayOfWeek];
  const scheduledDate = today.toISOString().split('T')[0];

  const strategyConfig = DAY_STRATEGY[dayOfWeek];
  if (!strategyConfig) {
    return Response.json({ message: `This function is not intended for ${dayLabel}`, skipped: true });
  }

  // Fetch all active roles
  const roles = await db.entities.OpenRole.filter({ is_active: true });
  if (!roles.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Fetch planner context to inject into prompts
  let plannerContext = '';
  let plannerPostingTimes = {};
  try {
    const plannerRes = await db.functions.invoke('getPlannerContext', {});
    if (plannerRes?.hasData) {
      plannerContext = plannerRes.context || '';
      plannerPostingTimes = plannerRes.postingTimes || {};
    }
  } catch { /* continue without planner context */ }

  const created = [];
  const errors = [];

  for (const platform of NON_LINKEDIN_PLATFORMS) {
    try {
      const content = await db.integrations.Core.InvokeLLM({
        prompt: buildPrompt(roles, platform, dayLabel, strategyConfig.styleNote, plannerContext),
      });

      // Use planner-recommended posting time if available
      const defaultTime = dayOfWeek === 6 ? '10:00' : '08:00';
      const scheduledTime = plannerPostingTimes[platform] || defaultTime;

      const post = await db.entities.GeneratedPost.create({
        title: `${dayLabel} Job Post — ${platform} — ${scheduledDate}`,
        content,
        strategy: strategyConfig.strategy,
        target_roles: roles.map(r => r.title).join(', '),
        status: 'scheduled',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        notes: `[AUTO_GENERATED] platform:${platform} type:job_post day:${dayLabel}`,
      });

      created.push({ postId: post.id, platform, scheduledDate });
    } catch (err) {
      errors.push({ platform, error: err.message });
    }
  }

  return Response.json({
    message: `${dayLabel} job posts generated for ${roles.length} active role(s)`,
    strategy: strategyConfig.strategy,
    created: created.length,
    errors,
  });
});