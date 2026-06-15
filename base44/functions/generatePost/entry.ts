import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// generatePost — backend generation for the manual Post Generator.
// Produces ONE clean, in-limit, link-bearing post PER selected platform,
// using the same reliable approach as the autofill functions:
//   - the LLM writes TEXT ONLY (code owns the link)
//   - word-target + safety buffer instead of asking the LLM to count chars
//   - keep the best fitting candidate, trim at a sentence boundary on fallback
// ============================================================

const BRAND_CONTEXT = `
BRAND PHILOSOPHY (use to add depth, especially on LinkedIn):
- AI training is reshaping the economy — an entirely new labor sector.
- The more advanced AI becomes, the MORE it needs exceptional human experts.
- This is not job displacement — human expertise becomes the world's most valuable commodity.
- The company works with cutting-edge AI labs and top tech companies globally.
- "Humans first" — contributors are always prioritized.
`;

const STRATEGY_PLAYBOOK = {
  targeted_role: {
    label: 'Targeted Role',
    goal: 'Speak DIRECTLY to a specific professional. Use their job title, their language, their pain points.',
    hook_examples: [
      'Senior backend engineers: what if your expertise could train the next generation of AI models?',
      'Linguists — your skills are more valuable to AI labs than you think.',
      "If you're a data scientist tired of fighting for compute resources, this is worth 3 minutes.",
    ],
    structure: 'Hook targeting the role → What this role does in AI training → ~30 min interview → cert → hire → Roles → Referral link → 🛑 spam → CTA',
    tone: 'Direct, peer-to-peer, professional.',
  },
  storytelling: {
    label: 'Storytelling',
    goal: 'A short human story that makes the opportunity feel real. NOT a pitch.',
    hook_examples: [
      'Six months ago I almost passed on this. Glad I didn\'t.',
      'A friend of mine applied thinking it was too good to be true. She\'s now certified.',
      "I've referred 12 people this year. 4 got hired. Here's what I learned.",
    ],
    structure: 'Story hook (1–3 lines) → What happened → Bridge to the opportunity → Process info → Referral link → Roles (2–4) → CTA',
    tone: 'Warm, personal, honest. Reads like a message from a trusted contact.',
  },
  social_proof: {
    label: 'Social Proof',
    goal: 'Show real outcomes. Build credibility through results, not hype.',
    hook_examples: [
      'Over 300 professionals got certified through this program this year alone.',
      "The people who get hired here aren't lucky — they're prepared.",
      'AI labs are hiring across 40+ fields right now. The demand is real.',
    ],
    structure: 'Proof hook → Why this works → Who qualifies → Process → Roles (3–5) → Referral link → 🛑 spam → CTA',
    tone: 'Confident but grounded. Facts over hype.',
  },
  urgency: {
    label: 'Urgency',
    goal: 'Genuine helpful nudge — NOT fake panic. Roles filling, good timing.',
    hook_examples: [
      'If applying for something this week has been on your mind — this might be the one.',
      'Some of these roles have multiple openings filling fast. Honest, not panic.',
      'These are fresh — just added this week. Good time to move.',
    ],
    structure: 'Gentle urgency hook → Why now makes sense → 🔥 or 🆕 roles called out → Process reminder → Referral link → 🛑 spam → CTA',
    tone: 'Friendly nudge. Never manufactured panic.',
  },
  carousel_text: {
    label: 'Carousel / List',
    goal: 'Scannable, numbered or bulleted. Each point delivers value on its own.',
    hook_examples: [
      '5 things I wish I knew before applying to remote AI training roles:',
      'What makes a strong candidate for AI expert roles:',
      '3 reasons domain experts are the most in-demand people in AI right now:',
    ],
    structure: 'List hook → 3–7 numbered/bulleted points → Pivot to open roles → Referral link → 🛑 spam → CTA',
    tone: 'Clear, concise, educational.',
  },
  niche_community: {
    label: 'Niche Community',
    goal: 'Speak EXCLUSIVELY to one professional tribe. Insider language.',
    hook_examples: [
      'Fellow translators: AI needs you more than most people realize.',
      "If you've spent years mastering audio production — AI labs are literally paying for that expertise.",
      'The ML community already knows this — your domain skills have a new market.',
    ],
    structure: 'Tribe-specific hook → Why THIS community matters to AI → Matching roles → Process → Referral link → 🛑 spam → Niche hashtags',
    tone: 'Insider, authentic, zero corporate tone.',
  },
  new_roles_spotlight: {
    label: 'New Roles Spotlight',
    goal: 'Highlight freshly added roles. Urgency from freshness, not fake panic.',
    hook_examples: [
      'New roles just dropped — and a few of these are rare.',
      "If you've been waiting for the right opening — some just went live.",
      'Fresh listings this week. Worth a look if any match your field.',
    ],
    structure: 'Freshness hook → 🆕 roles list → Why apply now → Process → Referral link → 🛑 spam → CTA',
    tone: 'Timely, helpful, genuine.',
  },
  high_demand_spotlight: {
    label: 'High Demand Spotlight',
    goal: 'Showcase roles where hiring demand is highest right now. The signal is real demand, not manufactured urgency.',
    hook_examples: [
      'These are the roles companies are competing hardest to fill right now.',
      'A few roles where the demand has been outpacing supply for weeks.',
      'If your skills match any of these, you have leverage right now.',
    ],
    structure: 'Demand hook → 🔥 high-demand roles list → Why these specifically → Process → Referral link → 🛑 spam → CTA',
    tone: 'Confident, market-aware, professional — not hypey.',
  },
  top_pay_spotlight: {
    label: 'Top Pay Spotlight',
    goal: 'Highlight roles offering the highest compensation. Lead with value, not greed — pay reflects demand and expertise.',
    hook_examples: [
      'A look at the top-paying roles currently open — pay reflects skill.',
      'These remote roles are paying real money for the right expertise.',
      'If pay is a factor in your search, these are worth a look.',
    ],
    structure: 'Compensation hook → roles list with pay context → Why these companies pay this → Process → Referral link → 🛑 spam → CTA',
    tone: 'Matter-of-fact, professional, values-driven. No hustle culture.',
  },
};

const PLATFORM_TONES = {
  linkedin: 'Professional, insightful, story-driven. Industry language.',
  twitter: 'Punchy, hook immediately. One sharp hook only.',
  facebook: 'Friendly, community-focused, conversational. Emojis welcome.',
  instagram: 'Visual-first, warm, inspiring. Line breaks and emojis.',
  mastodon: 'Open, community-driven, authentic. No algorithm.',
  bluesky: 'Conversational, tech-savvy, authentic. No corporate speak.',
  threads: 'Casual, conversational, Instagram-like. Friendly and approachable.',
};

const CHAR_LIMITS = {
  linkedin: 3000,
  twitter: 280,
  facebook: 500,
  instagram: 500,
  mastodon: 500,
  bluesky: 300,
  threads: 500,
};

// Platforms where hashtags don't belong / no room.
const NO_HASHTAG = ['twitter', 'reddit', 'discord'];

// ── Link policy per platform ─────────────────────────────────────────────────
// LINK_OK: link works well, post includes the full referral URL.
// NO_LINK_IN_POST: algorithm penalizes outbound links (or the platform doesn't
//   render them at all, like Instagram). Use a "Comment Remote" CTA instead;
//   the DM responder handles the follow-up.
const LINK_OK_PLATFORMS = ['linkedin', 'mastodon', 'bluesky'];
const NO_LINK_IN_POST = ['twitter', 'facebook', 'instagram', 'threads'];
function platformAllowsLink(platform) {
  return LINK_OK_PLATFORMS.includes(platform);
}

// ── CTA pool ─────────────────────────────────────────────────────────────────
// Curated phrases used in place of the link on link-restrictive platforms.
// All of them: (a) contain the keyword "Remote" (case-insensitive match by the
// DM responder), and (b) clearly state that commenting will get them the link.
// Edit freely — pickCTA chooses randomly each time.
const CTA_POOL = [
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
  'Comment "Remote" and I\'ll DM you the openings worth your time 🚀',
  'Reply "Remote" — I\'ll DM you what you need to know to apply 🚀',
  'Comment "Remote" if you want me to DM you the active openings 🚀',
];

function pickCTA() {
  return CTA_POOL[Math.floor(Math.random() * CTA_POOL.length)];
}

// Sanity check that a custom CTA contains the trigger word so the DM responder
// will actually fire when people use it. Case-insensitive whole-word match.
function ctaHasTrigger(text) {
  return /\bremote\b/i.test(text || '');
}

// ── thought-leadership prompt (link-free, theme invented fresh by the AI) ─────
function buildThoughtLeadershipPrompt({ platform, personalNote }) {
  const tone = PLATFORM_TONES[platform] || 'Informative, engaging.';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `You are writing a THOUGHT LEADERSHIP post for ${platform.toUpperCase()}. First person, insightful, credible. This is NOT a job ad and has NO link.

DATE CONTEXT: ${currentDate}
PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}

PICK A FRESH ANGLE YOURSELF (do not reuse an obvious cliché). Choose ONE specific, current insight about AI and/or remote work — for example (invent your own, don't copy these): how AI is creating new categories of work, the rise of human-in-the-loop AI training, remote-work market shifts, AI literacy as a top skill, why advanced AI needs more human experts, the economics of distributed talent. Make it feel timely and genuinely interesting.

WHAT TO WRITE:
- An educational, opinionated take on the angle you chose.
- Ground it in plausible recent (2024–2025) industry reasoning or data (WEF, McKinsey, LinkedIn, OECD-style). Don't fabricate precise fake statistics — speak in credible ranges/trends.
- Connect briefly to first-hand experience working in AI — but do NOT name any company.
- End with an open question or invitation to discuss (except on very short platforms).

STRICT RULES:
- NO job postings, NO referral links, NO URLs, NO "we're hiring".
- NEVER name "micro1" or any specific company.
- NO fake urgency, NO corporate buzzword soup. Sound like a thoughtful human.
${personalNote ? `\nPERSONAL NOTE TO WEAVE IN: ${personalNote}` : ''}

Generate ONLY the post text. No labels, no "Post:" prefix, no link.`;
}

// Link-free generation with the same reliable length control as generateReferralPost.
async function generatePlainPost(db, basePrompt, limit, wantHashtags) {
  const BUFFER = 10;
  const budget = Math.max(40, limit - BUFFER);
  const approxWords = Math.max(8, Math.floor(budget / 6));

  const writingRules = (extra = '') => `${basePrompt}

OUTPUT RULES (follow exactly):
- Length: about ${approxWords} words, and NEVER more than ${budget} characters. Aim a little under.
- Make it a COMPLETE thought with a real ending — never trail off.
${wantHashtags ? '- End with 3–5 relevant hashtags.' : '- Do NOT add hashtags.'}
- Do NOT include any URL or link.
- No "Post:" prefix, no labels — just the post text.${extra}`;

  let best = null, shortest = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const raw = await db.integrations.Core.InvokeLLM({
      prompt: attempt === 1
        ? writingRules()
        : writingRules(`\n- ⚠️ Your previous attempt was too long. Write a SHORTER, complete post — under ${budget} characters.`),
    });
    const text = stripLinkAndLabels(raw);
    if (shortest === null || text.length < shortest.length) shortest = text;
    if (text.length <= budget) { best = text; break; }
  }
  let finalText = best !== null ? best : cleanTrim(shortest || '', budget);
  if (finalText.length > budget) finalText = cleanTrim(finalText, budget);
  return finalText;
}

// ── prompt builder (per platform) ─────────────────────────────────────────────
function buildPrompt({ strategy, rolesEnriched, rolesOpeningsContext, personalNote, platform }) {
  const play = STRATEGY_PLAYBOOK[strategy] || STRATEGY_PLAYBOOK['targeted_role'];
  const isLinkedIn = platform === 'linkedin';
  const tone = PLATFORM_TONES[platform] || 'Professional and engaging.';

  const persona = isLinkedIn
    ? `PERSONA: A professional in the AI industry sharing a remote opportunity. First person, genuine and warm.
${BRAND_CONTEXT}
IMPORTANT: Do NOT name micro1 or any specific company — say "leading AI companies", "top AI labs", etc.`
    : `PERSONA: A remote professional sharing a useful opportunity they genuinely found valuable. First person, peer-to-peer.
CRITICAL: NEVER name micro1 or any specific company. Say "top AI companies", "leading AI labs", "AI-driven platforms", etc.
CRITICAL: Do NOT tell any personal story about yourself (job title, tenure, dates, promotions). Just share the opportunity.`;

  return `You are writing a social media post. Sound fully human — specific, varied, genuine. NOT a bot, NOT a recruiter template.

${persona}

⚠️ CRITICAL: Do NOT write any company name. Refer to the employer only as "leading AI companies" / "top AI labs".

PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGY: ${play.label.toUpperCase()}
GOAL: ${play.goal}

EXAMPLE HOOKS (use the energy, NOT the exact words — write your own):
${play.hook_examples.map(h => `• "${h}"`).join('\n')}

RECOMMENDED STRUCTURE: ${play.structure}
TONE: ${play.tone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFERRAL LINK: added automatically after your text — do NOT write any URL yourself.

ROLES (pick 3–6 most relevant — don't dump the full list):
${rolesEnriched}${rolesOpeningsContext}
${personalNote ? `\nPERSONAL NOTE TO WEAVE IN: ${personalNote}` : ''}

MANDATORY ELEMENTS (work in naturally, only if they fit the length):
- 🛑 Check spam folder after applying 🛑
- ~30 min interview → certification → possible hire

ABSOLUTE RULES:
- NEVER open with "📍 [Month] - Remote Opportunities at..." — that template is banned.
- Each generation must feel DISTINCT — different hook, angle, energy.
- NO "earn money", "make money", "easy income", "side hustle", "get paid fast".
- NO fake urgency or manufactured hype.

Generate ONLY the post text. No labels, no "Post:" prefix, no link, no explanations.`;
}

// ── reliable generation helpers (same approach as autofill) ──────────────────
function cleanTrim(text, maxChars) {
  if (text.length <= maxChars) return text.trim();
  let slice = text.slice(0, maxChars);
  const lastSentence = Math.max(
    slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'), slice.lastIndexOf('!\n'), slice.lastIndexOf('?\n'),
    slice.lastIndexOf('\n')
  );
  if (lastSentence > maxChars * 0.5) slice = slice.slice(0, lastSentence + 1);
  else { const lastSpace = slice.lastIndexOf(' '); if (lastSpace > 0) slice = slice.slice(0, lastSpace); }
  return slice.trim();
}
function stripLinkAndLabels(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s*(post|content|output)\s*:\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
// Insert text after the first 1-2 sentences of body, so it's visible above the
// "see more" fold on every platform. Falls back to prepend if no sentence break
// is found within the first ~120 chars.
function injectAfterHook(body, insert) {
  const probe = body.slice(0, 180);
  const re = /([.!?])(\s+|\n)/g;
  let lastIdx = -1;
  let match;
  while ((match = re.exec(probe)) !== null) {
    // accept the first sentence end at >=40 chars (avoids splitting on "Mr." etc.
    // by ignoring very early matches), or the second sentence end if we have one
    if (match.index >= 40) { lastIdx = match.index + 1; break; }
    lastIdx = match.index + 1;
  }
  if (lastIdx > 0 && lastIdx < body.length) {
    return `${body.slice(0, lastIdx).trim()}\n\n${insert}\n\n${body.slice(lastIdx).trim()}`;
  }
  return `${insert}\n\n${body}`;
}

async function generateReferralPost(db, basePrompt, limit, referralLink, wantHashtags, options = {}) {
  // options.mode: 'link' (default) appends the referral link;
  //               'cta' inserts the CTA after the hook (no link).
  // options.cta: a specific CTA string to use in 'cta' mode (overrides random pick).
  const mode = options.mode === 'cta' ? 'cta' : 'link';
  const tail = mode === 'link' ? referralLink : (options.cta || pickCTA());

  const BUFFER = 10;
  // Tail (link or CTA) eats budget either way; reserve room for it + separators.
  const tailBudget = tail.length + 4;
  const budget = Math.max(40, limit - tailBudget - BUFFER);
  const approxWords = Math.max(8, Math.floor(budget / 6));

  const writingRules = (extra = '') => `${basePrompt}

OUTPUT RULES (follow exactly):
- Write the POST TEXT ONLY. Do NOT write any URL, link, or "comment X for the link" instruction — those are added automatically.
- Length: about ${approxWords} words, and NEVER more than ${budget} characters. Aim a little under.
- Make it a COMPLETE thought with a real ending — never trail off.
${wantHashtags ? '- End with 3–5 relevant hashtags.' : '- Do NOT add hashtags.'}
- No "Post:" prefix, no labels — just the post text.${extra}`;

  let best = null, shortest = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const raw = await db.integrations.Core.InvokeLLM({
      prompt: attempt === 1
        ? writingRules()
        : writingRules(`\n- ⚠️ Your previous attempt was too long. Write a SHORTER, complete post — under ${budget} characters. Cut detail, keep the hook and the point.`),
    });
    const text = stripLinkAndLabels(raw);
    if (shortest === null || text.length < shortest.length) shortest = text;
    if (text.length <= budget) { best = text; break; }
  }
  let bodyText = best !== null ? best : cleanTrim(shortest || '', budget);
  if (bodyText.length > budget) bodyText = cleanTrim(bodyText, budget);

  // Compose: link mode appends; CTA mode inserts after the hook for visibility.
  if (mode === 'link') return `${bodyText}\n\n${tail}`;
  return injectAfterHook(bodyText, tail);
}

// ── main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const db = base44.asServiceRole;

    const {
      strategy,
      platforms,
      roleTitles = [],
      personalNote = '',
      referralLink,
      // Optional manual override of the auto-picked CTA. If provided, used
      // verbatim on link-restrictive platforms (must contain "Remote").
      customCta = '',
      // 'cta-only' mode: generate JUST a CTA suggestion (no full post) and
      // return it — used by the "regenerate with AI" button in the UI.
      ctaMode = '',
    } = await req.json();

    // ── CTA-only request: return a single AI-generated CTA suggestion ─────────
    if (ctaMode === 'suggest') {
      const target = (platforms && platforms[0]) || 'instagram';
      const prompt = `Write ONE short call-to-action sentence for a ${target} post about a remote job opportunity.

REQUIREMENTS:
- MUST contain the word "Remote" (used as the trigger word for an automated DM responder)
- MUST clearly state that the reader will receive a DM with the link / role list when they comment
- Friendly, energetic, NOT corporate or salesy. Sound like a real person.
- Max 140 characters. One sentence.
- May include 1 emoji (rocket 🚀, sparkle ✨, eyes 👀, point 👇 — your choice)
- Do NOT write any URL. Do NOT explain. Just the CTA sentence.

Return ONLY the CTA text. Nothing else.`;
      try {
        const raw = await db.integrations.Core.InvokeLLM({ prompt });
        const text = stripLinkAndLabels(raw).replace(/^["']|["']$/g, '').trim();
        if (!ctaHasTrigger(text)) {
          // Safety net: regenerate once if the LLM somehow omitted "Remote"
          return Response.json({ success: true, cta: pickCTA(), source: 'fallback' });
        }
        return Response.json({ success: true, cta: text, source: 'ai' });
      } catch (e) {
        return Response.json({ success: true, cta: pickCTA(), source: 'fallback', warning: e.message });
      }
    }

    if (!strategy) return Response.json({ error: 'strategy is required' }, { status: 400 });
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return Response.json({ error: 'At least one platform is required' }, { status: 400 });
    }

    // ── Thought-leadership: link-free, theme invented by the AI, no roles needed ──
    if (strategy === 'thought_leadership') {
      const results = await Promise.all(platforms.map(async (platform) => {
        const limit = CHAR_LIMITS[platform] || 500;
        const wantHashtags = !NO_HASHTAG.includes(platform);
        const basePrompt = buildThoughtLeadershipPrompt({ platform, personalNote });
        try {
          const content = await generatePlainPost(db, basePrompt, limit, wantHashtags);
          return { platform, content, strategy };
        } catch (e) {
          return { platform, error: e.message };
        }
      }));
      return Response.json({ success: true, posts: results });
    }

    // ── Referral strategies: require a valid link + active roles ──────────────
    if (!referralLink || !/^https?:\/\//.test(referralLink)) {
      return Response.json({ error: 'A valid referral link (http/https) is required' }, { status: 400 });
    }

    // Pull enriched role data from the DB for the selected titles.
    const allRoles = await db.entities.OpenRole.filter({ is_active: true });
    const selected = roleTitles.length > 0
      ? allRoles.filter(r => roleTitles.includes(r.title))
      : allRoles;

    if (selected.length === 0) {
      return Response.json({ error: 'No active roles available to generate from.' }, { status: 400 });
    }

    const rolesEnriched = selected.slice(0, 20).map(r => {
      let line = `- ${r.title}`;
      if (r.is_new) line += ' 🆕';
      if (r.is_high_demand) line += ' 🔥';
      if (r.pay_rate) line += ` (${r.pay_rate})`;
      if (r.required_skills) line += ` | skills: ${r.required_skills}`;
      return line;
    }).join('\n');

    const rolesOpeningsContext = (strategy === 'urgency' || strategy === 'niche_community')
      ? (() => {
          const withOpenings = selected.filter(r => r.openings > 0)
            .map(r => `${r.title} (${r.openings} ${r.openings === 1 ? 'opening' : 'openings'})`).join(', ');
          return withOpenings ? `\nVACANCY DATA (use naturally for urgency): ${withOpenings}` : '';
        })()
      : '';

    // Validate a custom CTA if provided — must contain the "Remote" trigger
    // word, otherwise the DM responder won't fire on it. We fall back to pool
    // pick on a per-platform basis if the user's custom CTA is invalid.
    const safeCustomCta = ctaHasTrigger(customCta) ? customCta : '';

    // Generate one post per platform (in parallel — small N, safe).
    const results = await Promise.all(platforms.map(async (platform) => {
      const limit = CHAR_LIMITS[platform] || 500;
      const wantHashtags = !NO_HASHTAG.includes(platform);
      const basePrompt = buildPrompt({ strategy, rolesEnriched, rolesOpeningsContext, personalNote, platform });

      // CTA mode per platform: link-friendly platforms embed the URL;
      // link-restrictive ones get the "Comment Remote" CTA instead.
      const usesLink = platformAllowsLink(platform);
      const genOptions = usesLink
        ? { mode: 'link' }
        : { mode: 'cta', cta: safeCustomCta || undefined }; // undefined → generator picks from pool

      try {
        const content = await generateReferralPost(db, basePrompt, limit, referralLink, wantHashtags, genOptions);
        return { platform, content, strategy, cta_mode: usesLink ? 'link' : 'cta' };
      } catch (e) {
        return { platform, error: e.message };
      }
    }));

    return Response.json({ success: true, posts: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
