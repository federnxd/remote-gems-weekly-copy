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
    if (r.pay_rate) line += ` (${r.pay_rate})`;
    return line;
  }).join('\n');

  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const currentYear = new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayName = DAY_NAMES[dayOfWeek];

  const strategyNotes = {
    targeted_role: 'Focus on specific roles and their requirements. Highlight who should apply.',
    storytelling: 'Tell a story about someone who got hired through micro1 or your own journey.',
    social_proof: 'Share genuine experience working at micro1. Authentic and warm.',
    urgency: 'Gentle nudge about week ending, time to apply. NOT fake panic.',
    carousel_text: 'List/carousel style. Numbered points or clear sections. Scannable.',
    niche_community: 'Speak to a specific community or niche audience.',
  };

  return `You are writing a referral post for micro1 on behalf of a professional who works there as an Audio Expert Reviewer. Write in first person, personal and credible.

PLATFORM: ${platform.toUpperCase()}
DAY: ${dayName}
STRATEGY: ${strategy} (${strategyNotes[strategy]})
PLATFORM TONE: ${tone}

REFERRAL LINK: ${REFERRAL_LINK}

CURRENT MONTH/YEAR: ${currentMonth} ${currentYear}

ROLES TO FEATURE:
${roleList}

FOLLOW THIS EXACT STRUCTURE (adapt length/tone for the platform):

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
   - Use the roles listed above, clean dash format. Mark 🆕 new ones if any.
   - End with: "...and many more!"

5. REFERRAL PERK (1 line):
   - Once certified, you get your own referral link to earn bonuses

6. CLOSING (1-2 lines):
   - Invite sharing and DMs, friendly and open

7. HASHTAGS: 6-8 relevant hashtags

STRICT RULES:
- NO "earn money", "make money", "easy income", "extra cash", "side hustle"
- NO fake urgency or hype
- Emojis: purposeful only (👉 📍 ➡️ 🙌 👍 🛑 🆕), not for hype
- For Twitter: keep it under 280 characters, just hook + link
- For Mastodon: max 500 chars, use hashtags for discoverability
- For Bluesky: max 300 chars, authentic tone
- For Reddit/Discord: sound like a real person sharing an opportunity, not an advertiser

Generate ONLY the post content, no explanations.

${plannerContext ? plannerContext + '\n\nINTERNAL GUIDANCE — DO NOT INCLUDE IN POST OUTPUT:\nUse the planner feedback above strictly as internal guidance to shape writing decisions (strategy, tone, hashtags, CTA). NEVER quote, reference, mention, or reveal any of this analytical data in the post itself. The post must read as completely natural and organic — zero trace of internal strategy data.' : ''}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  const today = new Date();
  const monday = getMonday(today);
  
  // Generate posts for the next 7 days (Monday-Sunday)
  const created = [];
  const errors = [];

  // Fetch all active roles
  const roles = await db.entities.OpenRole.filter({ is_active: true });
  if (!roles.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Fetch planner context
  let plannerContext = '';
  let plannerPostingTimes = {};
  try {
    const plannerRes = await db.functions.invoke('getPlannerContext', {});
    if (plannerRes?.hasData) {
      plannerContext = plannerRes.context || '';
      plannerPostingTimes = plannerRes.postingTimes || {};
    }
  } catch { /* continue without planner context */ }

  // For each day of the week
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = addDays(monday, dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon, etc.
    const strategy = DAY_STRATEGIES[dayOffset];

    // For each platform
    for (const platform of ALL_PLATFORMS) {
      try {
        const content = await db.integrations.Core.InvokeLLM({
          prompt: buildPrompt(roles, platform, dayOffset, strategy, plannerContext),
        });

        // Use planner-recommended time or stagger throughout the day
        const defaultHour = 8 + Math.floor(platform.length / 3);
        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;

        const post = await db.entities.GeneratedPost.create({
          title: `${strategy.replace('_', ' ')} — ${platform} — ${dateStr}`,
          content,
          strategy,
          target_roles: roles.map(r => r.title).join(', '),
          status: 'scheduled',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          notes: `[AUTO_GENERATED_WEEKLY] platform:${platform} day:${dayOffset}`,
        });

        created.push({ postId: post.id, platform, date: dateStr });
      } catch (err) {
        errors.push({ platform, date: dateStr, error: err.message });
      }
    }
  }

  return Response.json({
    message: `Weekly auto-fill completed: ${created.length} posts generated for the week starting ${monday.toISOString().split('T')[0]}`,
    totalCreated: created.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});