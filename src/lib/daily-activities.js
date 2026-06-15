// Curated daily growth activities, organized by platform.
//
// Each activity is meant to be done by a thoughtful human, not automated.
// The intent is genuine relationship-building and visibility through real
// contribution — NOT performative engagement that gets accounts suspended.
//
// Keys (`key`) are stable identifiers stored in DailyActivity records.
// Edit copy freely; do NOT change keys unless you're prepared to migrate data.

export const DAILY_ACTIVITIES = {
  linkedin: {
    label: 'LinkedIn',
    accent: 'sky',
    intro: 'LinkedIn rewards substance and consistency. Aim for thoughtful contribution, not volume.',
    activities: [
      {
        key: 'li_read_feed_15',
        title: 'Spend 15 min reading your feed',
        detail: 'Actually read — don\'t scroll. Notice who in your niche is posting interesting things this week.',
        time: '15 min',
      },
      {
        key: 'li_reply_3_thoughtful',
        title: 'Leave 3 substantive comments',
        detail: 'On posts from people in AI / remote work. Each comment should add a perspective, ask a real question, or share specific experience — not "Great post!".',
        time: '15 min',
      },
      {
        key: 'li_engage_with_company',
        title: 'Engage with 1 industry account meaningfully',
        detail: 'Comment on a post from a company in your target space (an AI lab, a remote-work platform). Make it count — show you understood what they shared.',
        time: '5 min',
      },
      {
        key: 'li_dm_1_connection',
        title: 'Send 1 genuine DM',
        detail: 'To a recent thoughtful commenter, a connection you haven\'t spoken to in a while, or someone whose work you respect. No pitch — just a real message.',
        time: '5 min',
      },
      {
        key: 'li_share_others_post',
        title: 'Reshare or quote-share 1 great post',
        detail: 'Found something genuinely insightful in your feed? Share it with your own perspective added (2–3 sentences of why it matters).',
        time: '5 min',
      },
      {
        key: 'li_follow_5_builders',
        title: 'Follow 5 interesting people',
        detail: 'Builders, researchers, recruiters in adjacent fields. Pick people whose posts you\'d genuinely want in your feed — not just "people who follow back".',
        time: '5 min',
      },
      {
        key: 'li_review_profile',
        title: 'Weekly: review your profile headline + about',
        detail: 'Once a week, look at your profile as a stranger would. Is the headline still accurate to what you want to be known for? Tweak one line.',
        time: '5 min',
        weekly: true,
      },
    ],
  },

  twitter: {
    label: 'X / Twitter',
    accent: 'slate',
    intro: 'X is a conversation surface. Replies are worth more than posts here — that\'s where you get noticed.',
    activities: [
      {
        key: 'tw_reply_5_smart',
        title: 'Leave 5 thoughtful replies',
        detail: 'Reply to posts from accounts slightly bigger than yours in AI / remote-work. A sharp 1–2 sentence reply with a real point beats a generic post any day.',
        time: '15 min',
      },
      {
        key: 'tw_quote_tweet_1',
        title: 'Quote-tweet 1 great post',
        detail: 'Find one post worth amplifying. Add your take — agreement with extension, disagreement with reasoning, or a new angle.',
        time: '5 min',
      },
      {
        key: 'tw_list_check',
        title: 'Check your "must-read" list',
        detail: 'Maintain a list of 20–40 accounts whose posts you don\'t want to miss. Scan it daily — replies there are higher-leverage than the algorithmic feed.',
        time: '10 min',
      },
      {
        key: 'tw_one_original',
        title: 'Post 1 original observation',
        detail: 'One short post about something you noticed today — a pattern, a small insight, a question worth asking. Doesn\'t have to be profound. Has to be real.',
        time: '5 min',
      },
      {
        key: 'tw_follow_engagers',
        title: 'Follow 2-3 people who engaged this week',
        detail: 'Notice who\'s been replying to your posts or to posts you reply on. Follow the thoughtful ones.',
        time: '5 min',
      },
    ],
  },

  facebook: {
    label: 'Facebook',
    accent: 'indigo',
    intro: 'Facebook works through groups and personal connection. Public Pages alone rarely grow — community is the lever.',
    activities: [
      {
        key: 'fb_groups_2_comments',
        title: 'Comment in 2 niche groups',
        detail: 'Find 2-3 active groups around remote work / AI / your professional area. Contribute one substantive comment in each — answer a question, share experience.',
        time: '15 min',
      },
      {
        key: 'fb_share_to_groups',
        title: 'Share useful content to 1 relevant group',
        detail: 'Not a referral pitch — a genuinely useful link or perspective for that group. Posting in groups consistently is how Pages grow on FB.',
        time: '10 min',
      },
      {
        key: 'fb_reply_to_comments',
        title: 'Reply to everyone who commented on your posts',
        detail: 'FB rewards posts with active comment threads. Replying lifts the post in others\' feeds and starts real conversations.',
        time: '10 min',
      },
      {
        key: 'fb_react_meaningfully',
        title: 'React + comment on 5 friends/page posts',
        detail: 'A like alone barely shows in the algorithm. A reaction + a brief comment does. Pick posts worth engaging with.',
        time: '10 min',
      },
    ],
  },

  instagram: {
    label: 'Instagram',
    accent: 'pink',
    intro: 'Instagram rewards visual consistency and DM conversations. Growth here is slow — habit matters more than virality.',
    activities: [
      {
        key: 'ig_stories_1',
        title: 'Post 1 story',
        detail: 'Behind-the-scenes, a quick thought, a poll, a question sticker. Stories keep you visible to existing followers between feed posts.',
        time: '5 min',
      },
      {
        key: 'ig_engage_15_min',
        title: 'Spend 15 min engaging',
        detail: 'Comment on posts from 10 accounts in your niche. Real comments — questions, observations, additions to what they shared.',
        time: '15 min',
      },
      {
        key: 'ig_reply_dms',
        title: 'Reply to every DM',
        detail: 'IG\'s algorithm heavily favors accounts with active DM conversations. Reply to every message, even just an emoji thank-you.',
        time: '10 min',
      },
      {
        key: 'ig_save_post',
        title: 'Save someone else\'s great post',
        detail: 'Saves are a strong engagement signal. Save posts you actually want to revisit — it also trains your feed toward better content.',
        time: '5 min',
      },
      {
        key: 'ig_hashtag_explore',
        title: 'Spend 10 min in 2 niche hashtags',
        detail: 'Pick 2 hashtags that match your niche (#remotework, #aijobs, etc.). Leave thoughtful comments on the top posts.',
        time: '10 min',
      },
    ],
  },

  mastodon: {
    label: 'Mastodon',
    accent: 'violet',
    intro: 'Mastodon is community-first and allergic to marketing tone. Show up as a person, not a brand.',
    activities: [
      {
        key: 'ma_boost_3',
        title: 'Boost 3 posts you genuinely liked',
        detail: 'Mastodon has no algorithm — boosts are how good content travels. Boost what you actually found valuable, with no expectation of reciprocity.',
        time: '5 min',
      },
      {
        key: 'ma_reply_3',
        title: 'Reply to 3 posts thoughtfully',
        detail: 'Find posts in your interest tags. Replies on Mastodon should sound like a person at a meetup, not a brand. Be specific.',
        time: '10 min',
      },
      {
        key: 'ma_explore_hashtag',
        title: 'Explore 1 new hashtag deeply',
        detail: 'Mastodon discovery runs on hashtags. Spend 10 min in one — follow 3-5 accounts that look interesting, no pressure to reciprocate.',
        time: '10 min',
      },
      {
        key: 'ma_intro_post',
        title: 'Weekly: post about what you\'re working on',
        detail: 'Mastodon loves "what are you up to" posts. Once a week, share one specific thing you\'re building/learning/thinking about. No CTA.',
        time: '5 min',
        weekly: true,
      },
    ],
  },

  bluesky: {
    label: 'Bluesky',
    accent: 'cyan',
    intro: 'Bluesky users are tech-aware and dislike performative behavior. Be specific and a little blunt.',
    activities: [
      {
        key: 'bs_reply_5',
        title: 'Leave 5 substantive replies',
        detail: 'Bluesky\'s feed is small enough that real replies land. Find posts where you actually have something to say and say it.',
        time: '15 min',
      },
      {
        key: 'bs_repost_with_quote',
        title: 'Quote-post 1 thoughtful thing',
        detail: 'Repost with quote — add your perspective in 1-2 sentences. Pure reposts without commentary feel low-effort here.',
        time: '5 min',
      },
      {
        key: 'bs_curate_feed',
        title: 'Curate your feed',
        detail: 'Bluesky\'s custom feeds are powerful. Make sure you\'re subscribed to 2-3 feeds for your niche. Mute keywords/accounts that don\'t serve you.',
        time: '5 min',
      },
      {
        key: 'bs_starter_pack',
        title: 'Weekly: check a starter pack in your niche',
        detail: 'Find a starter pack for AI / remote work / your field. Follow 2-3 accounts from it that look interesting. Real ones, not "follow back" types.',
        time: '5 min',
        weekly: true,
      },
    ],
  },

  threads: {
    label: 'Threads',
    accent: 'rose',
    intro: 'Threads is conversational and casual. Quick exchanges work better than essays here.',
    activities: [
      {
        key: 'th_reply_5',
        title: 'Reply to 5 posts in your niche',
        detail: 'Threads has high reply visibility. A good reply on a popular post can get more eyes than a standalone post.',
        time: '10 min',
      },
      {
        key: 'th_quick_post',
        title: 'Post 1 short observation',
        detail: 'Something small — a one-line observation, a question, a quick take. Threads rewards low-friction posting.',
        time: '3 min',
      },
      {
        key: 'th_engage_with_meta',
        title: 'Engage with adjacent content',
        detail: 'Threads pulls cross-pollination from IG. If you have an IG presence, engage with their content here too.',
        time: '5 min',
      },
      {
        key: 'th_reply_chain',
        title: 'Start one conversation thread',
        detail: 'Reply to your own post with a follow-up thought, or answer a question someone asked you publicly. Conversations keep posts alive.',
        time: '5 min',
      },
    ],
  },
};

// Helper: today's date in user's local time as YYYY-MM-DD (avoids UTC drift).
export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: how many activities for a platform on a given day, excluding weekly-only.
export function dailyActivitiesFor(platform) {
  const entry = DAILY_ACTIVITIES[platform];
  if (!entry) return [];
  return entry.activities.filter(a => !a.weekly);
}
