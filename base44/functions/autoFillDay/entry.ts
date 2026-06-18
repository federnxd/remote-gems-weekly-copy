import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Reuse the same logic from autoFillWeek but for a single day

const ALL_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
];

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
];

// Indices match JS Date.getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const THOUGHT_LEADERSHIP_DAYS = [2, 4, 0]; // Tuesday, Thursday, Sunday

// Thought-leadership topic library — fed to the LLM as briefs (theme + angle).
// The LLM generates fresh post text per call; this list never appears verbatim
// in any post. Categories: market_ai, interview_prep, remote_work_practical,
// communication_teamwork, professionalism. Mix is intentional — every category
// threads back to the core message (experienced professionals building careers
// in AI / remote work).
const TOPIC_THEMES = [
  // ── market_ai: commentary on the AI + remote job market ────────────────
  { category: 'market_ai', theme: 'AI job displacement vs. job creation', angle: 'Use current 2024-2025 data (WEF, McKinsey, OECD) showing AI creates new roles while automating tasks.' },
  { category: 'market_ai', theme: 'The rise of remote AI-assisted work', angle: 'Real stats on remote work adoption post-2023, how AI tools integrate into remote workflows.' },
  { category: 'market_ai', theme: 'Human-in-the-loop AI training as a profession', angle: 'Explain RLHF, growing demand for domain experts to review AI outputs.' },
  { category: 'market_ai', theme: 'Remote work in 2025: state of the market', angle: 'Current data: remote hiring by industry, remote vs office salaries globally.' },
  { category: 'market_ai', theme: 'AI literacy as the most in-demand skill', angle: 'Data from LinkedIn, Indeed, WEF showing AI skills are fastest growing.' },
  { category: 'market_ai', theme: 'The gig economy meets AI: new opportunity landscape', angle: 'How platforms use AI to match gig workers. Data on freelance market growth.' },
  { category: 'market_ai', theme: 'Robots, AI agents, and human experts behind them', angle: 'How autonomous AI still requires vast human expert data.' },

  // ── interview_prep: practical guidance for landing the role ────────────
  { category: 'interview_prep', theme: 'Researching a company before an interview, beyond the careers page', angle: 'Specific moves: read their last 6 months of engineering blog posts, look at their open-source repos or product changelog, find a recent talk from someone there. Goes deeper than memorizing the About page.' },
  { category: 'interview_prep', theme: 'Answering "tell me about yourself" without rambling', angle: 'The 90-second structure: present (current role + one signature achievement), past (one or two relevant pivots that explain how you got here), future (what you want next and why this role fits). Concrete, not chronological resume recitation.' },
  { category: 'interview_prep', theme: 'The "show, don\'t tell" rule for experience claims', angle: 'Replace "I\'m a strong communicator" with "I rewrote our onboarding doc and reduced support tickets by 40%". The structure is: skill + concrete action + measurable outcome. One example beats five adjectives.' },
  { category: 'interview_prep', theme: 'Answering "what\'s your weakness?" without clichés', angle: 'Real weaknesses with real mitigation. Avoid the perfectionism dodge — that signals you read the same blog as everyone else. Pick something genuine, show self-awareness, describe what you actively do about it.' },
  { category: 'interview_prep', theme: 'The questions to ask an interviewer that signal seriousness', angle: 'Not "what\'s the culture like" (generic) but things like "what does success look like in this role at 90 days?" or "what\'s the team\'s biggest open challenge right now?" — questions that show you\'re already thinking about the work.' },

  // ── remote_work_practical: actually doing remote work well ─────────────
  { category: 'remote_work_practical', theme: 'Setting up a sustainable home workspace', angle: 'Less about aesthetics, more about ergonomics + boundaries. Monitor at eye level, dedicated chair, "shut the door at 6pm" rituals. The setup people regret skipping after two years remote.' },
  { category: 'remote_work_practical', theme: 'Managing time-zone friction in distributed teams', angle: 'The asymmetry of working with teammates 6+ hours away. How to write a handoff message that lets someone act without needing a reply. Why "follow the sun" only works when documentation does.' },
  { category: 'remote_work_practical', theme: 'Async vs sync work: when to use which', angle: 'Sync (meetings, calls) is for ambiguity, alignment, emotion. Async (docs, threads, recordings) is for everything else. Most teams default to sync when async would work — and it costs them hours per week.' },
  { category: 'remote_work_practical', theme: 'Defending focus time against the always-on trap', angle: 'Remote work removes the natural end-of-day cue. Specific tactics: hard "do not disturb" hours, calendar-blocked deep work, separating Slack notifications from email, the laptop-in-another-room rule after 7pm.' },
  { category: 'remote_work_practical', theme: 'The honest case for remote work — beyond "no commute"', angle: 'The compound benefits: choosing your geography, designing your day around your sharpest focus hours, the ~10 hours/week of life that commutes quietly steal, the ability to do deep work without office interruption. Real numbers.' },

  // ── communication_teamwork: working well with people ──────────────────
  { category: 'communication_teamwork', theme: 'Assertive communication without being aggressive', angle: 'Stating what you need clearly, with reasons, without softening it into a question or hardening it into a demand. Specific phrase patterns ("I need X because Y; can we do that by Z?") and why "sorry to bother" trains people to ignore you.' },
  { category: 'communication_teamwork', theme: 'Giving feedback that actually lands', angle: 'The SBI framework: Situation (what was happening), Behavior (what they did, observable), Impact (what changed because of it). No personality judgments, no "always/never". One concrete example, future-focused.' },
  { category: 'communication_teamwork', theme: 'Disagreeing constructively in writing', angle: 'Text loses tone — disagreement that\'s clearly friendly in person reads as hostile in Slack. Specific moves: lead with what you agree on, name your concern as a question, propose an alternative instead of just pushing back. The "I might be missing something, but..." opener.' },
  { category: 'communication_teamwork', theme: 'Building trust quickly with people you\'ve never met in person', angle: 'Remote teammates judge you on consistency over charisma. Show up on time, do what you said you\'d do, write things down, follow up. Trust compounds through 50 small reliable interactions, not one big introduction.' },
  { category: 'communication_teamwork', theme: 'Managing up: making your manager\'s job easier', angle: 'Not sycophancy — clarity. Bring problems with a proposed solution attached. Surface risks early, not when they\'ve become crises. Summarize your week before they have to ask. The managers you most want to work for remember this.' },

  // ── professionalism: career-level habits ─────────────────────────────
  { category: 'professionalism', theme: 'Learning publicly: sharing what you\'re working on', angle: 'Posting about what you\'re currently learning beats posting only finished work. It compounds: you build a reputation, you find collaborators, you get feedback while there\'s still time to use it. The fear of looking like a beginner costs more than the discomfort of being seen learning.' },
  { category: 'professionalism', theme: 'Saying no professionally', angle: 'Protecting your time without burning bridges. The pattern: acknowledge the ask, name the constraint honestly, offer a smaller alternative or a referral. "I can\'t take this on this month — happy to look at it in March, or here\'s someone better suited" beats vague avoidance every time.' },
  { category: 'professionalism', theme: 'Building a portfolio when your work is confidential', angle: 'You can\'t share your employer\'s code or strategy decks — but you can write about patterns, share generic versions, contribute to open-source on the side, give talks about principles. The portfolio is the thinking, not the artifact.' },
  { category: 'professionalism', theme: 'The compound interest of small competencies', angle: 'Becoming a little better at writing, at running a meeting, at managing your calendar, at handling a difficult conversation — each compounds over a decade. The people who seem to "have it together" usually invested in unglamorous mid-level skills early.' },
  { category: 'professionalism', theme: 'When to switch jobs vs. stick it out', angle: 'The honest tradeoffs: switching too often makes you look unfocused, staying too long stalls your salary and skill growth. The signal-vs-noise of a bad quarter, the questions to ask before quitting, when a stretch role inside beats a lateral move outside.' },
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

// Indexed by JS Date.getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
// This MUST match WEEKLY_SCHEDULE in src/components/calendar/GenerateDayButton.jsx.
const DAY_STRATEGIES = [
  'storytelling',       // 0 Sunday    — thought leadership
  'targeted_role',      // 1 Monday    — all roles
  'storytelling',       // 2 Tuesday   — thought leadership
  'social_proof',       // 3 Wednesday — social proof / story
  'storytelling',       // 4 Thursday  — thought leadership
  'carousel_text',      // 5 Friday    — carousel / list
  'urgency',            // 6 Saturday  — weekend urgency
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
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOffset];

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
    if (r.is_new && strategy === 'targeted_role' && dayOffset === 1) line += ' 🆕';
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
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOffset];
  const play = STRATEGY_PLAYBOOK[strategy] || STRATEGY_PLAYBOOK['targeted_role'];

  const platformRules = platform === 'twitter'
    ? `TWITTER: Extremely tight space. ONE punchy hook line only — no role lists, no hashtags.`
    : platform === 'threads'
    ? `THREADS: Very tight. 1–2 short lines, conversational.`
    : platform === 'bluesky'
    ? `BLUESKY: Short and authentic, tech-savvy tone.`
    : platform === 'facebook'
    ? `FACEBOOK: Friendly and conversational, a few short lines.`
    : platform === 'instagram'
    ? `INSTAGRAM: Warm, line breaks and a few meaningful emojis.`
    : platform === 'mastodon'
    ? `MASTODON: Open, community-driven, authentic.`
    : platform === 'reddit'
    ? `REDDIT: Community-first, no pitch, no hashtags.`
    : platform === 'discord'
    ? `DISCORD: Ultra-casual, chat-like, very short.`
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

REFERRAL LINK: added automatically after your text — do NOT write any URL yourself.

ROLES (pick 3–6):
${roleList}

MANDATORY (only if they fit the length):
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire

ABSOLUTE RULES:
- NEVER use template opener "📍 [Month] - Remote Opportunities..."
- NO "earn money", "make money", "easy income", "side hustle"
- NO fake urgency
- Emojis only where meaningful
${platformRules ? '\n' + platformRules : ''}

Generate ONLY the post text. No labels, no link, no explanations.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE:\n' + plannerContext : ''}`;
}

// ============================================================
// Reliable referral-post generation (see autoFillWeek for rationale).
// LLM writes TEXT ONLY; code owns the link; word-target + best-candidate +
// sentence-boundary trim guarantee a complete, in-limit post with the link.
// ============================================================
function linkFootprint() { return REFERRAL_LINK.length + 2; }
function textBudget(limit) {
  const BUFFER = 10;
  return Math.max(40, limit - linkFootprint() - BUFFER);
}
function cleanTrim(text, maxChars) {
  if (text.length <= maxChars) return text.trim();
  let slice = text.slice(0, maxChars);
  const lastSentence = Math.max(
    slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'), slice.lastIndexOf('!\n'), slice.lastIndexOf('?\n'),
    slice.lastIndexOf('\n')
  );
  if (lastSentence > maxChars * 0.5) {
    slice = slice.slice(0, lastSentence + 1);
  } else {
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) slice = slice.slice(0, lastSpace);
  }
  return slice.trim();
}
function stripLinkAndLabels(text) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s*(post|content|output)\s*:\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
// ── Platform CTA mode (keep in sync with src/lib/platform-cta.js and other backends) ──
// LINK_OK: include the full referral URL in the post body.
// NO_LINK_IN_POST: end the post with a "Comment Remote" CTA instead — the DM
// responder sends the link when someone comments "Remote".
const LINK_OK_PLATFORMS_AFD = ['linkedin', 'mastodon', 'bluesky'];
function platformAllowsLink(platform) { return LINK_OK_PLATFORMS_AFD.includes(platform); }

const CTA_POOL_AFD = [
  'Comment "Remote" and I\'ll DM you the link to all open roles 🚀',
  'Drop "Remote" in the comments and I\'ll send you the full list via DM 🚀',
  'Comment "Remote" below — I\'ll DM you the roles and how to apply 🚀',
  'Want the link? Comment "Remote" and it lands in your DMs 🚀',
  'Comment "Remote" and the list of openings is on its way to your inbox 🚀',
  'Reply "Remote" and I\'ll DM you everything you need to apply 🚀',
  'Comment "Remote" and I\'ll send you the link + role details by DM 🚀',
  'Just comment "Remote" — I\'ll DM you the full opportunity 🚀',
  'Type "Remote" in a comment and I\'ll slide the link into your DMs 🚀',
  'Comment "Remote" to get the role list sent to you directly 🚀',
  'Curious? Comment "Remote" and the details hit your DMs 🚀',
  'Comment "Remote" and I\'ll DM you the application link today 🚀',
  'Want in? Comment "Remote" and I\'ll send the link straight to you 🚀',
  'Comment "Remote" — I\'ll DM you the list of roles taking applications 🚀',
  'Drop "Remote" below and the link is yours via DM 🚀',
];
function pickCTA() { return CTA_POOL_AFD[Math.floor(Math.random() * CTA_POOL_AFD.length)]; }

// Budget depends on whether the trailing text is the link or a CTA — both eat
// post characters. Compute the right reservation per call.
function tailFootprint(text) { return text.length + 2; }
function textBudgetFor(limit, tail) {
  const BUFFER = 10;
  return Math.max(40, limit - tailFootprint(tail) - BUFFER);
}

async function generateReferralPost(db, basePrompt, limit, wantHashtags, platform) {
  // Decide the tail (link vs CTA) before computing the writing budget — the
  // tail's length affects how much room the LLM has for the post body.
  const usesLink = platformAllowsLink(platform);
  const tail = usesLink ? REFERRAL_LINK : pickCTA();
  const budget = textBudgetFor(limit, tail);
  const approxWords = Math.max(8, Math.floor(budget / 6));

  const writingRules = (extra = '') => `${basePrompt}

OUTPUT RULES (follow exactly):
- Write the POST TEXT ONLY. Do NOT write any URL, link, or "comment X for the link" instruction — those are added automatically afterward.
- Length: about ${approxWords} words, and NEVER more than ${budget} characters. Aim a little under.
- Make it a COMPLETE thought with a real ending — never trail off.
${wantHashtags ? '- End with 3–5 relevant hashtags.' : '- Do NOT add hashtags.'}
- No "Post:" prefix, no labels, no explanations — just the post text.${extra}`;

  let best = null;
  let shortest = null;
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await db.integrations.Core.InvokeLLM({
      prompt: attempt === 1
        ? writingRules()
        : writingRules(`\n- ⚠️ Your previous attempt was too long. Write a SHORTER, complete post — under ${budget} characters. Cut detail, keep the hook and the point.`),
    });
    const text = stripLinkAndLabels(String(raw || ''));
    if (shortest === null || text.length < shortest.length) shortest = text;
    if (text.length <= budget) { best = text; break; }
  }

  let finalText = best !== null ? best : cleanTrim(shortest || '', budget);
  if (finalText.length > budget) finalText = cleanTrim(finalText, budget);
  return `${finalText}\n\n${tail}`;
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
  const rolesRaw = await db.entities.OpenRole.filter({ is_active: true });
  if (!rolesRaw.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // ── Rotation bias: count how many times each role appeared in posts over the
  // last 14 days, then sort roles ascending by that count so least-used go FIRST.
  // Every downstream selectRolesForStrategy case uses array order, so this
  // automatically biases all strategies toward fresher roles.
  const lookbackDays = 14;
  const lookback = new Date(); lookback.setDate(lookback.getDate() - lookbackDays);
  const recentPosts = await db.entities.GeneratedPost.list('-created_date', 200);
  const useCount = {};
  for (const p of recentPosts) {
    const d = p.created_date ? new Date(p.created_date) : null;
    if (!d || d < lookback) continue;
    const titles = (p.target_roles || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const t of titles) useCount[t] = (useCount[t] || 0) + 1;
  }
  // Stable tiebreaker: random jitter (small) so equally-fresh roles vary order.
  const roles = [...rolesRaw].sort((a, b) => {
    const ca = useCount[a.title] || 0;
    const cb = useCount[b.title] || 0;
    return ca - cb || (Math.random() - 0.5);
  });

  // Categorize roles (preserves the rotation order within each category)
  const rolesByCategory = {};
  for (const role of roles) {
    const cat = role.category || 'other';
    if (!rolesByCategory[cat]) rolesByCategory[cat] = [];
    rolesByCategory[cat].push(role);
  }
  const richCategories = Object.entries(rolesByCategory)
    .filter(([, arr]) => arr.length >= 2)
    .map(([cat]) => cat);

  // Fetch planner context FIRST so it can influence the day's strategy.
  let plannerContext = '';
  let plannerPostingTimes = {};
  let plannerStrategies = [];
  try {
    const plannerRes = await db.functions.invoke('getPlannerContext', {});
    if (plannerRes?.hasData) {
      plannerContext = plannerRes.context || '';
      plannerPostingTimes = plannerRes.postingTimes || {};
      if (Array.isArray(plannerRes.recommendedStrategies) && plannerRes.recommendedStrategies.length >= 2) {
        plannerStrategies = plannerRes.recommendedStrategies;
      }
    }
  } catch {}

  // Effective day→strategy map. DAY_STRATEGIES is getDay()-indexed (0=Sun..6=Sat).
  // When the planner recommends strategies, override the JOB-post days with them
  // (mirrors autoFillWeek). Thought-leadership days (Tue/Thu/Sun) keep their role
  // but the planner narrative still shapes tone; Monday stays targeted_role.
  // Planner list is an ordered priority list; map it onto the non-anchored days.
  let effectiveDayStrategies = [...DAY_STRATEGIES];
  if (plannerStrategies.length >= 7) {
    // Full 7-strategy plan provided — use as-is, getDay-indexed.
    effectiveDayStrategies = plannerStrategies.slice(0, 7);
  } else if (plannerStrategies.length >= 2) {
    // Override only the non-thought-leadership, non-Monday job days (Wed=3, Fri=5, Sat=6),
    // keeping Monday's targeted_role anchor and the Tue/Thu/Sun thought-leadership days.
    const ps = plannerStrategies;
    effectiveDayStrategies = [
      DAY_STRATEGIES[0],            // Sun — thought-leadership day
      'targeted_role',             // Mon — anchor (new roles)
      DAY_STRATEGIES[2],            // Tue — thought-leadership day
      ps[0] || DAY_STRATEGIES[3],   // Wed — planner priority #1
      DAY_STRATEGIES[4],            // Thu — thought-leadership day
      ps[1] || DAY_STRATEGIES[5],   // Fri — planner priority #2
      ps[2] || DAY_STRATEGIES[6],   // Sat — planner priority #3
    ];
  }

  // Get strategy for this day (planner-aware)
  const strategy = effectiveDayStrategies[dayOffset];
  const dayRoles = selectRolesForStrategy(strategy, dayOffset, roles, rolesByCategory, richCategories);

  // Strategy-specific extra instruction
  let strategyExtra = '';
  if (strategy === 'urgency') {
    const urgentTitles = dayRoles.filter(r => r.is_high_demand || (r.openings > 0 && r.openings <= 3));
    if (urgentTitles.length > 0) {
      strategyExtra = `\n\nSPECIAL INSTRUCTION: These roles have LIMITED VACANTS or HIGH DEMAND: ${urgentTitles.map(r => r.title + (r.openings ? ` (${r.openings} opening${r.openings > 1 ? 's' : ''})` : '')).join(', ')}. Use genuine urgency.`;
    }
  } else if (strategy === 'targeted_role' && dayOffset === 1) {
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
    bluesky: 250,
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
      const wantHashtags = !['twitter', 'reddit', 'discord'].includes(platform);

      const basePrompt = buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + strategyExtra;
      const content = await generateReferralPost(db, basePrompt, limit, wantHashtags, platform);

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

    // Generate all thought-leadership posts in PARALLEL. Previously this ran
    // sequentially and each post could fire up to 11 slow web-search LLM calls
    // (1 + 5 + 5 retries), so the request would hang around the 5th post and
    // blow past the function timeout — leaving the frontend stuck forever.
    const tlPlatforms = NON_LINKEDIN_PLATFORMS.filter(p => !existingKeys.has(`${dateStr}::${p}`));

    const tlResults = await Promise.all(tlPlatforms.map(async (platform) => {
      const limit = CHAR_LIMITS[platform] || 500;
      try {
        const initialPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ CHARACTER LIMIT: ${limit} characters MAX.`;

        let content = await db.integrations.Core.InvokeLLM({
          prompt: initialPrompt,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });

        // Single retry if over the limit, then truncate. Two attempts is plenty
        // and keeps total runtime well under the timeout.
        if (content.length > limit) {
          const regenPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ PREVIOUS ATTEMPT EXCEEDED ${limit} CHARS (was ${content.length}). REGENERATE: Be much more concise. Count characters before outputting.`;
          content = await db.integrations.Core.InvokeLLM({
            prompt: regenPrompt,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
          });
        }
        if (content.length > limit) content = content.slice(0, limit);

        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || '11:00';

        const post = await db.entities.GeneratedPost.create({
          title: `Thought Leadership — ${platform} — ${dateStr}`,
          content: content,
          strategy: 'thought_leadership',
          target_roles: 'general audience',
          status: 'scheduled',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          notes: `[AUTO_GENERATED] platform:${platform} type:thought_leadership category:${theme.category} theme:${theme.theme}`,
        });
        return { ok: true, postId: post.id, platform, date: dateStr, type: 'thought_leadership', theme: theme.theme };
      } catch (err) {
        return { ok: false, platform, type: 'thought_leadership', error: err.message };
      }
    }));

    for (const r of tlResults) {
      if (r.ok) created.push({ postId: r.postId, platform: r.platform, date: r.date, type: r.type, theme: r.theme });
      else errors.push({ platform: r.platform, type: r.type, error: r.error });
    }
  }

  // On thought-leadership days (Tue/Thu/Sun), ALSO generate a niche_community
  // referral post per non-LinkedIn platform — on top of the thought post.
  if (THOUGHT_LEADERSHIP_DAYS.includes(dayOffset)) {
    const nicheRoles = selectRolesForStrategy('niche_community', dayOffset, roles, rolesByCategory, richCategories);
    const nicheCats = [...new Set(nicheRoles.map(r => r.category).filter(Boolean))];
    const nicheExtra = nicheCats.length > 0
      ? `\n\nSPECIAL INSTRUCTION: Write EXCLUSIVELY for the ${nicheCats[0]} professional community. Use insider language.`
      : '';

    const nicheResults = await Promise.all(NON_LINKEDIN_PLATFORMS.map(async (platform) => {
      const limit = CHAR_LIMITS[platform] || 500;
      const wantHashtags = !['twitter', 'reddit', 'discord'].includes(platform);
      try {
        const basePrompt = buildPrompt(nicheRoles, platform, dayOffset, 'niche_community', plannerContext) + nicheExtra;
        const content = await generateReferralPost(db, basePrompt, limit, wantHashtags, platform);

        // Offset niche posts later in the day so they don't collide with thought posts
        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || '16:00';

        const post = await db.entities.GeneratedPost.create({
          title: `niche community — ${platform} — ${dateStr}`,
          content: content,
          strategy: 'niche_community',
          target_roles: nicheRoles.map(r => r.title).join(', '),
          status: 'scheduled',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          notes: `[AUTO_GENERATED] platform:${platform} type:job_referral chars:${content.length}`,
        });
        return { ok: true, postId: post.id, platform };
      } catch (err) {
        return { ok: false, platform, error: err.message };
      }
    }));

    for (const r of nicheResults) {
      if (r.ok) created.push({ postId: r.postId, platform: r.platform, date: dateStr, type: 'niche_community' });
      else errors.push({ platform: r.platform, type: 'niche_community', error: r.error });
    }
  }

  const jobReferralCount = created.filter(p => p.type === 'job_referral').length;
  const thoughtLeadershipCount = created.filter(p => p.type === 'thought_leadership').length;
  const nicheCount = created.filter(p => p.type === 'niche_community').length;

  return Response.json({
    message: `Daily auto-fill completed: ${created.length} posts generated for ${dateStr}`,
    targetDate: dateStr,
    totalCreated: created.length,
    jobReferralPosts: jobReferralCount,
    thoughtLeadershipPosts: thoughtLeadershipCount,
    nichePosts: nicheCount,
    errors: errors.length > 0 ? errors : undefined,
  });
});