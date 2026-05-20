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

  const headline = highlightNew
    ? `🌟 NEW WEEKLY ROLES at Leading AI Companies — These are the new open roles for the week 🚀\n   ➡️ ${referralLink}`
    : `📍 ${currentMonth} - Remote Opportunities at Leading AI Companies 🤖\n   ➡️ ${referralLink}`;

  const companyRef = isLinkedIn ? 'micro1' : 'leading AI companies';
  const rolesIntro = isLinkedIn
    ? 'micro1 is hiring experts across many fields — here\'s a sample of open roles:'
    : 'Leading AI companies are hiring experts across many fields — here\'s a sample of open roles:';

  const section2 = isLinkedIn && !highlightNew ? `
2. PERSONAL INTRO (1 short paragraph):
   - First person, mention working at micro1 since October 2025 as Audio Expert, as Reviewer since March 2026
   - Genuine and warm — mention reliable pay, flexible remote hours, supportive team
   - NOT salesy` : `
2. BRIEF CONTEXT (1 short paragraph):
   - Frame the opportunity naturally — ${highlightNew ? 'these are freshly added roles, hot off the press' : `remote expert roles at ${companyRef} are open now`}
   - Do NOT mention any specific company name
   - Keep it genuine, not promotional`;

  return `You are writing a referral recruitment post. Write in first person, personal and credible.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}

REFERRAL LINK: ${referralLink}

CURRENT MONTH/YEAR: ${currentMonth} ${currentYear}

${highlightNew ? 'FOCUS: These are NEWLY ADDED roles — emphasize that they are fresh opportunities just added this week.' : 'FOCUS: Monthly round-up of current open remote expert roles.'}

ROLES TO FEATURE:
${roleList}

FOLLOW THIS EXACT STRUCTURE (adapt length/tone for the platform, but keep all sections):

1. HEADLINE (first 2 lines — must be fully visible without "See more"):
   ${headline}
${section2}

3. WHO SHOULD APPLY (1 short paragraph with 👉):
   - Professionals with solid expertise and good English
   - Mention: ~30 min interview → certification → possibility of being hired
   - Include: ( 🛑 Always check your spam folder just in case!!! 🛑 )

4. ROLES LIST:
   - Intro: "${rolesIntro}"
   ${highlightNew ? '- Note which ones are newly added (🆕)' : ''}
   - Use the roles listed above, clean dash bullet format
   - End with: "...and many more!"

5. REFERRAL PERK (1 line):
   - Once certified, you get your own referral link to earn bonuses

6. CLOSING (1-2 lines):
   - Invite sharing and DMs, friendly and open

7. HASHTAGS: 6-8 relevant hashtags

STRICT RULES:
- NO "earn money", "make money", "easy income", "extra cash", "side hustle", "get paid fast"
- NO fake urgency or hype
- Compensation: mention "reliable pay" or "competitive compensation" naturally, once max
- Emojis: purposeful only (👉 📍 ➡️ 🌟 🚀 🙌 👍 🛑 🆕), not for hype
- For Twitter: keep it under 280 characters, just hook + link
- For Reddit/Discord: sound like a real person sharing an opportunity, not an advertiser
${!isLinkedIn ? '- CRITICAL: Do NOT mention "micro1" or any specific company name anywhere in the post' : ''}

Generate ONLY the post content, no explanations.`;
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