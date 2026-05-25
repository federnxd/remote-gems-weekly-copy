import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Strategy playbook — ensures every post type is genuinely distinct
const STRATEGY_PLAYBOOK = {
  targeted_role: {
    label: 'Targeted Role',
    goal: 'Speak DIRECTLY to a specific professional. Use their job title, their language, their pain points. NOT a generic post.',
    hook_examples: [
      'Senior backend engineers: what if your expertise could train the next generation of AI models?',
      'Linguists — your skills are more valuable to AI labs than you think.',
      'If you\'re a data scientist tired of fighting for compute resources, this is worth 3 minutes.',
    ],
    structure: 'Hook targeting the role → What this role does in AI training (1–2 lines) → Process: ~30 min interview → cert → hire → Roles (3–5 relevant) → Referral link → 🛑 spam warning → CTA',
    tone: 'Direct, peer-to-peer, professional. No fluff.',
  },
  storytelling: {
    label: 'Storytelling',
    goal: 'A short human story that makes the opportunity feel real and relatable. NOT a pitch.',
    hook_examples: [
      'Six months ago I almost passed on this. Glad I didn\'t.',
      'A friend of mine (senior UX researcher) applied thinking it was too good to be true. She\'s now certified.',
      'I\'ve referred 12 people this year. 4 got hired. Here\'s what I learned.',
    ],
    structure: 'Story hook (1–3 lines) → What happened / what changed → Bridge to the opportunity → Key process info → Referral link → Roles (2–4) → Open question or CTA',
    tone: 'Warm, personal, honest. Reads like a DM from a trusted contact.',
  },
  social_proof: {
    label: 'Social Proof',
    goal: 'Show real outcomes. Certifications, hires, real people who made it. Build credibility through results.',
    hook_examples: [
      'Over 300 professionals got certified through this program this year alone.',
      'The people who get hired here aren\'t lucky — they\'re prepared. Here\'s the actual process.',
      'AI labs are hiring across 40+ fields right now. The demand is real.',
    ],
    structure: 'Proof hook → Why this works / what makes candidates succeed → Who qualifies → Process → Roles (3–5) → Referral link → 🛑 spam → CTA',
    tone: 'Confident but grounded. Facts over hype.',
  },
  urgency: {
    label: 'Urgency',
    goal: 'Genuine helpful nudge — NOT fake panic. Roles filling, good timing, end of week momentum.',
    hook_examples: [
      'If applying for something this week has been on your mind — this might be the one.',
      'Some of these roles (marked 🔥) have multiple openings filling fast. Honest, not panic.',
      'These are fresh — just added this week. Good time to move.',
    ],
    structure: 'Gentle urgency hook → Why now makes sense (specific, real reason) → 🔥 or 🆕 roles called out → Process reminder → Referral link → 🛑 spam → CTA',
    tone: 'Friendly nudge. Never manufactured panic.',
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
    tone: 'Clear, concise, educational. "Save this post" energy.',
  },
  niche_community: {
    label: 'Niche Community',
    goal: 'Speak EXCLUSIVELY to one professional tribe. Insider language. Feel like one of them.',
    hook_examples: [
      'Fellow translators: AI needs you more than most people realize.',
      'If you\'ve spent years mastering audio production — AI labs are literally paying for that expertise.',
      'The ML community already knows this — for everyone else: your domain skills have a new market.',
    ],
    structure: 'Tribe-specific hook → Why THIS community matters to AI training → Specific matching roles → Process → Referral link → 🛑 spam → Niche-specific hashtags',
    tone: 'Insider, authentic, zero corporate tone.',
  },
};

const BRAND_CONTEXT = `
BRAND PHILOSOPHY (LinkedIn only):
- AI training is reshaping the economy — an entirely new labor sector.
- The more advanced AI becomes, the MORE it needs exceptional human experts.
- Human expertise, creativity, and lived experience are the world's most valuable commodity right now.
- This company works with top AI labs and cutting-edge tech companies globally.
- "Humans first" — contributors are prioritized above all else.
`;

/**
 * Reusable post generation engine.
 * Generates one post per platform for a given set of roles, saves them as 'scheduled' drafts.
 *
 * Payload:
 *   - roles: array of role objects { title, required_skills, pay_rate, openings }
 *   - platforms: array of platform ids (e.g. ['linkedin', 'twitter', 'reddit'])
 *   - scheduledDates: array of ISO date strings (one per platform, spread across the week)
 *   - scheduledTime: string 'HH:MM' (default '09:00')
 *   - referralLink: string
 *   - titlePrefix: string (label for the post title, e.g. 'Monthly All-Roles' or 'New Roles Week')
 *   - highlightNew: boolean — if true, emphasize NEW label on the roles
 */

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const PLATFORM_TONES = {
  linkedin: 'Professional, insightful, story-driven. Use industry language. 3,000 char limit.',
  twitter: 'Punchy, hook immediately. Max 280 characters. No fluff.',
  instagram: 'Visual-first, warm and inspiring. Use line breaks and emojis for readability. Call to action at the end.',
  weworkremotely: 'Remote-first, flexible work focus. Emphasize async culture and global team. Keep concise and scannable.',
  wellfound: 'Startup-oriented, founder-to-candidate feel. Emphasize mission, growth stage, and impact.',
  remotive: 'Community-driven, curated. Speak to remote work lifestyle and company values. Tech-forward language.',
  flexjobs: 'Professional, vetted, serious tone. Emphasize legitimacy and career growth.',
  remoteok: 'Digital nomad audience. Highlight location freedom, pay transparency, and remote-first perks.',
  reddit: 'Conversational, no-BS, community-first. Do NOT sound like an ad. Share value first, then the opportunity.',
  discord: 'Ultra-casual, direct, community-insider tone. Short messages. Use emojis. Feel like a real person, not a recruiter.',
};

function buildPostPrompt(roles, platform, referralLink, highlightNew, isMonthlyLinkedIn = false, plannerContext = '') {
  const roleList = roles.map(r => {
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

  // Strategy selection:
  // - Monthly LinkedIn: uses the signature template with micro1 branding
  // - New roles: urgency (freshness hook)
  // - Everything else: strategy-playbook driven, no template
  const strategyKey = highlightNew ? 'urgency' : 'targeted_role';
  const play = STRATEGY_PLAYBOOK[strategyKey];

  const platformRules = platform === 'twitter'
    ? 'TWITTER HARD LIMIT: Max 280 characters TOTAL. One punchy hook + referral link only. No roles list, no hashtags.'
    : platform === 'mastodon'
    ? 'MASTODON LIMIT: Max 500 chars. Hashtags at end for discoverability.'
    : platform === 'bluesky'
    ? 'BLUESKY LIMIT: Max 300 chars. No corporate tone.'
    : platform === 'reddit'
    ? 'REDDIT: Open with a real observation or question — never a pitch. Community-first. No hashtags. Sound like a member, not a marketer.'
    : platform === 'discord'
    ? 'DISCORD: Ultra-short, chat-like. Emojis. Feel like a real person in a server, not a recruiter.'
    : platform === 'instagram'
    ? 'INSTAGRAM: Line breaks between ideas. Emojis where meaningful. CTA at end. Save-worthy format.'
    : '';

  // ── MONTHLY LINKEDIN: the ONE place we use the branded template ──
  if (isMonthlyLinkedIn && isLinkedIn) {
    return `You are writing the monthly LinkedIn referral post on behalf of a professional at micro1.
This is the ONE monthly branded post — use the signature format below exactly.

PERSONA: You work at micro1 since October 2025 as Audio Expert, promoted to Reviewer in March 2026. First person, genuine, warm.
${BRAND_CONTEXT}

SIGNATURE FORMAT (follow this structure exactly):

1. HEADLINE (must be visible without "See more"):
   📍 ${currentMonth} ${currentYear} - Remote Opportunities at Leading AI Company micro1 🤖
   ➡️ ${referralLink}

2. PERSONAL INTRO (1 short paragraph):
   - First person, working at micro1 since October 2025 as Audio Expert, Reviewer since March 2026
   - Genuine, warm — reliable pay, flexible remote, supportive team
   - Not salesy

3. WHO SHOULD APPLY:
   - Professionals with solid expertise and good English
   - ~30 min interview → certification → possible hire
   - 🛑 Always check your spam folder just in case!!! 🛑

4. ROLES LIST:
   - Intro: "micro1 is hiring experts across many fields — here's a sample relevant to this post:"
   - List the roles below with dashes
   - End with: "...and many more!"

5. REFERRAL PERK: Once certified, you get your own referral link to earn bonuses.

6. CLOSING: Invite sharing and DMs. Friendly and open.

7. HASHTAGS: 6–8 relevant professional hashtags

ROLES:
${roleList}

STRICT RULES:
- NO "earn money", "make money", "easy income", "side hustle", "get paid fast"
- NO fake urgency
- Emojis for structure only (👉 📍 ➡️ 🙌 🛑)

Generate ONLY the post content. No labels, no "Post:" prefix.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE (never surface in post):\n' + plannerContext : ''}`;
  }

  // ── ALL OTHER POSTS: strategy-driven, no branded template ──
  const persona = isLinkedIn
    ? `PERSONA (LinkedIn): You work at micro1 since October 2025, Reviewer since March 2026. First person, genuine. You CAN mention micro1.
${BRAND_CONTEXT}`
    : `PERSONA: A remote professional sharing a valuable opportunity. First person, peer-to-peer.
CRITICAL: NEVER name micro1 or any specific company. Use "top AI companies", "leading AI labs", "AI-driven platforms".
CRITICAL: Do NOT use your personal story (Audio Expert, Reviewer, October 2025) — that is LinkedIn-only.`;

  const focus = highlightNew
    ? 'These are FRESHLY ADDED roles — new this week. Freshness is the hook.'
    : `${currentMonth} ${currentYear} — current open remote expert roles at leading AI companies.`;

  return `You are writing a social media referral post. Sound fully human — specific, varied, genuine. NOT a bot, NOT a recruiter template.
${persona}

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
FOCUS: ${focus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGY: ${play.label.toUpperCase()}
GOAL: ${play.goal}

EXAMPLE HOOKS (use the energy, NOT the exact words — write your own unique hook):
${play.hook_examples.map(h => `• "${h}"`).join('\n')}

RECOMMENDED STRUCTURE: ${play.structure}
TONE: ${play.tone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFERRAL LINK (embed once, naturally): ${referralLink}

ROLES (pick 3–6 most relevant — don't dump the whole list):
${roleList}

MANDATORY ELEMENTS (work in naturally):
- Referral link once
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire
- Once certified you can refer others too (if fits naturally)
- 5–8 hashtags at end (except Reddit/Discord/Twitter)

ABSOLUTE RULES:
- NEVER use the template opener "📍 [Month] - Remote Opportunities at..." — that is reserved for the monthly LinkedIn post only.
- Every post must feel DISTINCT — different hook, angle, energy.
- NO "earn money", "make money", "easy income", "side hustle", "get paid fast".
- NO fake urgency or hype.
${platformRules ? '\n' + platformRules : ''}

Generate ONLY the post content. No labels, no "Post:" prefix, no explanations.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE (never surface in post):\n' + plannerContext : ''}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  // Allow admin calls or scheduled automation (no session)
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  const body = await req.json();
  const {
    roles = [],
    platforms = [],
    scheduledDates = [],
    scheduledTime = '09:00',
    referralLink = REFERRAL_LINK,
    titlePrefix = 'Auto Campaign',
    highlightNew = false,
    isMonthlyLinkedIn = false,
  } = body;

  if (!roles.length || !platforms.length) {
    return Response.json({ error: 'roles and platforms are required' }, { status: 400 });
  }

  // Fetch planner context to inform content decisions
  let plannerContext = '';
  try {
    const plannerRes = await db.functions.invoke('getPlannerContext', {});
    if (plannerRes?.hasData) plannerContext = plannerRes.context || '';
  } catch { /* continue without */ }

  const created = [];
  const errors = [];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const scheduledDate = scheduledDates[i] || scheduledDates[0] || null;

    try {
      const content = await db.integrations.Core.InvokeLLM({
        prompt: buildPostPrompt(roles, platform, referralLink, highlightNew, isMonthlyLinkedIn && platform === 'linkedin', plannerContext),
      });

      const post = await db.entities.GeneratedPost.create({
        title: `${titlePrefix} — ${platform} — ${scheduledDate || 'unscheduled'}`,
        content,
        strategy: 'targeted_role',
        target_roles: roles.map(r => r.title).join(', '),
        status: scheduledDate ? 'scheduled' : 'draft',
        scheduled_date: scheduledDate || undefined,
        scheduled_time: scheduledTime,
        notes: `[AUTO_GENERATED] platform:${platform}`,
      });

      created.push({ postId: post.id, platform, scheduledDate });
    } catch (err) {
      errors.push({ platform, error: err.message });
    }
  }

  return Response.json({ created, errors, total: created.length });
});