import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs on Tuesdays, Thursdays, and Sundays (scheduled automation).
 * Generates NON-JOB thought leadership posts about AI and remote work
 * with real, current data and insights — across all non-LinkedIn platforms.
 *
 * These posts educate, inform, and build trust with the audience,
 * NOT recruiting posts.
 */

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'instagram',
  'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const PLATFORM_TONES = {
  twitter:       'Punchy, hook immediately. Max 280 characters. Include 1-2 hashtags. Real stat or insight as the hook.',
  instagram:     'Visual-first, warm and educational. Use line breaks, emojis, and a clear takeaway. Conversational but smart.',
  weworkremotely:'Remote-first, thoughtful. Focus on the future of remote work trends with data. Keep scannable.',
  wellfound:     'Startup-minded, forward-thinking. Connect AI/remote trends to startup culture and talent strategy.',
  remotive:      'Community-driven, curated. Speak to remote work lifestyle and the real impact of AI on professionals.',
  flexjobs:      'Professional, serious tone. Practical insights on how AI and remote work affect career decisions.',
  remoteok:      'Digital nomad audience. Real data on location-independent work in the AI era. Honest and direct.',
  reddit:        'Conversational, no-BS, genuinely curious. Share a real insight or data point, invite discussion. NOT an ad at all.',
  discord:       'Ultra-casual, direct, insider tone. Short. Emojis. Start a convo. Be a real person, not a brand account.',
};

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

function getTodayTheme() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return TOPIC_THEMES[dayOfYear % TOPIC_THEMES.length];
}

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function buildThoughtLeadershipPrompt(platform, theme, angle, dayLabel, plannerContext = '') {
  const tone = PLATFORM_TONES[platform] || 'Informative, engaging, professional.';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

  const platformRules = platform === 'twitter'
    ? 'Max 280 chars. One punchy stat or insight as the hook. 1–2 hashtags.'
    : platform === 'reddit'
    ? 'Open with a real observation or question. Invite genuine discussion. No hashtags. Zero marketing feel.'
    : platform === 'discord'
    ? 'Super short. Start with the stat or question. Ultra-casual. Feel like a real person starting a convo.'
    : platform === 'instagram'
    ? 'Line breaks between each idea. Emojis where meaningful. Save-worthy, educational format.'
    : '';

  return `You are writing a thought leadership post for ${platform.toUpperCase()}. You are a remote professional working in the AI industry. Write in first person — insightful, credible, genuinely curious. This is NOT a job ad.

TODAY: ${currentDate} (${dayLabel})
PLATFORM: ${platform.toUpperCase()}
PLATFORM TONE: ${tone}

TOPIC: ${theme}
ANGLE: ${angle}

WHAT TO WRITE:
- An educational post about the topic — something people actually want to read and share.
- Use real data points from 2024–2025 (WEF, McKinsey, LinkedIn, OECD, Statista — cite them naturally in the text, not as a list).
- Connect to personal experience working remotely in AI — but do NOT name any specific company.
- End with a genuine open question or discussion prompt (except Twitter).
- 5–8 relevant hashtags at the end (except Reddit/Discord).

STRICT RULES:
- NO job postings, referral links, or "we're hiring" of any kind.
- NO mention of "micro1" or any specific company name.
- NO fake urgency, NO corporate speak, NO "earn money" language.
- Stats woven naturally into the narrative — not dumped as a bullet list.
- Sound like a thoughtful human, not a brand account.
${platformRules ? '\nPLATFORM-SPECIFIC: ' + platformRules : ''}

Generate ONLY the post content. No labels, no "Post:" prefix.
${plannerContext ? '\n\nINTERNAL STRATEGY GUIDANCE (never surface in post):\n' + plannerContext : ''}`;
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

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 2=Tue, 4=Thu
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayLabel = DAY_NAMES[dayOfWeek];

  const theme = getTodayTheme();
  const scheduledDate = today.toISOString().split('T')[0];

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

  const created = [];
  const errors = [];

  for (const platform of NON_LINKEDIN_PLATFORMS) {
    try {
      const content = await db.integrations.Core.InvokeLLM({
        prompt: buildThoughtLeadershipPrompt(platform, theme.theme, theme.angle, dayLabel, plannerContext),
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });

      const scheduledTime = plannerPostingTimes[platform] || '11:00';

      const post = await db.entities.GeneratedPost.create({
        title: `${dayLabel} Thought Leadership — ${platform} — ${scheduledDate}`,
        content,
        strategy: 'storytelling',
        target_roles: 'general audience',
        status: 'scheduled',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        notes: `[AUTO_GENERATED] platform:${platform} type:thought_leadership category:${theme.category} theme:${theme.theme}`,
      });

      created.push({ postId: post.id, platform, scheduledDate, theme: theme.theme });
    } catch (err) {
      errors.push({ platform, error: err.message });
    }
  }

  // Also check for NEW roles and generate a short "new roles" post for this day's platforms too
  const newRoles = await db.entities.OpenRole.filter({ is_active: true, is_new: true });

  if (newRoles.length > 0) {
    const newRolesResult = await db.functions.invoke('generateCampaignPosts', {
      roles: newRoles.map(r => ({
        title: r.title,
        is_new: true,
        required_skills: r.required_skills || '',
        pay_rate: r.pay_rate || '',
        openings: r.openings || 0,
      })),
      platforms: NON_LINKEDIN_PLATFORMS,
      scheduledDates: NON_LINKEDIN_PLATFORMS.map(() => scheduledDate),
      scheduledTime: '14:00',
      titlePrefix: `${dayLabel} New Roles — ${scheduledDate}`,
      highlightNew: true,
    });
    created.push({ newRolesPosts: newRolesResult?.data?.total || 0 });
  }

  return Response.json({
    message: `${dayLabel} thought leadership posts generated (+ ${newRoles.length} NEW role posts)`,
    theme: theme.theme,
    thoughtLeadershipCreated: created.filter(c => !c.newRolesPosts).length,
    newRolePostsCreated: newRoles.length > 0 ? (created.find(c => c.newRolesPosts)?.newRolesPosts || 0) : 0,
    errors,
  });
});