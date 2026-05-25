import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STRATEGY_PLAYBOOK = {
  social_proof: {
    label: 'Social Proof',
    goal: 'Show real outcomes — certifications, hires, real people who made it. Build credibility through results, not promises.',
    hook_examples: [
      'Over 300 professionals got certified through this program this year alone.',
      'The people who get hired here aren\'t lucky — they\'re prepared. Here\'s the actual process.',
      'AI labs are hiring across 40+ fields right now. The demand is real and I\'ve seen it firsthand.',
    ],
    structure: 'Proof hook (stat, outcome, observation) → Why this works / what makes people succeed → Who qualifies → Process (30 min interview → cert → hire) → Roles (3–5) → Referral link → 🛑 spam → CTA',
    tone: 'Confident but grounded. Facts over hype.',
  },
  carousel_text: {
    label: 'Carousel / List',
    goal: 'Scannable, numbered or bulleted. Each point delivers value on its own. Made for people scrolling fast.',
    hook_examples: [
      '5 things I wish I knew before applying to remote AI training roles:',
      'What makes a strong candidate for AI expert roles (from someone who\'s reviewed hundreds):',
      '3 reasons why domain experts are the most in-demand people in AI right now:',
    ],
    structure: 'List hook → 3–7 numbered/bulleted points (each standalone value) → Pivot to open roles → Referral link → 🛑 spam → CTA',
    tone: 'Clear, concise, educational. Think "save this post."',
  },
  urgency: {
    label: 'Weekend Urgency',
    goal: 'Genuine helpful nudge — NOT fake panic. Weekend momentum, roles filling, it\'s a good time.',
    hook_examples: [
      'If applying for something this weekend has been on your mind — this might be the one.',
      'Some of these roles (marked 🔥) have multiple openings filling fast. Not panic — just honest.',
      'It\'s Saturday. Prime time to do the one thing you said you\'d do this week.',
    ],
    structure: 'Gentle urgency hook → Why now makes sense (specific, real reason) → 🔥 high-demand roles called out → Process reminder → Referral link → 🛑 spam → CTA',
    tone: 'Friendly nudge. Never manufactured. Never "LAST CHANCE!!!"',
  },
};

const BRAND_CONTEXT = `
BRAND PHILOSOPHY (LinkedIn only — use to add depth):
- AI training is fundamentally reshaping the economy — it's an entirely new labor sector.
- For AI models to become smarter, they need humans to add context and meaning to what they learn.
- The more advanced AI becomes, the MORE it needs exceptional human experts.
- This is human empowerment, not job displacement — a new economy where expertise becomes the world's most valuable commodity.
`;

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
  3: { strategy: 'social_proof' },
  5: { strategy: 'carousel_text' },
  6: { strategy: 'urgency' },
};

function buildPrompt(roles, platform, dayLabel, strategy, plannerContext = '') {
  const roleList = roles.slice(0, 20).map(r => {
    let line = `- ${r.title}`;
    if (r.is_new) line += ' 🆕';
    if (r.is_high_demand) line += ' 🔥';
    if (r.pay_rate) line += ` (${r.pay_rate})`;
    return line;
  }).join('\n');

  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const currentYear = new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
  const isLinkedIn = platform === 'linkedin';

  const play = STRATEGY_PLAYBOOK[strategy] || STRATEGY_PLAYBOOK['social_proof'];

  const platformRules = platform === 'twitter'
    ? 'TWITTER CONSTRAINT: Max 280 characters total. One punchy hook + referral link only.'
    : platform === 'mastodon'
    ? 'MASTODON CONSTRAINT: Max 500 chars. Hashtags at end.'
    : platform === 'bluesky'
    ? 'BLUESKY CONSTRAINT: Max 300 chars. Authentic, no corporate feel.'
    : platform === 'reddit'
    ? 'REDDIT CONSTRAINT: Open with real observation or question. Community-first. No hashtags. Sound like a member, not a marketer.'
    : platform === 'discord'
    ? 'DISCORD CONSTRAINT: Short, casual, chat-like. Start with a reaction or quick thought. Emojis.'
    : '';

  const linkedInPersona = isLinkedIn ? `
PERSONA: A professional in the AI industry sharing a remote opportunity. First person, genuine and warm.
${BRAND_CONTEXT}
IMPORTANT: Do NOT name micro1 or any specific company. Say "leading AI companies", "top AI labs", etc.
IMPORTANT: Do NOT tell a personal story about yourself (job title, tenure, dates, promotions).` : `
PERSONA: A remote professional sharing a useful opportunity. First person, genuine, peer-to-peer.
CRITICAL: NEVER name micro1 or any company. Say "top AI companies", "leading AI labs", etc.
CRITICAL: Do NOT tell any personal story about yourself (job title, tenure, dates). Just share the opportunity.`;

  return `You are writing a ${dayLabel} social media post. Sound fully human — specific, varied, not a bot.
${linkedInPersona}

⚠️ CRITICAL RULE: The referral link contains a domain name — you MUST NOT read, mention, or infer any company name from the URL. Refer to the company ONLY as "leading AI companies", "top AI labs", or similar. NEVER say "micro1". NEVER say any company name.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
MONTH/YEAR: ${currentMonth} ${currentYear}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGY: ${play.label.toUpperCase()}
GOAL: ${play.goal}

EXAMPLE HOOKS (use the energy, NOT the exact words):
${play.hook_examples.map(h => `• "${h}"`).join('\n')}

RECOMMENDED STRUCTURE: ${play.structure}
TONE: ${play.tone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFERRAL LINK (embed once, naturally): ${REFERRAL_LINK}

ROLES (pick 3–6 most relevant — don't dump the whole list):
${roleList}

MANDATORY ELEMENTS (work in naturally):
- Referral link once
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire
- Referral bonus: once certified, you can refer others too (if fits naturally)
- 5–8 hashtags at the end (except Reddit/Discord/Twitter)

ABSOLUTE RULES:
- NEVER use a template opener like "📍 [Month] - Remote Opportunities at..."
- Every post must feel DISTINCT — different hook, angle, energy.
- NO "earn money", "make money", "easy income", "side hustle".
- NO fake urgency or hype.
${platformRules ? '\n' + platformRules : ''}

Generate ONLY the post content. No labels, no "Post:" prefix, no explanations.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE (shape decisions, NEVER surface in post):\n' + plannerContext : ''}`;
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
        prompt: buildPrompt(roles, platform, dayLabel, strategyConfig.strategy, plannerContext),
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