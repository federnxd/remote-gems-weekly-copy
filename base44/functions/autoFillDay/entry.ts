import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Reuse the same logic from autoFillWeek but for a single day

const ALL_PLATFORMS = [
  'linkedin', 'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
  'indiehackers', 'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
  'indiehackers', 'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const THOUGHT_LEADERSHIP_DAYS = [1, 3, 6]; // Tuesday, Thursday, Sunday

const TOPIC_THEMES = [
  { theme: 'AI job displacement vs. job creation', angle: 'Use current 2024-2025 data (WEF, McKinsey, OECD) showing AI creates new roles while automating tasks.' },
  { theme: 'The rise of remote AI-assisted work', angle: 'Real stats on remote work adoption post-2023, how AI tools integrate into remote workflows.' },
  { theme: 'Human-in-the-loop AI training as a profession', angle: 'Explain RLHF, growing demand for domain experts to review AI outputs.' },
  { theme: 'Remote work in 2025: state of the market', angle: 'Current data: remote hiring by industry, remote vs office salaries globally.' },
  { theme: 'AI literacy as the most in-demand skill', angle: 'Data from LinkedIn, Indeed, WEF showing AI skills are fastest growing.' },
  { theme: 'The gig economy meets AI: new opportunity landscape', angle: 'How platforms use AI to match gig workers. Data on freelance market growth.' },
  { theme: 'Robots, AI agents, and human experts behind them', angle: 'How autonomous AI still requires vast human expert data.' },
];

const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

const PLATFORM_TONES = {
  twitter: 'Punchy, hook immediately. Max 280 characters. No fluff.',
  facebook: 'Friendly, community-focused, conversational. Use emojis.',
  instagram: 'Visual-first, warm and inspiring. Use line breaks and emojis.',
  mastodon: 'Open, community-driven. Authentic. Max 500 chars.',
  bluesky: 'Conversational, authentic, tech-savvy. Max 300 chars.',
  threads: 'Casual, conversational. Friendly and approachable.',
  indiehackers: 'Founder-friendly, builder community.',
  weworkremotely: 'Remote-first, flexible work focus.',
  wellfound: 'Startup-oriented, founder-to-candidate feel.',
  remotive: 'Community-driven. Remote work lifestyle.',
  flexjobs: 'Professional, vetted, serious tone.',
  remoteok: 'Digital nomad audience. Location freedom.',
  reddit: 'Conversational, no-BS, community-first.',
  discord: 'Ultra-casual, direct, community-insider tone.',
  linkedin: 'Professional, insightful, story-driven. 3000 char limit.',
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

const STRATEGY_PLAYBOOK = {
  targeted_role: {
    label: 'Targeted Role',
    goal: 'Speak DIRECTLY to a specific professional role.',
    hook_examples: ['If you\'re a data scientist tired of fighting for compute resources...', 'Senior backend engineers: what if your expertise could train AI?'],
    structure: 'Hook targeting the role → What the role does → ~30 min interview → Referral link → 🛑 spam warning → Roles list → CTA',
    tone: 'Direct, peer-to-peer, no fluff.',
  },
  storytelling: {
    label: 'Storytelling',
    goal: 'A short human story that makes the opportunity feel real.',
    hook_examples: ['Six months ago I almost passed on this. Glad I didn\'t.', 'A friend of mine applied thinking it was too good to be true.'],
    structure: 'Story hook → What happened → Bridge to opportunity → Process info → Referral link → Roles → CTA',
    tone: 'Warm, personal, honest.',
  },
  social_proof: {
    label: 'Social Proof',
    goal: 'Show real outcomes. Certifications, hires, people who made it.',
    hook_examples: ['Over 300 professionals have gotten certified this year alone.', 'AI labs are hiring across 40+ fields right now.'],
    structure: 'Proof hook → Why this works → Who qualifies → Process → Roles → Referral link → CTA',
    tone: 'Confident but grounded.',
  },
  urgency: {
    label: 'Urgency',
    goal: 'Genuine, helpful nudge — NOT fake panic.',
    hook_examples: ['If applying this weekend has been on your mind — this might be the one.', 'Some roles have multiple openings filling up.'],
    structure: 'Gentle urgency hook → Why now makes sense → Process reminder → 🔥 high-demand roles → Referral link → CTA',
    tone: 'Friendly nudge. Never manufactured.',
  },
  carousel_text: {
    label: 'Carousel / List',
    goal: 'Scannable, numbered or bulleted. Made for scrolling.',
    hook_examples: ['5 things I wish I knew before applying:', 'What makes a strong candidate for AI expert roles:'],
    structure: 'List hook → 3–7 numbered points → Pivot to open roles → Referral link → CTA',
    tone: 'Clear, concise, educational.',
  },
  niche_community: {
    label: 'Niche Community',
    goal: 'Speak EXCLUSIVELY to one professional tribe.',
    hook_examples: ['Fellow translators: AI needs you more than most realize.', 'If you\'ve spent years mastering audio production — AI labs are paying for that.'],
    structure: 'Tribe-specific hook → Why THIS community matters → Specific roles → Process → Referral link → CTA',
    tone: 'Insider, authentic, community-first.',
  },
};

const BRAND_CONTEXT = `
BRAND PHILOSOPHY:
- AI training is reshaping the economy — a new labor sector.
- AI needs humans to add context and meaning.
- The more advanced AI becomes, the MORE it needs human experts.
- "Humans first" — prioritize human contributors.
`;

function buildThoughtLeadershipPrompt(platform, theme, angle, dayOffset, plannerContext = '') {
  const tone = PLATFORM_TONES[platform] || 'Informative, engaging.';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
  const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOffset];

  return `You are writing a thought leadership post for ${platform.toUpperCase()}. First person, insightful, credible. NOT a job ad.

TODAY: ${currentDate} (${dayName})
PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}

TOPIC: ${theme}
ANGLE: ${angle}

WHAT TO WRITE:
- Educational post about the topic
- Use real 2024–2025 data (WEF, McKinsey, LinkedIn, OECD)
- Connect to personal experience in AI — do NOT name any company
- End with open question or discussion (except Twitter)
- 5–8 hashtags at end (except Reddit/Discord)

STRICT RULES:
- NO job postings, referral links, or "we're hiring"
- NO mention of "micro1" or any company name
- NO fake urgency, NO corporate speak
- Sound like thoughtful human

Generate ONLY the post content.
${plannerContext ? '\n\nINTERNAL STRATEGY GUIDANCE:\n' + plannerContext : ''}`;
}

function buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext = '') {
  const newRolesList = dayRoles.filter(r => r.is_new);
  const highDemandList = dayRoles.filter(r => r.is_high_demand);
  const lastVacantList = dayRoles.filter(r => r.openings > 0 && r.openings <= 3);
  const paidRoles = dayRoles.filter(r => r.pay_rate);

  const roleList = dayRoles.slice(0, 20).map(r => {
    let line = `- ${r.title}`;
    if (r.is_new && strategy === 'targeted_role' && dayOffset === 0) line += ' 🆕';
    if (r.is_high_demand && (strategy === 'urgency' || strategy === 'social_proof')) line += ' 🔥';
    if (r.openings > 0 && strategy === 'urgency') line += ` [${r.openings} left]`;
    if (r.pay_rate && (strategy === 'social_proof' || strategy === 'urgency')) line += ` | ${r.pay_rate}`;
    if (r.required_skills && strategy === 'targeted_role') line += ` | ${r.required_skills}`;
    return line;
  }).join('\n');

  const signalInsights = [];
  if (newRolesList.length > 0) signalInsights.push(`🆕 ${newRolesList.length} roles are NEW.`);
  if (highDemandList.length > 0) signalInsights.push(`🔥 ${highDemandList.length} roles are HIGH DEMAND.`);
  if (lastVacantList.length > 0) signalInsights.push(`⚠️ ${lastVacantList.length} roles have only 1–3 openings left.`);
  if (paidRoles.length > 0) signalInsights.push(`💰 ${paidRoles.length} roles show pay rates.`);

  const conversionBlock = signalInsights.length > 0
    ? `\nCONVERSION INTELLIGENCE:\n${signalInsights.join('\n')}`
    : '';

  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const currentYear = new Date().getFullYear();
  const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOffset];
  const play = STRATEGY_PLAYBOOK[strategy] || STRATEGY_PLAYBOOK['targeted_role'];

  const linkLength = REFERRAL_LINK.length;
  const platformRules = platform === 'twitter'
    ? `⚠️ CHARACTER LIMIT: MAX 280 chars TOTAL. Link is ${linkLength} chars, leaving ${280 - linkLength} for text. Write: 1 punchy hook + link. NOTHING else.`
    : platform === 'threads'
    ? `⚠️ CHARACTER LIMIT: MAX 300 chars TOTAL. Link is ${linkLength} chars. Keep it short.`
    : platform === 'bluesky'
    ? `⚠️ CHARACTER LIMIT: MAX 300 chars TOTAL.`
    : platform === 'facebook'
    ? `⚠️ CHARACTER LIMIT: MAX 500 chars TOTAL.`
    : platform === 'instagram'
    ? `⚠️ CHARACTER LIMIT: MAX 500 chars TOTAL.`
    : platform === 'mastodon'
    ? `⚠️ CHARACTER LIMIT: MAX 500 chars TOTAL.`
    : platform === 'reddit'
    ? `⚠️ CHARACTER LIMIT: MAX 500 chars TOTAL. Community-first, no pitch.`
    : platform === 'discord'
    ? `⚠️ CHARACTER LIMIT: MAX 300 chars TOTAL. Ultra-casual.`
    : '';

  return `You are writing a job referral post. Sound fully human — specific, varied, genuine.

PERSONA: A professional in the AI industry sharing a remote opportunity. First person, genuine.
${BRAND_CONTEXT}
IMPORTANT: Do NOT name micro1 or any company. Say "leading AI companies", "top AI labs".

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}
MONTH/YEAR: ${currentMonth} ${currentYear}
${conversionBlock}

STRATEGY: ${play.label.toUpperCase()}
GOAL: ${play.goal}

EXAMPLE HOOKS:
${play.hook_examples.map(h => `• "${h}"`).join('\n')}

RECOMMENDED STRUCTURE: ${play.structure}
TONE: ${play.tone}

REFERRAL LINK (embed once): ${REFERRAL_LINK}

ROLES (pick 3–6):
${roleList}

MANDATORY:
- Referral link (once, prominently)
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire

ABSOLUTE RULES:
- NEVER use template opener "📍 [Month] - Remote Opportunities..."
- NO "earn money", "make money", "easy income", "side hustle"
- NO fake urgency
- Emojis only where meaningful
- 5–8 hashtags at end (except Reddit/Discord/Twitter)
- CHARACTER LIMITS ARE HARD — count before outputting
${platformRules ? '\n' + platformRules : ''}

Generate ONLY the post content. No labels, no explanations.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE:\n' + plannerContext : ''}`;
}

function selectRolesForStrategy(strategy, dayOffset, roles, rolesByCategory, richCategories) {
  switch (strategy) {
    case 'urgency': {
      const lastVacantRoles = roles.filter(r => (r.openings > 0 && r.openings <= 3) || r.is_high_demand);
      const pool = lastVacantRoles.length >= 3 ? lastVacantRoles : roles.filter(r => r.is_high_demand).length >= 2 ? roles.filter(r => r.is_high_demand) : roles;
      return pool.slice(0, 8);
    }
    case 'targeted_role': {
      if (dayOffset === 0) {
        const newRoles = roles.filter(r => r.is_new);
        return newRoles.length > 0 ? newRoles : roles.filter(r => r.is_high_demand).length > 0 ? roles.filter(r => r.is_high_demand) : roles;
      }
      if (richCategories.length > 0) {
        const cat = richCategories[dayOffset % richCategories.length];
        return rolesByCategory[cat].slice(0, 8);
      }
      return roles.slice(0, 8);
    }
    case 'niche_community': {
      if (richCategories.length > 0) {
        const cat = richCategories[(dayOffset + 2) % richCategories.length];
        return rolesByCategory[cat].slice(0, 6);
      }
      return roles.slice(0, 6);
    }
    case 'social_proof': {
      const highDemandRoles = roles.filter(r => r.is_high_demand);
      const mixed = [...highDemandRoles.slice(0, 3), ...roles.filter(r => !r.is_high_demand).slice(0, 5)];
      return mixed.length >= 3 ? mixed : roles.slice(0, 8);
    }
    case 'storytelling': {
      const storyCategories = ['engineering', 'language', 'content', 'science', 'design'];
      for (const cat of storyCategories) {
        if (rolesByCategory[cat] && rolesByCategory[cat].length >= 2) {
          return rolesByCategory[cat].slice(0, 6);
        }
      }
      return roles.slice(0, 6);
    }
    case 'carousel_text': {
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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  let body = {};
  try { body = await req.json(); } catch {}

  // Get target date from request
  if (!body.target_date) {
    return Response.json({ error: 'target_date is required' }, { status: 400 });
  }

  const [y, m, d] = body.target_date.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const dateStr = body.target_date;
  const dayOffset = targetDate.getDay(); // 0=Sun, 1=Mon, etc.

  const created = [];
  const errors = [];

  // Fetch active roles
  const roles = await db.entities.OpenRole.filter({ is_active: true });
  if (!roles.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Categorize roles
  const rolesByCategory = {};
  for (const role of roles) {
    const cat = role.category || 'other';
    if (!rolesByCategory[cat]) rolesByCategory[cat] = [];
    rolesByCategory[cat].push(role);
  }
  const richCategories = Object.entries(rolesByCategory)
    .filter(([, arr]) => arr.length >= 2)
    .map(([cat]) => cat);

  // Get strategy for this day
  const strategy = DAY_STRATEGIES[dayOffset];
  const dayRoles = selectRolesForStrategy(strategy, dayOffset, roles, rolesByCategory, richCategories);

  // Strategy-specific extra instruction
  let strategyExtra = '';
  if (strategy === 'urgency') {
    const urgentTitles = dayRoles.filter(r => r.is_high_demand || (r.openings > 0 && r.openings <= 3));
    if (urgentTitles.length > 0) {
      strategyExtra = `\n\nSPECIAL INSTRUCTION: These roles have LIMITED VACANTS or HIGH DEMAND: ${urgentTitles.map(r => r.title + (r.openings ? ` (${r.openings} opening${r.openings > 1 ? 's' : ''})` : '')).join(', ')}. Use genuine urgency.`;
    }
  } else if (strategy === 'targeted_role' && dayOffset === 0) {
    const newRoles = roles.filter(r => r.is_new);
    if (newRoles.length > 0) {
      strategyExtra = `\n\nSPECIAL INSTRUCTION: These roles are freshly added this week (🆕). Make freshness the hook.`;
    }
  } else if (strategy === 'niche_community') {
    const cats = [...new Set(dayRoles.map(r => r.category).filter(Boolean))];
    if (cats.length > 0) {
      strategyExtra = `\n\nSPECIAL INSTRUCTION: Write EXCLUSIVELY for the ${cats[0]} professional community. Use insider language.`;
    }
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
  } catch {}

  // Check existing posts for this date
  const existingPosts = await db.entities.GeneratedPost.filter({ status: 'scheduled', scheduled_date: dateStr });
  const existingKeys = new Set(
    existingPosts
      .map(p => {
        const noteMatch = p.notes && p.notes.match(/platform:(\S+)/);
        const platform = noteMatch ? noteMatch[1] : null;
        return platform ? `${dateStr}::${platform}` : null;
      })
      .filter(Boolean)
  );

  // Character limits
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

  // Generate job referral posts
  // On thought leadership days (Tue/Thu/Sun), job posts ONLY for LinkedIn
  // Other days: job posts for all platforms
  const isThoughtLeadershipDay = THOUGHT_LEADERSHIP_DAYS.includes(dayOffset);
  const platformsToFill = isThoughtLeadershipDay
    ? ALL_PLATFORMS.filter(p => p === 'linkedin' && !existingKeys.has(`${dateStr}::${p}`))
    : ALL_PLATFORMS.filter(p => !existingKeys.has(`${dateStr}::${p}`));

  for (const platform of platformsToFill) {
    try {
      const limit = CHAR_LIMITS[platform] || 500;
      const maxTextLength = limit - REFERRAL_LINK.length - 50;

      const initialPrompt = buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + strategyExtra + `\n\n⚠️ CHARACTER BUDGET: You have MAX ${maxTextLength} characters for your text. The referral link takes ${REFERRAL_LINK.length} chars. Total post = text + link = max ${limit} chars.`;

      let content = await db.integrations.Core.InvokeLLM({ prompt: initialPrompt });

      // Validation loop - regenerate until valid (max 10 attempts)
      let regenCount = 1;
      const maxRegenAttempts = 10;
      while ((!content.includes(REFERRAL_LINK) || content.length > limit) && regenCount < maxRegenAttempts) {
        regenCount++;
        const missingLink = !content.includes(REFERRAL_LINK);
        const overLimit = content.length > limit;

        let errorParts = [];
        if (missingLink) errorParts.push(`MISSING REFERRAL LINK - must include: ${REFERRAL_LINK}`);
        if (overLimit) errorParts.push(`OVER LIMIT by ${content.length - limit} chars - you have ${limit} chars total`);

        const strictPrompt = buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + strategyExtra + `\n\n⚠️ CRITICAL - REGENERATE (attempt ${regenCount}):\n${errorParts.join('\n')}\n\nRULES:\n1. Write text (max ${limit - REFERRAL_LINK.length - 20} chars)\n2. Add link: ${REFERRAL_LINK}\n3. Count EVERY character before outputting\n4. Output ONLY the final post`;

        content = await db.integrations.Core.InvokeLLM({ prompt: strictPrompt });
      }

      // If still invalid after max attempts, truncate and force link
      if (!content.includes(REFERRAL_LINK)) {
        content = content + '\n\n' + REFERRAL_LINK;
      }
      if (content.length > limit) {
        // Keep link intact, truncate text before it
        const textBefore = content.split(REFERRAL_LINK)[0] || '';
        const truncated = textBefore.slice(0, limit - REFERRAL_LINK.length - 5) + '\n\n' + REFERRAL_LINK;
        content = truncated;
      }

      const defaultHour = 8 + Math.floor(platform.length / 3);
      const plannerTime = plannerPostingTimes[platform];
      const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;

      const post = await db.entities.GeneratedPost.create({
        title: `${strategy.replace('_', ' ')} — ${platform} — ${dateStr}`,
        content: content,
        strategy,
        target_roles: dayRoles.map(r => r.title).join(', '),
        status: 'scheduled',
        scheduled_date: dateStr,
        scheduled_time: timeStr,
        notes: `[AUTO_GENERATED] platform:${platform} type:job_referral chars:${content.length}`,
      });
      created.push({ postId: post.id, platform, date: dateStr, type: 'job_referral' });
    } catch (err) {
      errors.push({ platform, type: 'job_referral', error: err.message });
    }
  }

  // Generate thought leadership posts if it's Tue/Thu/Sun
  // These go to all platforms EXCEPT LinkedIn (which gets job referral post)
  if (THOUGHT_LEADERSHIP_DAYS.includes(dayOffset)) {
    const theme = TOPIC_THEMES[dayOffset % TOPIC_THEMES.length];

    for (const platform of NON_LINKEDIN_PLATFORMS) {
      if (existingKeys.has(`${dateStr}::${platform}`)) continue;

      try {
        const limit = CHAR_LIMITS[platform] || 500;

        const initialPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ CHARACTER LIMIT: ${limit} characters MAX.`;

        let content = await db.integrations.Core.InvokeLLM({
          prompt: initialPrompt,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });

        // Regenerate if over limit
        let attempts = 0;
        while (content.length > limit && attempts < 5) {
          attempts++;
          const regenPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ PREVIOUS ATTEMPT EXCEEDED ${limit} CHARS (was ${content.length}). REGENERATE: Be much more concise. Count characters before outputting.`;
          content = await db.integrations.Core.InvokeLLM({
            prompt: regenPrompt,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
          });
        }

        // Final validation - max 5 more attempts
        let extraAttempts = 0;
        while (content.length > limit && extraAttempts < 5) {
          extraAttempts++;
          const regenPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ CRITICAL: Still over ${limit} chars (was ${content.length}). REGENERATE from scratch. Be extremely concise. Count before outputting.`;
          content = await db.integrations.Core.InvokeLLM({
            prompt: regenPrompt,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
          });
        }
        // If still over limit, truncate
        if (content.length > limit) {
          content = content.slice(0, limit);
        }

        const defaultHour = 11;
        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;

        const post = await db.entities.GeneratedPost.create({
          title: `Thought Leadership — ${platform} — ${dateStr}`,
          content: content,
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
  }

  const jobReferralCount = created.filter(p => p.type === 'job_referral').length;
  const thoughtLeadershipCount = created.filter(p => p.type === 'thought_leadership').length;

  return Response.json({
    message: `Daily auto-fill completed: ${created.length} posts generated for ${dateStr}`,
    targetDate: dateStr,
    totalCreated: created.length,
    jobReferralPosts: jobReferralCount,
    thoughtLeadershipPosts: thoughtLeadershipCount,
    errors: errors.length > 0 ? errors : undefined,
  });
});