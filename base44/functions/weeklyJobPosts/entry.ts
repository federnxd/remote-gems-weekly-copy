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
  3: { strategy: 'social_proof',  styleNote: 'Social proof angle: write as someone who has seen peers successfully land remote AI roles. Reference real outcomes (certifications, getting hired, flexible income) without naming any company. Warm and genuine — feels like a trusted recommendation from a colleague, not an ad.' },
  5: { strategy: 'carousel_text', styleNote: 'List/carousel style: scannable, numbered or bulleted format. Each point delivers standalone value. Could be "X things to know before applying for remote AI roles" or "What makes a strong candidate for these positions" — then feature the roles naturally. End with a clear CTA.' },
  6: { strategy: 'urgency',       styleNote: 'Weekend angle: some roles are filling up, end of week is a natural checkpoint. Tone is a genuine helpful nudge — "if you\'ve been considering this, now\'s a good time." NOT manufactured panic.' },
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

  const platformRules = platform === 'twitter'
    ? 'TWITTER: Max 280 characters total. One punchy hook + referral link. Nothing else.'
    : platform === 'mastodon'
    ? 'MASTODON: Max 500 chars. End with hashtags for discoverability.'
    : platform === 'bluesky'
    ? 'BLUESKY: Max 300 chars. Authentic, no corporate feel.'
    : platform === 'reddit'
    ? 'REDDIT: Open with a real observation or question, not a pitch. Community-first. No hashtags. Sound like a member, not a marketer.'
    : platform === 'discord'
    ? 'DISCORD: Short, casual, conversational. Start with a reaction or quick thought. Emojis. Feel like a real person in a chat.'
    : '';

  return `You are writing a ${dayLabel} social media post on behalf of a remote professional sharing a job opportunity. Write in first person. Sound fully human — not a bot, not a recruiter.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
STRATEGY FOR TODAY: ${styleNote}
REFERRAL LINK (embed once, naturally): ${REFERRAL_LINK}
MONTH/YEAR: ${currentMonth} ${currentYear}

ROLES AVAILABLE (pick 3–6 to feature, don't dump the full list):
${roleList}

WHAT TO WRITE:
- Open with a hook that matches today's strategy. Make it feel fresh — NEVER use a template opener like "📍 [Month] - Remote Opportunities".
- Apply the strategy throughout — the strategy is the soul of the post, not a decoration.
- Weave in 3–6 roles naturally. Not just a dumped list.
- Include once: referral link, 🛑 spam folder warning, referral bonus perk (if it fits naturally).
- End with a real CTA or open question (except Twitter).
- 5–8 hashtags at the end (except Reddit/Discord).

ABSOLUTE RULES:
- NEVER mention "micro1" or any company name. Say "top AI companies", "leading AI labs", "AI-driven platforms", etc.
- NEVER use the same opening formula twice. Every post must feel genuinely different.
- NO personal story about working at micro1 — that's LinkedIn only.
- NO "earn money", "make money", "easy income", "side hustle".
- NO fake urgency or hype.
${platformRules}

Generate ONLY the post content. No labels, no "Post:" prefix, no explanations.
${plannerContext ? '\n\nINTERNAL STRATEGY GUIDANCE (never surface in post):\n' + plannerContext : ''}`;
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