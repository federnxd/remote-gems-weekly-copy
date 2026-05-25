import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// STRATEGY PLAYBOOK — what each strategy actually means here
// ============================================================
const STRATEGY_PLAYBOOK = {
  targeted_role: {
    label: 'Targeted Role',
    goal: 'Speak DIRECTLY to a specific professional. Use their job title, their language, their pain points.',
    hook_examples: [
      'If you\'re a data scientist tired of fighting for compute resources, this is worth 3 minutes.',
      'Senior backend engineers: what if your expertise could train the next generation of AI models?',
      'Linguists — your skills are more valuable to AI labs than you think.',
    ],
    structure: 'Hook targeting the role → What the role does in AI training (1–2 lines) → ~30 min interview process → Referral link → 🛑 spam warning → Roles list (3–5 relevant) → CTA',
    tone: 'Direct, peer-to-peer, no fluff.',
  },
  storytelling: {
    label: 'Storytelling',
    goal: 'A short human story that makes the opportunity feel real and relatable. NOT a pitch.',
    hook_examples: [
      'Six months ago I almost passed on this. Glad I didn\'t.',
      'A friend of mine (senior UX researcher) applied thinking it was too good to be true. She\'s now certified and working remotely for a top AI lab.',
      'I\'ve referred 12 people this year. 4 got hired. Here\'s what I learned.',
    ],
    structure: 'Story hook (1–3 lines) → What happened / what changed → Bridge to the opportunity → Key process info → Referral link → Roles (2–4) → Open question or CTA',
    tone: 'Warm, personal, honest. Reads like a DM from a trusted contact.',
  },
  social_proof: {
    label: 'Social Proof',
    goal: 'Show real outcomes. Certifications, hires, people who made it. Build credibility through results.',
    hook_examples: [
      'Over 300 professionals have gotten certified through this program this year alone.',
      'AI labs are hiring across 40+ fields right now. The demand is real.',
      'The people who get hired here aren\'t lucky — they\'re prepared. Here\'s the actual process.',
    ],
    structure: 'Proof hook (stat, outcome, or observation) → Why this works → Who qualifies → Process (30 min interview → cert → hire) → Roles → Referral link → 🛑 spam → CTA',
    tone: 'Confident but grounded. Facts over hype.',
  },
  urgency: {
    label: 'Urgency',
    goal: 'Genuine, helpful nudge — NOT fake panic. Weekend momentum, roles filling, good timing.',
    hook_examples: [
      'If applying for something this weekend has been on your mind — this might be the one.',
      'Some of these roles (marked 🔥) have multiple openings filling up. Not panic — just honest.',
      'It\'s Saturday. Prime time to do the one thing you said you\'d do this week.',
    ],
    structure: 'Gentle urgency hook → Why now makes sense (specific, real reason) → Process reminder → 🔥 high-demand roles called out → Referral link → 🛑 spam → CTA',
    tone: 'Friendly nudge. Never manufactured. Never "LAST CHANCE!!!"',
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
  niche_community: {
    label: 'Niche Community',
    goal: 'Speak EXCLUSIVELY to one professional tribe. Use insider language. Feel like one of them.',
    hook_examples: [
      'Fellow translators: AI needs you more than most people realize.',
      'If you\'ve spent years mastering audio production — AI labs are literally paying for that expertise.',
      'The ML community on here already knows this, but for the linguists and domain experts: your skills have a new market.',
    ],
    structure: 'Tribe-specific hook → Why THIS community matters to AI training → Specific roles from the list that match → Process → Referral link → 🛑 spam → Hashtags for that niche',
    tone: 'Insider, authentic, community-first. Zero corporate tone.',
  },
};

// CEO/brand philosophy to inject into LinkedIn posts
const BRAND_CONTEXT = `
BRAND PHILOSOPHY (use to add depth to LinkedIn posts):
- AI training is fundamentally reshaping the economy — it's an entirely new labor sector.
- For AI models to become smarter, they need humans to add context and meaning to what they learn.
- The more advanced AI becomes, the MORE it needs exceptional human experts.
- This is not job displacement — it's a new economy where human expertise becomes the world's most valuable commodity.
- The company works with cutting-edge AI labs and top tech companies globally.
- "Humans first" — the platform prioritizes human contributors above all else.
`;

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

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'instagram', 'mastodon', 'bluesky', 'threads',
  'weworkremotely', 'wellfound', 'remotive', 'flexjobs', 'remoteok', 'reddit', 'discord',
];

const THOUGHT_LEADERSHIP_DAYS = [1, 3, 6]; // Tuesday, Thursday, Sunday (0=Sun)

const TOPIC_THEMES = [
  { theme: 'AI job displacement vs. job creation', angle: 'Use current 2024-2025 data (WEF, McKinsey, OECD) showing AI creates new roles while automating tasks. Discuss net effect and skills that matter now.' },
  { theme: 'The rise of remote AI-assisted work', angle: 'Real stats on remote work adoption post-2023, how AI tools (Copilot, Claude, ChatGPT) integrate into remote workflows. What changed in last 12 months.' },
  { theme: 'Human-in-the-loop AI training as a profession', angle: 'Explain RLHF, growing demand for domain experts to review/label AI outputs, why this is legitimate growing field.' },
  { theme: 'Remote work in 2025: state of the market', angle: 'Current data: remote hiring by industry, remote vs office salaries globally, which sectors are most remote-friendly.' },
  { theme: 'AI literacy as the most in-demand skill', angle: 'Data from LinkedIn, Indeed, WEF showing AI skills are fastest growing. What companies pay for, how to develop these skills.' },
  { theme: 'The gig economy meets AI: new opportunity landscape', angle: 'How platforms use AI to match gig workers. Data on freelance market size, growth of AI-adjacent gig roles, what pays best.' },
  { theme: 'Robots, AI agents, and human experts behind them', angle: 'How humanoid robots and autonomous AI agents require vast human expert data. What this means for specialized employment.' },
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

function buildThoughtLeadershipPrompt(platform, theme, angle, dayOffset, plannerContext = '') {
  const tone = PLATFORM_TONES[platform] || 'Informative, engaging, professional.';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
  const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOffset];

  const platformRules = platform === 'twitter'
    ? 'Max 280 chars. One punchy stat/insight as hook. 1–2 hashtags.'
    : platform === 'reddit'
    ? 'Open with real observation/question. Invite discussion. No hashtags. Zero marketing feel.'
    : platform === 'discord'
    ? 'Super short. Start with stat/question. Ultra-casual. Real person starting convo.'
    : platform === 'instagram'
    ? 'Line breaks between ideas. Emojis where meaningful. Save-worthy, educational.'
    : '';

  return `You are writing a thought leadership post for ${platform.toUpperCase()}. You are a remote professional working in the AI industry. First person, insightful, credible, genuinely curious. This is NOT a job ad.

TODAY: ${currentDate} (${dayName})
PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}

TOPIC: ${theme}
ANGLE: ${angle}

WHAT TO WRITE:
- Educational post about the topic — something people want to read and share.
- Use real 2024–2025 data (WEF, McKinsey, LinkedIn, OECD, Statista — cite naturally in text).
- Connect to personal experience working remotely in AI — but do NOT name any specific company.
- End with genuine open question or discussion prompt (except Twitter).
- 5–8 relevant hashtags at end (except Reddit/Discord).

STRICT RULES:
- NO job postings, referral links, or "we're hiring".
- NO mention of "micro1" or any company name.
- NO fake urgency, NO corporate speak, NO "earn money" language.
- Stats woven naturally — not dumped as bullet list.
- Sound like thoughtful human, not brand account.
${platformRules ? '\nPLATFORM-SPECIFIC: ' + platformRules : ''}

Generate ONLY the post content. No labels, no "Post:" prefix.
${plannerContext ? '\n\nINTERNAL STRATEGY GUIDANCE (never surface in post):\n' + plannerContext : ''}`;
}

function buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext = '') {
  // ── Role signal analysis (use the pre-filtered dayRoles for this strategy/day)
  const newRolesList    = dayRoles.filter(r => r.is_new);
  const highDemandList  = dayRoles.filter(r => r.is_high_demand);
  const lastVacantList  = dayRoles.filter(r => r.openings > 0 && r.openings <= 3);
  const paidRoles       = dayRoles.filter(r => r.pay_rate);

  // Build strategy-specific annotated role list
  const roleList = dayRoles.slice(0, 20).map(r => {
    let line = `- ${r.title}`;
    // Only show signals relevant to THIS strategy
    if (r.is_new && strategy === 'targeted_role' && dayOffset === 0) line += ' 🆕';
    if (r.is_high_demand && (strategy === 'urgency' || strategy === 'social_proof')) line += ' 🔥';
    if (r.openings > 0 && strategy === 'urgency') line += ` [${r.openings} left]`;
    if (r.pay_rate && (strategy === 'social_proof' || strategy === 'urgency')) line += ` | ${r.pay_rate}`;
    if (r.required_skills && strategy === 'targeted_role') line += ` | ${r.required_skills}`;
    return line;
  }).join('\n');

  // ── Conversion intelligence block — reason about which signals drive clicks ──
  const signalInsights = [];
  if (newRolesList.length > 0)
    signalInsights.push(`🆕 ${newRolesList.length} roles are NEWLY ADDED this week — freshness is a powerful hook. People act on "just opened" faster than "always open".`);
  if (highDemandList.length > 0)
    signalInsights.push(`🔥 ${highDemandList.length} roles are HIGH DEMAND — more openings, actively hiring. Mentioning this builds social proof and creates natural urgency without hype.`);
  if (lastVacantList.length > 0)
    signalInsights.push(`⚠️ ${lastVacantList.length} roles have only 1–3 openings left (last vacants). These are the MOST powerful urgency triggers — real scarcity, not manufactured. Use them as the primary reason to act now.`);
  if (paidRoles.length > 0)
    signalInsights.push(`💰 ${paidRoles.length} roles show explicit pay rates (${paidRoles.slice(0,3).map(r=>r.pay_rate).join(', ')}${paidRoles.length>3?'…':''}). Pay transparency massively increases click-through — mention it where it fits.`);

  const conversionBlock = signalInsights.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSION INTELLIGENCE — reason about these signals to maximize referral clicks:
${signalInsights.join('\n')}

YOUR JOB: Use these signals strategically. The goal is not just to inform — it is to drive as many qualified people as possible to click the referral link. Every signal (🆕 new, 🔥 demand, last vacants, pay rate) is ammunition for a different reader's psychology. Use the right one for this strategy and audience.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : '';

  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const currentYear = new Date().toLocaleString('en-US', { year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
  const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOffset];
  const isLinkedIn = platform === 'linkedin';

  const play = STRATEGY_PLAYBOOK[strategy] || STRATEGY_PLAYBOOK['targeted_role'];

  const linkLength = REFERRAL_LINK.length;
  const platformRules = platform === 'twitter'
    ? `⚠️ CHARACTER LIMIT: MAX 280 characters TOTAL. The link is ${linkLength} chars, leaving you only ${280 - linkLength} chars for everything else. Write: 1 punchy hook line + the link. NOTHING else. NO role lists, NO hashtags, NO extra text. Count characters BEFORE writing. This is CRITICAL.`
    : platform === 'threads'
    ? `⚠️ CHARACTER LIMIT: MAX 300 characters TOTAL. Link is ${linkLength} chars, leaving ${300 - linkLength} chars for text. Write: 1-2 short lines + link ONLY. No long lists. Count before writing.`
    : platform === 'bluesky'
    ? `⚠️ CHARACTER LIMIT: MAX 300 characters TOTAL. Link is ${linkLength} chars. Keep it short and authentic. Count characters before writing.`
    : platform === 'facebook'
    ? `⚠️ CHARACTER LIMIT: MAX 500 characters TOTAL. Link is ${linkLength} chars, leaving ${500 - linkLength} for text. Friendly and conversational. Count before writing.`
    : platform === 'instagram'
    ? `⚠️ CHARACTER LIMIT: MAX 500 characters TOTAL. Link is ${linkLength} chars. Use line breaks and emojis wisely. Count before writing.`
    : platform === 'mastodon'
    ? `⚠️ CHARACTER LIMIT: MAX 500 characters TOTAL. Link is ${linkLength} chars. Count characters before writing.`
    : platform === 'reddit'
    ? `⚠️ CHARACTER LIMIT: MAX 500 characters TOTAL. Community-first, no pitch. Count before writing.`
    : platform === 'discord'
    ? `⚠️ CHARACTER LIMIT: MAX 300 characters TOTAL. Link is ${linkLength} chars, leaving ${300 - linkLength} for text. Ultra-casual, chat-like. Count before writing.`
    : platform === 'indiehackers' || platform === 'wellfound'
    ? `${platform.toUpperCase()} AUDIENCE: Builder/founder mindset. Lead with the mission angle — AI training as a new economy. Pay rates and high-demand signals resonate strongly here.`
    : platform === 'weworkremotely' || platform === 'remoteok' || platform === 'remotive' || platform === 'flexjobs'
    ? `${platform.toUpperCase()} AUDIENCE: Remote-work seekers. Lead with flexibility + pay transparency. Last vacants and new roles are strong hooks for this audience.`
    : '';

  const linkedInPersona = isLinkedIn ? `
PERSONA: A professional in the AI industry sharing a remote opportunity. First person, genuine and warm.
${BRAND_CONTEXT}
IMPORTANT: Do NOT name micro1 or any specific company. Say "leading AI companies", "top AI labs", etc.
IMPORTANT: Do NOT tell a personal story about yourself (job title, tenure, dates, promotions).` : `
PERSONA: A remote professional sharing a useful opportunity they found. First person, genuine, peer-to-peer.
CRITICAL: NEVER name micro1 or any company. Say "top AI companies", "leading AI labs", "AI-driven platforms", etc.
CRITICAL: Do NOT tell any personal story about yourself (job title, tenure, dates). Just share the opportunity.`;

  return `You are writing a ${dayName} job referral post optimized to drive maximum referral link clicks. Sound fully human — specific, varied, genuine. NOT a bot, NOT a recruiter template.
${linkedInPersona}

⚠️ CRITICAL RULE: The referral link contains a domain name — you MUST NOT read, mention, or infer any company name from the URL. Refer to the company ONLY as "leading AI companies", "top AI labs", or similar. NEVER say "micro1". NEVER say any company name. This rule overrides everything else.

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
MONTH/YEAR: ${currentMonth} ${currentYear}
${conversionBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGY: ${play.label.toUpperCase()}
GOAL: ${play.goal}

EXAMPLE HOOKS FOR THIS STRATEGY (pick the energy, NOT the exact words):
${play.hook_examples.map(h => `• "${h}"`).join('\n')}

RECOMMENDED STRUCTURE: ${play.structure}
TONE: ${play.tone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFERRAL LINK (embed once, naturally — this is the single most important element): ${REFERRAL_LINK}

ROLES (pre-selected for this strategy — pick 3–6, lead with the most compelling signals):
${roleList}

MANDATORY ELEMENTS (work in naturally):
- Referral link (once, prominently)
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire
- Once certified, you can refer others too (if it fits naturally)

ABSOLUTE RULES:
- NEVER use the template opener "📍 [Month] - Remote Opportunities at...". 
- Each post must feel DISTINCT. Different hook, angle, energy.
- NO "earn money", "make money", "easy income", "side hustle", "get paid fast".
- NO fake urgency — but DO use real signals (last vacants, new roles, pay rates) as genuine reasons to act.
- Emojis only where they add meaning.
- 5–8 hashtags at the end (except Reddit/Discord/Twitter).
- CHARACTER LIMITS ARE HARD LIMITS — count characters BEFORE outputting. The referral link alone is ~130 chars. Plan accordingly.
${platformRules ? '\n' + platformRules : ''}

Generate ONLY the post content. No labels, no "Post:" prefix, no explanations.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE (shape your decisions, NEVER surface in post):\n' + plannerContext : ''}`;
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

  // Allow frontend to pass an explicit target monday (manual override)
  let monday;
  if (body.target_monday) {
    const [y, m, d] = body.target_monday.split('-').map(Number);
    monday = new Date(y, m - 1, d);
  } else {
    monday = getMonday(today);
    if (isAutomatedSundayRun) {
      monday = addDays(monday, 7);
    }
  }

  // Generate posts for the 7 days (Monday-Sunday) of the target week
  const created = [];
  const errors = [];

  // Fetch all active roles
  const roles = await db.entities.OpenRole.filter({ is_active: true });
  if (!roles.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Categorize roles by type
  const newRoles = roles.filter(r => r.is_new);
  const highDemandRoles = roles.filter(r => r.is_high_demand);
  // Roles with very few openings (last vacants) — openings > 0 and <= 3, or explicitly high_demand
  const lastVacantRoles = roles.filter(r => (r.openings > 0 && r.openings <= 3) || r.is_high_demand);
  const allRoles = roles;

  // Group roles by category for segmented targeting
  const rolesByCategory = {};
  for (const role of roles) {
    const cat = role.category || 'other';
    if (!rolesByCategory[cat]) rolesByCategory[cat] = [];
    rolesByCategory[cat].push(role);
  }
  // Get categories that have at least 2 roles
  const richCategories = Object.entries(rolesByCategory)
    .filter(([, arr]) => arr.length >= 2)
    .map(([cat]) => cat);

  /**
   * Select the best roles for a given strategy and day offset.
   * This mirrors the PostGenerator's segmentation logic.
   */
  function selectRolesForStrategy(strategy, dayOffset) {
    switch (strategy) {
      case 'urgency': {
        // Saturday urgency: ONLY last-vacant (low openings) or high-demand roles
        const pool = lastVacantRoles.length >= 3 ? lastVacantRoles : highDemandRoles.length >= 2 ? highDemandRoles : roles;
        return pool.slice(0, 8);
      }
      case 'targeted_role': {
        // Monday: spotlight new roles. Other days: rotate through segments
        if (dayOffset === 0) {
          return newRoles.length > 0 ? newRoles : highDemandRoles.length > 0 ? highDemandRoles : roles;
        }
        // Pick a category segment to target based on the day (rotate)
        if (richCategories.length > 0) {
          const cat = richCategories[dayOffset % richCategories.length];
          return rolesByCategory[cat].slice(0, 8);
        }
        return roles.slice(0, 8);
      }
      case 'niche_community': {
        // Pick ONE specific community — rotate through categories by day
        if (richCategories.length > 0) {
          const cat = richCategories[(dayOffset + 2) % richCategories.length];
          return rolesByCategory[cat].slice(0, 6);
        }
        return roles.slice(0, 6);
      }
      case 'social_proof': {
        // Mix of high-demand roles across multiple categories for credibility
        const mixed = [
          ...highDemandRoles.slice(0, 3),
          ...roles.filter(r => !r.is_high_demand).slice(0, 5),
        ];
        return mixed.length >= 3 ? mixed : roles.slice(0, 8);
      }
      case 'storytelling': {
        // Pick roles from ONE relatable category — engineering or language tend to resonate
        const storyCategories = ['engineering', 'language', 'content', 'science', 'design'];
        for (const cat of storyCategories) {
          if (rolesByCategory[cat] && rolesByCategory[cat].length >= 2) {
            return rolesByCategory[cat].slice(0, 6);
          }
        }
        return roles.slice(0, 6);
      }
      case 'carousel_text': {
        // Diverse roles from MULTIPLE categories — showcase breadth
        const diverse = [];
        for (const cat of richCategories.slice(0, 5)) {
          diverse.push(rolesByCategory[cat][0]);
          if (rolesByCategory[cat][1]) diverse.push(rolesByCategory[cat][1]);
        }
        return diverse.length >= 4 ? diverse.slice(0, 10) : roles.slice(0, 10);
      }
      default:
        return roles.slice(0, 8);
    }
  }

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

  // Build per-day work items
  const dayJobs = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = addDays(monday, dayOffset);
    const dateStr = toDateStr(currentDate);
    const strategy = effectiveDayStrategies[dayOffset];
    const dayRoles = selectRolesForStrategy(strategy, dayOffset);

    // Strategy-specific extra instruction
    let strategyExtra = '';
    if (strategy === 'urgency') {
      const urgentTitles = dayRoles.filter(r => r.is_high_demand || (r.openings > 0 && r.openings <= 3));
      if (urgentTitles.length > 0) {
        strategyExtra = `\n\nSPECIAL INSTRUCTION: These roles have LIMITED VACANTS or HIGH DEMAND: ${urgentTitles.map(r => r.title + (r.openings ? ` (${r.openings} opening${r.openings > 1 ? 's' : ''})` : '')).join(', ')}. Use genuine urgency — low openings = real reason to apply soon. NOT manufactured panic.`;
      }
    } else if (strategy === 'targeted_role' && dayOffset === 0 && newRoles.length > 0) {
      strategyExtra = `\n\nSPECIAL INSTRUCTION: These roles are freshly added this week (🆕). Make freshness the hook — these just opened up.`;
    } else if (strategy === 'targeted_role' && dayOffset === 0 && highDemandRoles.length > 0) {
      strategyExtra = `\n\nSPECIAL INSTRUCTION: Roles marked 🔥 have high demand. Weave that in naturally — honest context, not hype.`;
    } else if (strategy === 'niche_community') {
      const cats = [...new Set(dayRoles.map(r => r.category).filter(Boolean))];
      if (cats.length > 0) {
        strategyExtra = `\n\nSPECIAL INSTRUCTION: Write EXCLUSIVELY for the ${cats[0]} professional community. Use insider language. This post should feel like it was written by and for someone in that field.`;
      }
    } else if (strategy === 'storytelling') {
      const cats = [...new Set(dayRoles.map(r => r.category).filter(Boolean))];
      if (cats.length > 0) {
        strategyExtra = `\n\nSPECIAL INSTRUCTION: The story should resonate with ${cats[0]} professionals. Make the protagonist someone from that background.`;
      }
    }

    const platformsToFill = ALL_PLATFORMS.filter(p => !existingKeys.has(`${dateStr}::${p}`));
    if (platformsToFill.length === 0) continue;

    for (const platform of platformsToFill) {
      dayJobs.push({ dayOffset, dateStr, strategy, dayRoles, strategyExtra, platform });
    }
  }

  // Character limits per platform (HARD limits)
  const CHAR_LIMITS = {
    twitter: 280,
    threads: 300,
    bluesky: 300,
    facebook: 500,
    instagram: 500,
    mastodon: 500,
    reddit: 500,
    discord: 300,
  };

  // Process job referral posts in batches
  const BATCH_SIZE = 20;
  for (let i = 0; i < dayJobs.length; i += BATCH_SIZE) {
    const batch = dayJobs.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async ({ dayOffset, dateStr, strategy, dayRoles, strategyExtra, platform }) => {
        const limit = CHAR_LIMITS[platform] || 500;
        const maxTextLength = limit - REFERRAL_LINK.length - 50; // Reserve 50 chars buffer
        
        // First prompt explicitly states the text budget (not total chars)
        const initialPrompt = buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + strategyExtra + `\n\n⚠️ CHARACTER BUDGET: You have MAX ${maxTextLength} characters for your text. The referral link takes ${REFERRAL_LINK.length} chars. Total post = text + link = max ${limit} chars. Write your text FIRST, then add the link. Count your text characters BEFORE adding the link.`;
        
        let content = await db.integrations.Core.InvokeLLM({ prompt: initialPrompt });
        
        // Validation loop: check link presence AND character limit
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          attempts++;
          
          // Check if link is present
          const hasLink = content.includes(REFERRAL_LINK);
          const isOverLimit = content.length > limit;
          
          if (hasLink && !isOverLimit) {
            break; // Valid post
          }
          
          // Build error-specific regeneration prompt
          let errorInstructions = [];
          if (!hasLink) {
            errorInstructions.push(`❌ MISSING LINK: Your post MUST include the referral link: ${REFERRAL_LINK}`);
          }
          if (isOverLimit) {
            const textOnly = content.replace(REFERRAL_LINK, '').trim();
            errorInstructions.push(`❌ OVER LIMIT: Text is ${textOnly.length} chars but you only have ${maxTextLength} chars. Cut ${textOnly.length - maxTextLength} characters.`);
          }
          
          const regenPrompt = buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + strategyExtra + `\n\n⚠️ REGENERATION REQUIRED - PREVIOUS ATTEMPT FAILED:\n${errorInstructions.join('\n')}\n\nCRITICAL RULES:\n1. Write text FIRST (max ${maxTextLength} chars)\n2. Add the referral link EXACTLY as shown: ${REFERRAL_LINK}\n3. Total must be ≤ ${limit} chars\n4. Count characters BEFORE outputting\n\nGenerate the complete post NOW with the link included.`;
          
          content = await db.integrations.Core.InvokeLLM({ prompt: regenPrompt });
        }
        
        // Final validation - if still invalid after max attempts, force fix
        let finalContent = content;
        if (!finalContent.includes(REFERRAL_LINK)) {
          // Append link if missing (should never happen but safety net)
          finalContent = finalContent.trim() + '\n\n' + REFERRAL_LINK;
        }
        if (finalContent.length > limit) {
          // Truncate text portion, keep link intact
          const textPortion = finalContent.replace(REFERRAL_LINK, '').trim();
          const truncatedText = textPortion.slice(0, limit - REFERRAL_LINK.length - 2);
          finalContent = truncatedText + '\n\n' + REFERRAL_LINK;
        }
        
        const defaultHour = 8 + Math.floor(platform.length / 3);
        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;
        const post = await db.entities.GeneratedPost.create({
          title: `${strategy.replace('_', ' ')} — ${platform} — ${dateStr}`,
          content: finalContent,
          strategy,
          target_roles: dayRoles.map(r => r.title).join(', '),
          status: 'scheduled',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          notes: `[AUTO_GENERATED] platform:${platform} type:job_referral chars:${finalContent.length}`,
        });
        return { postId: post.id, platform, date: dateStr, type: 'job_referral' };
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      } else {
        errors.push({ error: result.reason?.message || 'Unknown error' });
      }
    }
    
    if (i + BATCH_SIZE < dayJobs.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate thought leadership posts for Tue/Thu/Sun on non-LinkedIn platforms
  const thoughtLeadershipJobs = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    if (!THOUGHT_LEADERSHIP_DAYS.includes(dayOffset)) continue;
    
    const currentDate = addDays(monday, dayOffset);
    const dateStr = toDateStr(currentDate);
    const theme = TOPIC_THEMES[dayOffset % TOPIC_THEMES.length];
    
    // Check which platforms need thought leadership posts
    for (const platform of NON_LINKEDIN_PLATFORMS) {
      if (!existingKeys.has(`${dateStr}::${platform}`)) {
        thoughtLeadershipJobs.push({ dayOffset, dateStr, platform, theme });
      }
    }
  }

  // Process thought leadership posts
  for (const { dayOffset, dateStr, platform, theme } of thoughtLeadershipJobs) {
    try {
      const limit = CHAR_LIMITS[platform] || 500;
      
      const initialPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ CHARACTER LIMIT: ${limit} characters MAX. Count before writing.`;
      
      let content = await db.integrations.Core.InvokeLLM({
        prompt: initialPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });
      
      // Validate character count - regenerate if over limit
      let attempts = 0;
      const maxAttempts = 2;
      
      while (content.length > limit && attempts < maxAttempts) {
        attempts++;
        const regenPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ PREVIOUS ATTEMPT EXCEEDED ${limit} CHARS (was ${content.length}). REGENERATE: Be much more concise. Shorter sentences, fewer details. Count characters before outputting.`;
        content = await db.integrations.Core.InvokeLLM({
          prompt: regenPrompt,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });
      }
      
      let finalContent = content;
      // If still over limit, truncate
      if (finalContent.length > limit) {
        finalContent = finalContent.slice(0, limit);
      }
      
      const defaultHour = 11; // Thought leadership posts at 11am
      const plannerTime = plannerPostingTimes[platform];
      const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;
      
      const post = await db.entities.GeneratedPost.create({
        title: `Thought Leadership — ${platform} — ${dateStr}`,
        content: finalContent,
        strategy: 'thought_leadership',
        target_roles: 'general audience',
        status: 'scheduled',
        scheduled_date: dateStr,
        scheduled_time: timeStr,
        notes: `[AUTO_GENERATED] platform:${platform} type:thought_leadership theme:${theme.theme}`,
      });
      created.push({ postId: post.id, platform, date: dateStr, type: 'thought_leadership', theme: theme.theme });
    } catch (err) {
      errors.push({ platform, type: 'thought_leadership', error: err.message });
    }
  }

  const jobReferralCount = created.filter(p => p.type === 'job_referral').length;
  const thoughtLeadershipCount = created.filter(p => p.type === 'thought_leadership').length;

  return Response.json({
    message: `Weekly auto-fill completed: ${created.length} posts generated for the week starting ${toDateStr(monday)}`,
    targetWeek: toDateStr(monday),
    totalCreated: created.length,
    jobReferralPosts: jobReferralCount,
    thoughtLeadershipPosts: thoughtLeadershipCount,
    usedPlannerStrategies: plannerStrategies.length > 0,
    newRolesOnMonday: newRoles.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});