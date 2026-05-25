import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs every Monday at 6:00 AM Argentina time (UTC-3).
 * Generates posts for NON-LINKEDIN platforms (Twitter, Instagram, Mastodon, Bluesky, Threads,
 * job boards, Reddit, Discord) for the entire current week (Monday-Sunday).
 * LinkedIn posts are generated separately via monthlyAllRolesPosts automation.
 * Each platform gets one post per day, spread across the week.
 * All posts saved as 'scheduled'.
 */

const ALL_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
  'indiehackers', 'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const PLATFORM_TONES = {
  twitter: 'Punchy, hook immediately. Max 280 characters. No fluff.',
  facebook: 'Friendly, community-focused, conversational. Use emojis, keep it engaging and shareable.',
  instagram: 'Visual-first, warm and inspiring. Use line breaks and emojis for readability. Call to action at the end.',
  mastodon: 'Open, community-driven, no-algorithm feed. Authentic and conversational. Use hashtags for discoverability. Max 500 chars.',
  bluesky: 'Conversational, authentic, tech-savvy. Max 300 chars. Community-first tone, no corporate speak. Use hashtags sparingly.',
  threads: 'Casual, conversational, Instagram-like. Friendly and approachable. Use emojis naturally.',
  indiehackers: 'Founder-friendly, builder community. Emphasize mission, equity, growth potential, and bootstrapped culture.',
  weworkremotely: 'Remote-first, flexible work focus. Emphasize async culture and global team. Keep concise and scannable.',
  wellfound: 'Startup-oriented, founder-to-candidate feel. Emphasize mission, growth stage, and impact.',
  remotive: 'Community-driven, curated. Speak to remote work lifestyle and company values. Tech-forward language.',
  flexjobs: 'Professional, vetted, serious tone. Emphasize legitimacy and career growth.',
  remoteok: 'Digital nomad audience. Highlight location freedom, pay transparency, and remote-first perks.',
  reddit: 'Conversational, no-BS, community-first. Do NOT sound like an ad. Share value first, then the opportunity.',
  discord: 'Ultra-casual, direct, community-insider tone. Short messages. Use emojis. Feel like a real person, not a recruiter.',
};

const DAY_STRATEGIES = [
  'targeted_role',      // Monday
  'storytelling',       // Tuesday
  'social_proof',       // Wednesday
  'urgency',            // Thursday
  'carousel_text',      // Friday
  'niche_community',    // Saturday
  'targeted_role',      // Sunday
];

function buildPrompt(roles, platform, dayOfWeek, strategy, plannerContext = '') {
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
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayName = DAY_NAMES[dayOfWeek];

  const strategyInstructions = {
    targeted_role: `Focus on 2-3 specific roles from the list. Explain who they are for and what makes them interesting. Targeted, not generic.`,
    storytelling: `Tell a short, human story — could be about a freelancer who found remote work that finally matched their skills, or how someone discovered this kind of opportunity. Make it relatable and genuine. No company names.`,
    social_proof: `Write from the angle of someone who has seen real people succeed through this type of platform. Reference outcomes — certifications, interviews, getting hired — without naming the company. Feels like a genuine tip from a peer.`,
    urgency: `Some of the roles listed have limited openings or high demand. Create a natural, non-panicky sense of "this window doesn't stay open forever." Honest, not manufactured.`,
    carousel_text: `Write as a numbered list or scannable sections. Each section makes a clear point. Good for people scrolling fast. Hook at the top, value in the list, CTA at the bottom.`,
    niche_community: `Speak directly to a specific professional niche represented in the roles list (e.g., engineers, linguists, audio professionals, data scientists). Use their language. Feel like you're one of them.`,
  };

  // CRITICAL RULES that apply to ALL non-LinkedIn platforms
  const universalRules = `
ABSOLUTE RULES — VIOLATION WILL GET THE ACCOUNT BANNED:
- NEVER mention "micro1" or any specific company name. Refer to it as "top AI companies", "leading AI labs", "AI-driven platforms", or similar.
- NEVER use a fixed/repeated opening line. NEVER start with "📍 [Month] - Remote Opportunities". Every post must open differently.
- NEVER include a personal story (working at micro1 as Audio Expert/Reviewer) — that is ONLY for LinkedIn.
- NO fake urgency, NO hype, NO "earn money", "make money", "easy income", "side hustle".
- Sound like a REAL PERSON sharing a genuine tip — not a bot, not a recruiter, not an ad.
- Each post must feel fresh, different, and human. Vary your opening, structure, and angle every time.
- Emojis only where they add meaning, not decoration.`;

  const platformRules = platform === 'twitter'
    ? `\nTWITTER: Max 280 characters. One punchy hook + referral link. No list of roles.`
    : platform === 'mastodon'
    ? `\nMASTODON: Max 500 chars. Hashtags at end for discoverability.`
    : platform === 'bluesky'
    ? `\nBLUESKY: Max 300 chars. Authentic, no corporate tone.`
    : platform === 'reddit'
    ? `\nREDDIT: Write like a community member sharing a genuine find. Start with context or a question, not a pitch. No hashtags.`
    : platform === 'discord'
    ? `\nDISCORD: Ultra-casual. Short. Could start with a reaction or observation. No hashtags needed.`
    : '';

  return `You are writing a social media post on behalf of a remote professional who wants to share a job opportunity they found useful. Write in first person. Sound like a real human, not a marketer.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
DAY: ${dayName}
STRATEGY: "${strategy}" — ${strategyInstructions[strategy]}
MONTH/YEAR: ${currentMonth} ${currentYear}
REFERRAL LINK (always include once): ${REFERRAL_LINK}

ROLES AVAILABLE (pick 3–6 most relevant to feature, don't list all):
${roleList}

WHAT TO WRITE:
- Open with a hook that fits the STRATEGY above. Make it unique and human. Never repeat the same opening formula.
- Apply the strategy angle throughout the post.
- Feature a few roles naturally (don't just dump the full list).
- Include the referral link once, naturally embedded.
- End with a genuine CTA or open question (except Twitter).
- Include: 🛑 Check your spam folder after applying 🛑
- Once certified you can also refer others and earn bonuses — mention naturally if it fits.
- Add 5–8 hashtags at the end (except Reddit/Discord).
${universalRules}
${platformRules}

Generate ONLY the post content. No explanations, no labels, no "Post:" prefix.
${plannerContext ? '\n\nINTERNAL STRATEGY GUIDANCE (never mention in post):\n' + plannerContext : ''}`;
}

function getMonday(date) {
  // Use Argentina timezone to determine the correct local day
  const argStr = new Date(date).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [year, month, day] = argStr.split('-').map(Number);
  const local = new Date(year, month - 1, day); // local midnight, no timezone shift
  const dow = local.getDay(); // 0=Sun,1=Mon,...
  const diff = dow === 0 ? -6 : 1 - dow; // go back to Monday
  local.setDate(local.getDate() + diff);
  return local;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateStr(date) {
  // Format as YYYY-MM-DD in local time (no UTC shift)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  let body = {};
  try { body = await req.json(); } catch { /* no body */ }

  // Determine anchor Monday:
  // - If called automatically on Sunday (no explicit override), advance to NEXT Monday
  // - If called manually (any day), use the CURRENT week's Monday
  const today = new Date();
  const todayArgStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [ty, tm, td] = todayArgStr.split('-').map(Number);
  const todayLocal = new Date(ty, tm - 1, td);
  const isSunday = todayLocal.getDay() === 0;

  // target_next_week=true means automated Sunday trigger → next week
  // manual call (no flag) → current week always
  const isAutomatedSundayRun = body.target_next_week === true || (isSunday && body.manual !== true);

  let monday = getMonday(today);
  if (isAutomatedSundayRun) {
    monday = addDays(monday, 7); // advance to next Monday
  }

  // Generate posts for the 7 days (Monday-Sunday) of the target week
  const created = [];
  const errors = [];

  // Fetch all active roles
  const roles = await db.entities.OpenRole.filter({ is_active: true });
  if (!roles.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Separate new and high-demand roles for Monday spotlight
  const newRoles = roles.filter(r => r.is_new);
  const highDemandRoles = roles.filter(r => r.is_high_demand);
  // Monday spotlight: new roles first, then high-demand, fallback to all
  const mondaySpotlightRoles = newRoles.length > 0 ? newRoles : highDemandRoles.length > 0 ? highDemandRoles : roles;
  const allRoles = roles;

  // Fetch planner context (includes recommended strategies and posting times)
  let plannerContext = '';
  let plannerPostingTimes = {};
  let plannerStrategies = [];
  try {
    const plannerRes = await db.functions.invoke('getPlannerContext', {});
    if (plannerRes?.hasData) {
      plannerContext = plannerRes.context || '';
      plannerPostingTimes = plannerRes.postingTimes || {};
      // Use planner-recommended strategies if available (ordered list)
      if (plannerRes.recommendedStrategies && plannerRes.recommendedStrategies.length >= 2) {
        plannerStrategies = plannerRes.recommendedStrategies;
      }
    }
  } catch { /* continue without planner context */ }

  // Build the day strategy rotation — use planner-recommended if available
  const effectiveDayStrategies = plannerStrategies.length >= 7
    ? plannerStrategies.slice(0, 7)
    : plannerStrategies.length >= 2
      ? [
          'targeted_role',     // Monday always highlights new roles
          plannerStrategies[0],
          plannerStrategies[1],
          plannerStrategies[2] || 'urgency',
          plannerStrategies[3] || 'carousel_text',
          plannerStrategies[4] || 'niche_community',
          'targeted_role',     // Sunday recap
        ]
      : DAY_STRATEGIES;

  // Fetch existing scheduled posts for this week to skip already-filled days/platforms
  const weekEnd = addDays(monday, 6);
  const existingPosts = await db.entities.GeneratedPost.filter({ status: 'scheduled' });
  const existingKeys = new Set(
    existingPosts
      .filter(p => p.scheduled_date >= toDateStr(monday) && p.scheduled_date <= toDateStr(weekEnd))
      .map(p => {
        const noteMatch = p.notes && p.notes.match(/platform:(\S+)/);
        const platform = noteMatch ? noteMatch[1] : null;
        return platform ? `${p.scheduled_date}::${platform}` : null;
      })
      .filter(Boolean)
  );

  // Process each day sequentially, but all platforms in parallel per day
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = addDays(monday, dayOffset);
    const dateStr = toDateStr(currentDate);
    const strategy = effectiveDayStrategies[dayOffset];
    const dayRoles = dayOffset === 0 ? mondaySpotlightRoles : allRoles;

    const mondayExtra = dayOffset === 0
      ? newRoles.length > 0
        ? `\n\nSPECIAL INSTRUCTION FOR TODAY: Some roles are marked 🆕 (newly added). Naturally highlight them as fresh openings — don't bury them in the list.`
        : highDemandRoles.length > 0
          ? `\n\nSPECIAL INSTRUCTION FOR TODAY: Roles marked 🔥 have high demand and many openings. Weave that in naturally — not as hype, just as honest context about what's in demand right now.`
          : ''
      : '';

    // Filter out platforms already filled for this day
    const platformsToFill = ALL_PLATFORMS.filter(p => !existingKeys.has(`${dateStr}::${p}`));
    if (platformsToFill.length === 0) continue;

    // Generate all platforms for this day IN PARALLEL
    const dayResults = await Promise.allSettled(
      platformsToFill.map(async (platform) => {
        const content = await db.integrations.Core.InvokeLLM({
          prompt: buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + mondayExtra,
        });

        const defaultHour = 8 + Math.floor(platform.length / 3);
        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;

        const post = await db.entities.GeneratedPost.create({
          title: `${strategy.replace('_', ' ')} — ${platform} — ${dateStr}`,
          content,
          strategy,
          target_roles: dayRoles.map(r => r.title).join(', '),
          status: 'scheduled',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          notes: `[AUTO_GENERATED_WEEKLY] platform:${platform} day:${dayOffset}${dayOffset === 0 && newRoles.length > 0 ? ' new_roles_monday' : dayOffset === 0 && highDemandRoles.length > 0 ? ' high_demand_monday' : ''}`,
        });

        return { postId: post.id, platform, date: dateStr };
      })
    );

    for (const result of dayResults) {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      } else {
        errors.push({ date: dateStr, error: result.reason?.message });
      }
    }
  }

  return Response.json({
    message: `Weekly auto-fill completed: ${created.length} posts generated for the week starting ${toDateStr(monday)}`,
    targetWeek: toDateStr(monday),
    totalCreated: created.length,
    usedPlannerStrategies: plannerStrategies.length > 0,
    newRolesOnMonday: newRoles.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});