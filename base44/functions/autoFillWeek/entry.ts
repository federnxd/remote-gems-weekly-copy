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
  'linkedin', 'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
];

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'facebook', 'instagram', 'mastodon', 'bluesky', 'threads',
];

// dayOffset = days since Monday (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)
const THOUGHT_LEADERSHIP_DAYS = [1, 3, 6]; // Tuesday, Thursday, Sunday

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

// Indexed by dayOffset = days since Monday (0=Mon, 1=Tue, ... 6=Sun) — NOT getDay().
// This MUST match WEEKLY_SCHEDULE in src/components/calendar/GenerateDayButton.jsx.
// On thought-leadership days (Tue/Thu/Sun) this only drives the LinkedIn job post tone;
// non-LinkedIn platforms get thought-leadership posts instead.
const DAY_STRATEGIES = [
  'targeted_role',      // 0 Monday    — all roles
  'storytelling',       // 1 Tuesday   — thought leadership
  'social_proof',       // 2 Wednesday — social proof / story
  'storytelling',       // 3 Thursday  — thought leadership
  'carousel_text',      // 4 Friday    — carousel / list
  'urgency',            // 5 Saturday  — weekend urgency
  'storytelling',       // 6 Sunday    — thought leadership
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
    ? `TWITTER: Extremely tight space. Write ONE punchy hook line only — no role lists, no hashtags. The link is added after.`
    : platform === 'threads'
    ? `THREADS: Very tight. 1–2 short lines, conversational. No long lists.`
    : platform === 'bluesky'
    ? `BLUESKY: Short and authentic, tech-savvy tone.`
    : platform === 'facebook'
    ? `FACEBOOK: Friendly and conversational, a few short lines.`
    : platform === 'instagram'
    ? `INSTAGRAM: Warm, use line breaks and a few meaningful emojis.`
    : platform === 'mastodon'
    ? `MASTODON: Open, community-driven, authentic.`
    : platform === 'reddit'
    ? `REDDIT: Community-first, no pitch, no hashtags.`
    : platform === 'discord'
    ? `DISCORD: Ultra-casual, chat-like, very short.`
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

REFERRAL LINK: added automatically after your text — do NOT write any URL yourself.

ROLES (pre-selected for this strategy — pick 3–6, lead with the most compelling signals):
${roleList}

MANDATORY ELEMENTS (work in naturally, only if they fit the length):
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire
- Once certified, you can refer others too (if it fits naturally)

ABSOLUTE RULES:
- NEVER use the template opener "📍 [Month] - Remote Opportunities at...". 
- Each post must feel DISTINCT. Different hook, angle, energy.
- NO "earn money", "make money", "easy income", "side hustle", "get paid fast".
- NO fake urgency — but DO use real signals (last vacants, new roles, pay rates) as genuine reasons to act.
- Emojis only where they add meaning.
${platformRules ? '\n' + platformRules : ''}

Generate ONLY the post text. No labels, no "Post:" prefix, no link, no explanations.
${plannerContext ? '\n\nINTERNAL PLANNER GUIDANCE (shape your decisions, NEVER surface in post):\n' + plannerContext : ''}`;
}

// ============================================================
// Reliable referral-post generation
// ------------------------------------------------------------
// The LLM writes TEXT ONLY (no URL). Code owns the link, so the link can never
// be missing or mangled, and the LLM's whole budget goes to readable text.
// We give a word-count target (LLMs hit those far better than char counts),
// keep the best valid candidate across attempts, and on failure trim at a
// sentence boundary — never mid-word — before appending the link.
// ============================================================

// Characters the link + separator occupy in the final post.
function linkFootprint() {
  return REFERRAL_LINK.length + 2; // "\n\n" + link
}

// Usable characters for the LLM's text, with a safety buffer under the hard limit.
function textBudget(limit) {
  const BUFFER = 10;
  return Math.max(40, limit - linkFootprint() - BUFFER);
}

// Trim text to maxChars without cutting a word/sentence in half.
function cleanTrim(text, maxChars) {
  if (text.length <= maxChars) return text.trim();
  let slice = text.slice(0, maxChars);
  // Prefer the last sentence end (. ! ? or newline) within the slice.
  const lastSentence = Math.max(
    slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'), slice.lastIndexOf('!\n'), slice.lastIndexOf('?\n'),
    slice.lastIndexOf('\n')
  );
  if (lastSentence > maxChars * 0.5) {
    slice = slice.slice(0, lastSentence + 1);
  } else {
    // No good sentence boundary — fall back to last whole word.
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) slice = slice.slice(0, lastSpace);
  }
  return slice.trim();
}

// Strip any URL the model included anyway, and any "Post:"-style prefixes.
function stripLinkAndLabels(text) {
  return text
    .replace(/https?:\/\/\S+/g, '')      // remove any URLs the model added
    .replace(/^\s*(post|content|output)\s*:\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate one referral post that fits `limit` and ends with the referral link.
 * @param db base44 service-role client
 * @param basePrompt the strategy/platform prompt (from buildPrompt), WITHOUT link/counting noise
 * @param limit hard character limit for the platform
 * @param wantHashtags whether this platform wants hashtags (longer platforms only)
 */
// ── Platform CTA mode (keep in sync with src/lib/platform-cta.js and other backends) ──
const LINK_OK_PLATFORMS_AFW = ['linkedin', 'mastodon', 'bluesky'];
function platformAllowsLink(platform) { return LINK_OK_PLATFORMS_AFW.includes(platform); }

const CTA_POOL_AFW = [
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
function pickCTA() { return CTA_POOL_AFW[Math.floor(Math.random() * CTA_POOL_AFW.length)]; }

// Per-call budget: tail length depends on whether we're embedding the link or a CTA.
function tailFootprint(text) { return text.length + 2; }
function textBudgetFor(limit, tail) {
  const BUFFER = 10;
  return Math.max(40, limit - tailFootprint(tail) - BUFFER);
}

async function generateReferralPost(db, basePrompt, limit, wantHashtags, platform) {
  const usesLink = platformAllowsLink(platform);
  const tail = usesLink ? REFERRAL_LINK : pickCTA();
  const budget = textBudgetFor(limit, tail);
  const approxWords = Math.max(8, Math.floor(budget / 6));

  const writingRules = (extra = '') => `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES (follow exactly):
- Write the POST TEXT ONLY. Do NOT write any URL, link, or "comment X for the link" instruction — those are added automatically afterward.
- Length: about ${approxWords} words, and NEVER more than ${budget} characters. Aim a little under.
- Make it a COMPLETE thought with a real ending — never trail off.
${wantHashtags ? '- End with 3–5 relevant hashtags.' : '- Do NOT add hashtags.'}
- No "Post:" prefix, no labels, no explanations — just the post text.${extra}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  let best = null;
  let shortest = null;

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw = await db.integrations.Core.InvokeLLM({
      prompt: attempt === 1
        ? writingRules()
        : writingRules(`\n- ⚠️ Your previous attempt was too long. Write a SHORTER, complete post — under ${budget} characters. Cut detail, keep the hook and the point.`),
    });
    let text = stripLinkAndLabels(String(raw || ''));

    if (shortest === null || text.length < shortest.length) shortest = text;
    if (text.length <= budget) { best = text; break; }
  }

  let finalText = best !== null ? best : cleanTrim(shortest || '', budget);
  if (finalText.length > budget) finalText = cleanTrim(finalText, budget);

  return `${finalText}\n\n${tail}`;
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

  // ── Pause gate ────────────────────────────────────────────────────────
  // Honors the global Play/Pause switch in the sidebar. When paused, we
  // return a 200 with a message instead of doing any work — the cron
  // shouldn't treat pause as an error.
  try {
    const settings = await db.entities.AutoPostSettings.list();
    if (settings.length > 0 && settings[0].is_paused) {
      return Response.json({ message: 'Auto-posting is paused. Skipping.', paused: true });
    }
  } catch { /* if settings entity missing, default to running */ }

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
  const rolesRaw = await db.entities.OpenRole.filter({ is_active: true });
  if (!rolesRaw.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Rotation bias: roles used most in the last 14 days go to the back, so the
  // strategy selectors (which slice arrays) automatically prefer fresher ones.
  const lookbackDays = 14;
  const lookback = new Date(); lookback.setDate(lookback.getDate() - lookbackDays);
  const recentPostsForRotation = await db.entities.GeneratedPost.list('-created_date', 200);
  const useCount = {};
  for (const p of recentPostsForRotation) {
    const d = p.created_date ? new Date(p.created_date) : null;
    if (!d || d < lookback) continue;
    const titles = (p.target_roles || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const t of titles) useCount[t] = (useCount[t] || 0) + 1;
  }
  const roles = [...rolesRaw].sort((a, b) => {
    const ca = useCount[a.title] || 0;
    const cb = useCount[b.title] || 0;
    return ca - cb || (Math.random() - 0.5);
  });

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
        const wantHashtags = !['twitter', 'reddit', 'discord'].includes(platform);

        const basePrompt = buildPrompt(dayRoles, platform, dayOffset, strategy, plannerContext) + strategyExtra;
        const finalContent = await generateReferralPost(db, basePrompt, limit, wantHashtags, platform);

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
      
      // Validate character count - regenerate if over limit (bounded)
      let attempts = 0;
      const maxAttempts = 4;

      while (content.length > limit && attempts < maxAttempts) {
        attempts++;
        const regenPrompt = buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayOffset, plannerContext) + `\n\n⚠️ PREVIOUS ATTEMPT EXCEEDED ${limit} CHARS (was ${content.length}). REGENERATE: Be much more concise. Shorter sentences, fewer details.`;
        content = await db.integrations.Core.InvokeLLM({
          prompt: regenPrompt,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });
      }

      // Sentence-boundary trim on fallback — never mid-word.
      let finalContent = content.length > limit ? cleanTrim(content, limit) : content;
      
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
        notes: `[AUTO_GENERATED] platform:${platform} type:thought_leadership category:${theme.category} theme:${theme.theme}`,
      });
      created.push({ postId: post.id, platform, date: dateStr, type: 'thought_leadership', theme: theme.theme });
    } catch (err) {
      errors.push({ platform, type: 'thought_leadership', error: err.message });
    }
  }

  // On thought-leadership days (Tue/Thu/Sun), ALSO generate a niche_community
  // referral post per non-LinkedIn platform — on top of the thought post.
  const nicheJobs = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    if (!THOUGHT_LEADERSHIP_DAYS.includes(dayOffset)) continue;

    const currentDate = addDays(monday, dayOffset);
    const dateStr = toDateStr(currentDate);
    const nicheRoles = selectRolesForStrategy('niche_community', dayOffset);
    const nicheCats = [...new Set(nicheRoles.map(r => r.category).filter(Boolean))];
    const nicheExtra = nicheCats.length > 0
      ? `\n\nSPECIAL INSTRUCTION: Write EXCLUSIVELY for the ${nicheCats[0]} professional community. Use insider language. This post should feel like it was written by and for someone in that field.`
      : '';

    for (const platform of NON_LINKEDIN_PLATFORMS) {
      nicheJobs.push({ dayOffset, dateStr, platform, nicheRoles, nicheExtra });
    }
  }

  const NICHE_BATCH_SIZE = 20;
  for (let i = 0; i < nicheJobs.length; i += NICHE_BATCH_SIZE) {
    const batch = nicheJobs.slice(i, i + NICHE_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async ({ dayOffset, dateStr, platform, nicheRoles, nicheExtra }) => {
        const limit = CHAR_LIMITS[platform] || 500;
        const wantHashtags = !['twitter', 'reddit', 'discord'].includes(platform);

        const basePrompt = buildPrompt(nicheRoles, platform, dayOffset, 'niche_community', plannerContext) + nicheExtra;
        const content = await generateReferralPost(db, basePrompt, limit, wantHashtags, platform);

        // Offset niche posts later in the day so they don't collide with thought posts
        const defaultHour = 16;
        const plannerTime = plannerPostingTimes[platform];
        const timeStr = plannerTime || `${defaultHour.toString().padStart(2, '0')}:00`;

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
        return { postId: post.id, platform, date: dateStr, type: 'niche_community' };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') created.push(result.value);
      else errors.push({ type: 'niche_community', error: result.reason?.message || 'Unknown error' });
    }

    if (i + NICHE_BATCH_SIZE < nicheJobs.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const jobReferralCount = created.filter(p => p.type === 'job_referral').length;
  const thoughtLeadershipCount = created.filter(p => p.type === 'thought_leadership').length;
  const nicheCount = created.filter(p => p.type === 'niche_community').length;

  return Response.json({
    message: `Weekly auto-fill completed: ${created.length} posts generated for the week starting ${toDateStr(monday)}`,
    targetWeek: toDateStr(monday),
    totalCreated: created.length,
    jobReferralPosts: jobReferralCount,
    thoughtLeadershipPosts: thoughtLeadershipCount,
    nichePosts: nicheCount,
    usedPlannerStrategies: plannerStrategies.length > 0,
    newRolesOnMonday: newRoles.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});