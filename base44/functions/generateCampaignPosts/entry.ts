import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

function buildPostPrompt(roles, platform, referralLink, highlightNew) {
  const roleList = roles.map(r => {
    let line = `- ${r.title}`;
    if (highlightNew && r.is_new) line += ' 🆕';
    if (r.pay_rate) line += ` (${r.pay_rate})`;
    return line;
  }).join('\n');

  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const currentYear = new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
  const isLinkedIn = platform === 'linkedin';

  const focus = highlightNew
    ? 'These are FRESHLY ADDED roles — new this week. That newness is the hook.'
    : `${currentMonth} ${currentYear} — current open remote expert roles at top AI companies.`;

  const linkedInPersona = isLinkedIn ? `
PERSONA (LinkedIn only): You work at micro1 since October 2025 as an Audio Expert, Reviewer since March 2026. First person, genuine, warm. Mention reliable pay, flexible remote hours, supportive team — naturally, not as a pitch. You can name micro1 on LinkedIn.` : `
PERSONA: A remote professional sharing a useful opportunity they came across. First person, genuine, peer-to-peer. NEVER name micro1 or any specific company — say "top AI companies", "leading AI labs", "AI-driven platforms", etc.`;

  const platformRules = platform === 'twitter'
    ? '\nTWITTER: Max 280 characters. Hook + link only. Nothing else.'
    : platform === 'reddit'
    ? '\nREDDIT: Open with a real observation or question. Community-first, no pitch energy. No hashtags.'
    : platform === 'discord'
    ? '\nDISCORD: Short, casual, chat-like. Emojis. Feel like a real person in a server, not a recruiter.'
    : platform === 'instagram'
    ? '\nINSTAGRAM: Line breaks, emojis, CTA at end. Save-worthy format.'
    : '';

  const strategies = [
    'Open with a specific role or skill as the hook — speak directly to that professional',
    'Open with a surprising or counterintuitive insight about remote AI work, then bridge to the opportunity',
    'Open with a question your target reader is probably asking themselves right now',
    'Open with a short human anecdote or observation, then pivot to the opportunity',
    'Open with a concise value statement — what this opportunity actually gives someone',
  ];
  // Rotate strategy based on platform name length (simple deterministic variation)
  const strategyHint = strategies[platform.length % strategies.length];

  return `You are writing a referral post. Write in first person. Sound fully human — varied, creative, genuine.
${linkedInPersona}

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
FOCUS: ${focus}
OPENING STRATEGY FOR THIS POST: ${strategyHint}

REFERRAL LINK (embed once, naturally): ${referralLink}

ROLES (pick 3–6 to feature, don't dump the whole list):
${roleList}

WHAT TO INCLUDE:
- A hook that uses today's opening strategy — fresh, never templated
- 3–6 roles woven in naturally (not just a list dump)
- Who should apply: solid expertise + good English, ~30 min interview → certification → possible hire
- 🛑 spam folder warning once
- Referral bonus perk (once, naturally)
- A genuine CTA or open question at the end
- 5–8 hashtags (except Reddit/Discord)

ABSOLUTE RULES:
- NO fixed opener like "📍 [Month] - Remote Opportunities" — every post must open differently
- NO "earn money", "make money", "easy income", "side hustle", "get paid fast"
- NO fake urgency or hype
- NO company name on non-LinkedIn platforms
${platformRules}

Generate ONLY the post content. No labels, no "Post:" prefix, no explanations.`;
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
  } = body;

  if (!roles.length || !platforms.length) {
    return Response.json({ error: 'roles and platforms are required' }, { status: 400 });
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const scheduledDate = scheduledDates[i] || scheduledDates[0] || null;

    try {
      const content = await db.integrations.Core.InvokeLLM({
        prompt: buildPostPrompt(roles, platform, referralLink, highlightNew),
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