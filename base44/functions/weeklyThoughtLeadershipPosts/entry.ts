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

const TOPIC_THEMES = [
  {
    theme: 'AI job displacement vs. job creation',
    angle: 'Use current data (2024-2025 reports from WEF, McKinsey, OECD) showing that while AI automates tasks, it also creates new roles. Discuss the net effect and what skills matter now.',
  },
  {
    theme: 'The rise of remote AI-assisted work',
    angle: 'Real stats on remote work adoption post-2023, how AI tools (Copilot, Claude, ChatGPT) are integrated into remote workflows. What changed in the last 12 months.',
  },
  {
    theme: 'Human-in-the-loop AI training as a real profession',
    angle: 'Explain how AI models are trained with human feedback (RLHF), the growing demand for domain experts to review and label AI outputs, and why this is a legitimate and growing field.',
  },
  {
    theme: 'Remote work in 2025: state of the market',
    angle: 'Current data: how many companies still hire remote, which industries are most remote-friendly, average salaries for remote roles vs. office roles globally.',
  },
  {
    theme: 'AI literacy as the most in-demand skill',
    angle: 'Data from LinkedIn, Indeed, and WEF showing AI-related skills are the fastest growing. What companies are actually paying for, and how to develop these skills.',
  },
  {
    theme: 'The gig economy meets AI: new opportunity landscape',
    angle: 'How platforms are using AI to match gig workers with projects. Data on freelance market size, growth of AI-adjacent gig roles, and what pays best.',
  },
  {
    theme: 'Robots, AI agents, and the human experts behind them',
    angle: 'How humanoid robots and autonomous AI agents still require vast amounts of human expert data to function. What this means for employment in specialized fields.',
  },
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
        notes: `[AUTO_GENERATED] platform:${platform} type:thought_leadership theme:${theme.theme}`,
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