import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// ── Utility: human-like random delay ─────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Wide-variance human delay: seconds range + random extra ms to avoid integer patterns
const randMs = (minSec, maxSec) => {
  const base = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
  const jitter = Math.floor(Math.random() * 800); // sub-second jitter
  return base + jitter;
};

// ── Niche hashtags & keywords ─────────────────────────────────────────────────
const NICHE_HASHTAGS = [
  'remotework', 'remotejobs', 'hiringnow', 'freelance', 'freelancelife',
  'digitalnomad', 'workfromhome', 'jobsearch', 'recruiting', 'techjobs',
  'aijobs', 'remotehiring', 'careergrowth', 'entrepreneurship', 'startups',
  'futureofwork', 'wfh', 'remotelife', 'jobopportunity', 'aiwork',
];

const NICHE_KEYWORDS = [
  'remote work', 'remote job', 'hiring', 'freelance', 'work from home',
  'digital nomad', 'job opportunity', 'AI jobs', 'remote team', 'recruiting',
];

// Pick random items from array
function pickRandom(arr, n = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return n === 1 ? shuffled[0] : shuffled.slice(0, n);
}

// Check if content is relevant to our niche
function isRelevantContent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  // Reject off-niche / potentially political / spam
  const blocklist = ['politic', 'election', 'war', 'violence', 'porn', 'casino', 'crypto pump', 'nft drop', 'onlyfans'];
  if (blocklist.some(w => lower.includes(w))) return false;
  return NICHE_KEYWORDS.some(kw => lower.includes(kw));
}

// ── LLM: generate a context-aware professional comment ────────────────────────
async function generateComment(postText, platform) {
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
  const platformNote = platform === 'mastodon'
    ? 'Mastodon community (open-source, decentralized, thoughtful tone)'
    : 'Bluesky community (tech-savvy, direct, authentic tone)';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional community manager engaging authentically on ${platformNote}. 
You write short, genuine, value-adding comments on posts about remote work, hiring, freelancing, AI, and career growth.
Rules:
- 1-3 sentences max, conversational, never generic praise
- Add a real insight, tip, or thoughtful question
- Never mention your own product, brand, or referral links
- Never use placeholder text or templates
- Sound like a real person, not a bot
- Avoid exclamation spam, stay measured and professional`,
      },
      {
        role: 'user',
        content: `Write a genuine reply to this post: "${postText.slice(0, 400)}"`,
      },
    ],
    max_tokens: 120,
    temperature: 0.85,
  });
  return completion.choices[0].message.content.trim();
}

// ── MASTODON ──────────────────────────────────────────────────────────────────
async function runMastodonSession(base44, log, hashtags = NICHE_HASHTAGS) {
  const instanceUrl = (Deno.env.get('MASTODON_INSTANCE_URL') || '').replace(/\/+$/, '');
  const token = Deno.env.get('MASTODON_ACCESS_TOKEN');
  if (!instanceUrl || !token) { log.warnings = 'Mastodon credentials missing'; return log; }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Session limits — deliberately low and varied to mimic casual browsing
  const maxLikes = Math.floor(Math.random() * 12) + 5;      // 5-17 per session
  const maxComments = Math.floor(Math.random() * 2) + 1;    // 1-3 per session
  const maxFollows = Math.floor(Math.random() * 5) + 2;     // 2-7 per session

  // Pick 2-3 random hashtags to search (from planner-recommended or default list)
  const selectedHashtags = pickRandom(hashtags, Math.floor(Math.random() * 2) + 2);
  const seenPostIds = new Set();
  const seenAccountIds = new Set();

  for (const tag of selectedHashtags) {
    if (log.likes_given >= maxLikes && log.follows_made >= maxFollows) break;

    let res, posts;
    try {
      res = await fetch(`${instanceUrl}/api/v1/timelines/tag/${tag}?limit=20`, { headers });
      if (res.status === 429) { log.warnings = 'Rate limited by Mastodon'; return log; }
      if (!res.ok) continue;
      posts = await res.json();
    } catch { continue; }

    log.posts_found += posts.length;

    // Shuffle posts to avoid predictable patterns
    const shuffledPosts = posts.sort(() => Math.random() - 0.5);

    for (const post of shuffledPosts) {
      if (seenPostIds.has(post.id)) continue;
      seenPostIds.add(post.id);

      const content = post.content?.replace(/<[^>]+>/g, '') || '';
      if (!isRelevantContent(content) && !NICHE_KEYWORDS.some(k => (post.tags || []).some(t => t.name?.includes(k.replace(' ', ''))))) continue;
      // Skip our own posts
      if (post.account?.acct?.includes(instanceUrl.replace('https://', ''))) continue;

      // Like the post — simulate reading the post first, then reacting
      if (log.likes_given < maxLikes && !post.favourited) {
        await sleep(randMs(12, 40)); // reading time before liking
        try {
          const likeRes = await fetch(`${instanceUrl}/api/v1/statuses/${post.id}/favourite`, { method: 'POST', headers });
          if (likeRes.status === 429) { log.warnings = 'Rate limited during like'; return log; }
          if (likeRes.ok) log.likes_given++;
        } catch { /* continue */ }
      }

      // Maybe comment — very rare, needs "reading + composing" time
      if (log.comments_posted < maxComments && content.length > 80 && Math.random() < 0.10) {
        await sleep(randMs(45, 120)); // simulate reading + typing
        try {
          const comment = await generateComment(content, 'mastodon');
          const replyRes = await fetch(`${instanceUrl}/api/v1/statuses`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ status: comment, in_reply_to_id: post.id, visibility: 'public' }),
          });
          if (replyRes.status === 429) { log.warnings = 'Rate limited during comment'; break; }
          if (replyRes.ok) log.comments_posted++;
        } catch { /* continue */ }
      }

      // Maybe follow the account — rarest, simulate going to profile first
      const accountId = post.account?.id;
      if (accountId && !seenAccountIds.has(accountId) && log.follows_made < maxFollows && !post.account?.following && Math.random() < 0.12) {
        seenAccountIds.add(accountId);
        await sleep(randMs(20, 60)); // simulate viewing profile
        try {
          const followRes = await fetch(`${instanceUrl}/api/v1/accounts/${accountId}/follow`, { method: 'POST', headers });
          if (followRes.status === 429) { log.warnings = 'Rate limited during follow'; break; }
          if (followRes.ok) log.follows_made++;
        } catch { /* continue */ }
      }

      // Break if session limits hit
      if (log.likes_given >= maxLikes && log.follows_made >= maxFollows && log.comments_posted >= maxComments) break;
    }

    // Pause between hashtags — simulate switching context / reading feed
    await sleep(randMs(40, 120));
  }

  // Unfollow accounts that didn't follow back (tracked in a separate daily logic via log — keep simple for now)
  // This would require storing follow history — skipped for first iteration, to be added with CommunityEngagementLog queries

  log.status = 'success';
  return log;
}

// ── BLUESKY ───────────────────────────────────────────────────────────────────
async function runBlueskySession(base44, log, hashtags = NICHE_HASHTAGS) {
  const handle = Deno.env.get('BLUESKY_HANDLE');
  const appPassword = Deno.env.get('BLUESKY_APP_PASSWORD');
  if (!handle || !appPassword) { log.warnings = 'Bluesky credentials missing'; return log; }

  // Authenticate
  let accessJwt, did;
  try {
    const authRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });
    if (!authRes.ok) { log.warnings = `Bluesky auth failed: ${authRes.status}`; return log; }
    const auth = await authRes.json();
    accessJwt = auth.accessJwt;
    did = auth.did;
  } catch (e) { log.warnings = `Bluesky auth error: ${e.message}`; return log; }

  const headers = { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' };

  const maxLikes = Math.floor(Math.random() * 12) + 5;     // 5-17 per session
  const maxComments = Math.floor(Math.random() * 2) + 1;   // 1-3 per session
  const maxFollows = Math.floor(Math.random() * 5) + 2;    // 2-7 per session

  const selectedBskyHashtags = pickRandom(hashtags, Math.floor(Math.random() * 2) + 2);
  const seenUris = new Set();
  const seenDids = new Set();

  for (const tag of selectedBskyHashtags) {
    if (log.likes_given >= maxLikes && log.follows_made >= maxFollows) break;

    let posts = [];
    try {
      const searchRes = await fetch(
        `https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=%23${tag}&limit=20`,
        { headers }
      );
      if (searchRes.status === 429) { log.warnings = 'Rate limited by Bluesky'; return log; }
      if (!searchRes.ok) continue;
      const data = await searchRes.json();
      posts = data.posts || [];
    } catch { continue; }

    log.posts_found += posts.length;
    const shuffledPosts = posts.sort(() => Math.random() - 0.5);

    for (const post of shuffledPosts) {
      const uri = post.uri;
      if (seenUris.has(uri)) continue;
      seenUris.add(uri);

      const text = post.record?.text || '';
      if (!isRelevantContent(text) && !hashtags.some(h => text.toLowerCase().includes(h))) continue;
      // Skip own posts
      if (post.author?.did === did) continue;

      const cid = post.cid;

      // Like — simulate reading before reacting
      if (log.likes_given < maxLikes && !post.viewer?.like) {
        await sleep(randMs(12, 40));
        try {
          const likeRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              repo: did,
              collection: 'app.bsky.feed.like',
              record: { $type: 'app.bsky.feed.like', subject: { uri, cid }, createdAt: new Date().toISOString() },
            }),
          });
          if (likeRes.status === 429) { log.warnings = 'Rate limited during Bluesky like'; return log; }
          if (likeRes.ok) log.likes_given++;
        } catch { /* continue */ }
      }

      // Comment — very rare, with reading + typing simulation
      if (log.comments_posted < maxComments && text.length > 80 && Math.random() < 0.10) {
        await sleep(randMs(45, 120));
        try {
          const comment = await generateComment(text, 'bluesky');
          const replyRef = { root: { uri, cid }, parent: { uri, cid } };
          const replyRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              repo: did,
              collection: 'app.bsky.feed.post',
              record: {
                $type: 'app.bsky.feed.post',
                text: comment.slice(0, 300),
                reply: replyRef,
                createdAt: new Date().toISOString(),
              },
            }),
          });
          if (replyRes.status === 429) { log.warnings = 'Rate limited during Bluesky comment'; break; }
          if (replyRes.ok) log.comments_posted++;
        } catch { /* continue */ }
      }

      // Follow author — simulate visiting profile
      const authorDid = post.author?.did;
      if (authorDid && !seenDids.has(authorDid) && log.follows_made < maxFollows && !post.author?.viewer?.following && Math.random() < 0.12) {
        seenDids.add(authorDid);
        await sleep(randMs(20, 60));
        try {
          const followRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              repo: did,
              collection: 'app.bsky.graph.follow',
              record: { $type: 'app.bsky.graph.follow', subject: authorDid, createdAt: new Date().toISOString() },
            }),
          });
          if (followRes.status === 429) { log.warnings = 'Rate limited during Bluesky follow'; break; }
          if (followRes.ok) log.follows_made++;
        } catch { /* continue */ }
      }

      if (log.likes_given >= maxLikes && log.follows_made >= maxFollows && log.comments_posted >= maxComments) break;
    }

    await sleep(randMs(40, 120));
  }

  log.status = 'success';
  return log;
}

// ── FACEBOOK: reply to comments on own Page posts ────────────────────────────
async function runFacebookCommentReplies(base44, log) {
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!pageId || !pageToken) { log.warnings = 'Facebook credentials missing'; return log; }

  const baseUrl = 'https://graph.facebook.com/v19.0';

  // Fetch recent Page posts (last 10)
  let posts = [];
  try {
    const postsRes = await fetch(
      `${baseUrl}/${pageId}/posts?fields=id,message,comments_count&limit=10&access_token=${pageToken}`
    );
    if (!postsRes.ok) { log.warnings = `Facebook posts fetch failed: ${postsRes.status}`; return log; }
    const postsData = await postsRes.json();
    posts = postsData.data || [];
  } catch (e) { log.warnings = `Facebook posts error: ${e.message}`; return log; }

  const maxReplies = Math.floor(Math.random() * 4) + 2; // 2-5 replies per session

  for (const post of posts) {
    if (log.comments_posted >= maxReplies) break;

    // Fetch top-level comments on this post
    let comments = [];
    try {
      const commentsRes = await fetch(
        `${baseUrl}/${post.id}/comments?fields=id,message,from,comments{id}&limit=15&filter=stream&access_token=${pageToken}`
      );
      if (!commentsRes.ok) continue;
      const commentsData = await commentsRes.json();
      comments = commentsData.data || [];
    } catch { continue; }

    for (const comment of comments) {
      if (log.comments_posted >= maxReplies) break;
      if (!comment.message || comment.message.length < 5) continue;
      // Skip comments that already have replies (we likely replied already)
      if (comment.comments && comment.comments.data && comment.comments.data.length > 0) continue;
      // Skip our own Page comments
      if (comment.from && comment.from.id === pageId) continue;

      await sleep(randMs(15, 45));
      try {
        const reply = await generateCommentReply(post.message, comment.message, 'facebook');
        const replyRes = await fetch(`${baseUrl}/${comment.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply, access_token: pageToken }),
        });
        if (replyRes.ok) log.comments_posted++;
      } catch { /* continue */ }
    }

    await sleep(randMs(10, 30));
  }

  log.status = 'success';
  return log;
}

// ── LLM: generate a reply to a comment on our own post ───────────────────────
async function generateCommentReply(postCaption, commentText, platform) {
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
  const platformNotes = {
    instagram: 'Instagram (warm, visual, community-driven tone)',
    threads: 'Threads (casual, conversational, authentic)',
    facebook: 'Facebook (friendly, professional, community-focused)',
  };
  const platformNote = platformNotes[platform] || 'social media (professional and warm)';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a genuine, warm community manager replying to comments on your own ${platformNote} posts about remote work and AI job opportunities.
Rules:
- 1-2 sentences max, warm and conversational
- Address what the commenter said specifically, never be generic
- Never mention referral links or promotional content
- If they ask a question, give a helpful direct answer
- Sound like a real person, not a brand bot
- For Facebook: slightly more formal but still friendly`,
      },
      {
        role: 'user',
        content: `Your post was about: "${(postCaption || '').slice(0, 200)}"\nSomeone commented: "${commentText.slice(0, 300)}"\nWrite a genuine reply:`,
      },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });
  return completion.choices[0].message.content.trim();
}

// ── INSTAGRAM: reply to comments on own posts ─────────────────────────────────
async function runInstagramCommentReplies(base44, log) {
  const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
  const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!igAccountId || !pageToken) { log.warnings = 'Instagram credentials missing'; return log; }

  const baseUrl = `https://graph.facebook.com/v19.0`;

  // Fetch recent media (last 10 posts)
  let media = [];
  try {
    const mediaRes = await fetch(`${baseUrl}/${igAccountId}/media?fields=id,caption,comments_count&limit=10&access_token=${pageToken}`);
    if (!mediaRes.ok) { log.warnings = `Instagram media fetch failed: ${mediaRes.status}`; return log; }
    const mediaData = await mediaRes.json();
    media = mediaData.data || [];
  } catch (e) { log.warnings = `Instagram media error: ${e.message}`; return log; }

  const maxReplies = Math.floor(Math.random() * 4) + 2; // 2-5 replies per session

  for (const post of media) {
    if (log.comments_posted >= maxReplies) break;
    if (!post.comments_count || post.comments_count === 0) continue;

    // Fetch comments on this post
    let comments = [];
    try {
      const commentsRes = await fetch(`${baseUrl}/${post.id}/comments?fields=id,text,timestamp,replies{id}&limit=10&access_token=${pageToken}`);
      if (!commentsRes.ok) continue;
      const commentsData = await commentsRes.json();
      comments = commentsData.data || [];
    } catch { continue; }

    for (const comment of comments) {
      if (log.comments_posted >= maxReplies) break;
      // Skip if we already replied (has replies sub-object with content)
      if (comment.replies && comment.replies.data && comment.replies.data.length > 0) continue;
      if (!comment.text || comment.text.length < 5) continue;

      await sleep(randMs(15, 45));
      try {
        const reply = await generateCommentReply(post.caption, comment.text, 'instagram');
        const replyRes = await fetch(`${baseUrl}/${post.id}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply, access_token: pageToken }),
        });
        if (replyRes.ok) log.comments_posted++;
      } catch { /* continue */ }
    }

    await sleep(randMs(10, 30));
  }

  log.status = 'success';
  return log;
}

// ── THREADS: reply to comments on own posts ───────────────────────────────────
async function runThreadsCommentReplies(base44, log) {
  const threadsUserId = Deno.env.get('THREADS_USER_ID');
  const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');
  if (!threadsUserId || !threadsToken) { log.warnings = 'Threads credentials missing'; return log; }

  const baseUrl = `https://graph.threads.net/v1.0`;

  // Fetch recent posts
  let posts = [];
  try {
    const postsRes = await fetch(`${baseUrl}/${threadsUserId}/threads?fields=id,text,timestamp&limit=10&access_token=${threadsToken}`);
    if (!postsRes.ok) { log.warnings = `Threads posts fetch failed: ${postsRes.status}`; return log; }
    const postsData = await postsRes.json();
    posts = postsData.data || [];
  } catch (e) { log.warnings = `Threads posts error: ${e.message}`; return log; }

  const maxReplies = Math.floor(Math.random() * 4) + 2; // 2-5 replies per session

  for (const post of posts) {
    if (log.comments_posted >= maxReplies) break;

    // Fetch replies/conversations on this post
    let replies = [];
    try {
      const repliesRes = await fetch(`${baseUrl}/${post.id}/conversation?fields=id,text,timestamp,username&limit=10&access_token=${threadsToken}`);
      if (!repliesRes.ok) continue;
      const repliesData = await repliesRes.json();
      replies = repliesData.data || [];
    } catch { continue; }

    // Only reply to top-level comments from other users (not our own)
    const ourReplies = new Set(replies.filter(r => r.username === undefined).map(r => r.id));

    for (const reply of replies) {
      if (log.comments_posted >= maxReplies) break;
      if (!reply.text || reply.text.length < 5) continue;
      // Skip if we already replied to this one
      if (ourReplies.has(reply.id)) continue;

      await sleep(randMs(15, 45));
      try {
        const replyText = await generateCommentReply(post.text, reply.text, 'threads');

        // Create reply media object first
        const createRes = await fetch(`${baseUrl}/${threadsUserId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'TEXT',
            text: replyText,
            reply_to_id: reply.id,
            access_token: threadsToken,
          }),
        });
        if (!createRes.ok) continue;
        const createData = await createRes.json();

        // Publish the reply
        if (createData.id) {
          const publishRes = await fetch(`${baseUrl}/${threadsUserId}/threads_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: createData.id, access_token: threadsToken }),
          });
          if (publishRes.ok) log.comments_posted++;
        }
      } catch { /* continue */ }
    }

    await sleep(randMs(10, 30));
  }

  log.status = 'success';
  return log;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check if community managing is enabled
    const settings = await base44.asServiceRole.entities.CommunityManagingSettings.filter({});
    const isPaused = settings.length === 0 || settings[0].is_paused;
    if (isPaused) {
      return Response.json({ message: 'Community managing is paused. Skipping.' });
    }

    // Fetch planner recommended hashtags & community managing adjustments
    let plannerHashtags = null;
    try {
      const plannerRes = await base44.asServiceRole.functions.invoke('getPlannerContext', {});
      if (plannerRes?.hasData && plannerRes.recommendedHashtags?.length > 0) {
        // Use planner hashtags but strip # prefix (NICHE_HASHTAGS has no #)
        plannerHashtags = plannerRes.recommendedHashtags.map(h => h.replace(/^#/, '').toLowerCase()).filter(Boolean);
      }
    } catch { /* continue with defaults */ }

    // Override hashtags with planner recommendations if available
    const activeHashtags = plannerHashtags && plannerHashtags.length > 0 ? plannerHashtags : NICHE_HASHTAGS;

    const today = new Date().toISOString().split('T')[0];
    const results = [];

    // Check daily limits already hit today (sum existing logs)
    const todayLogs = await base44.asServiceRole.entities.CommunityEngagementLog.filter({ run_date: today });
    const dailyTotals = {};
    for (const log of todayLogs) {
      if (!dailyTotals[log.platform]) dailyTotals[log.platform] = { likes: 0, comments: 0, follows: 0 };
      dailyTotals[log.platform].likes += log.likes_given || 0;
      dailyTotals[log.platform].comments += log.comments_posted || 0;
      dailyTotals[log.platform].follows += log.follows_made || 0;
    }

    // ── Mastodon session ──
    const mastodonDaily = dailyTotals['mastodon'] || { likes: 0, comments: 0, follows: 0 };
    if (mastodonDaily.likes < 80 && mastodonDaily.comments < 10 && mastodonDaily.follows < 25) {
      const mLog = {
        run_date: today, platform: 'mastodon',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: null,
      };
      await runMastodonSession(base44, mLog, activeHashtags);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(mLog);
      results.push({ platform: 'mastodon', ...mLog });
    } else {
      results.push({ platform: 'mastodon', status: 'skipped', reason: 'Daily limit reached' });
    }

    // Pause between platforms — as if switching tabs or apps
    await sleep(randMs(90, 300));

    // ── Bluesky session ──
    const bskyDaily = dailyTotals['bluesky'] || { likes: 0, comments: 0, follows: 0 };
    if (bskyDaily.likes < 80 && bskyDaily.comments < 10 && bskyDaily.follows < 25) {
      const bLog = {
        run_date: today, platform: 'bluesky',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: null,
      };
      await runBlueskySession(base44, bLog, activeHashtags);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(bLog);
      results.push({ platform: 'bluesky', ...bLog });
    } else {
      results.push({ platform: 'bluesky', status: 'skipped', reason: 'Daily limit reached' });
    }

    // Pause between platforms
    await sleep(randMs(90, 300));

    // ── Instagram: reply to comments on own posts ──
    const igDaily = dailyTotals['instagram'] || { likes: 0, comments: 0, follows: 0 };
    if (igDaily.comments < 20) {
      const igLog = {
        run_date: today, platform: 'instagram',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: 'comment_replies',
      };
      await runInstagramCommentReplies(base44, igLog);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(igLog);
      results.push({ platform: 'instagram', ...igLog });
    } else {
      results.push({ platform: 'instagram', status: 'skipped', reason: 'Daily reply limit reached' });
    }

    // Pause between platforms
    await sleep(randMs(90, 300));

    // ── Facebook: reply to comments on own Page posts ──
    const fbDaily = dailyTotals['facebook'] || { likes: 0, comments: 0, follows: 0 };
    if (fbDaily.comments < 20) {
      const fbLog = {
        run_date: today, platform: 'facebook',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: 'comment_replies',
      };
      await runFacebookCommentReplies(base44, fbLog);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(fbLog);
      results.push({ platform: 'facebook', ...fbLog });
    } else {
      results.push({ platform: 'facebook', status: 'skipped', reason: 'Daily reply limit reached' });
    }

    // Pause between platforms
    await sleep(randMs(90, 300));

    // ── Threads: reply to comments on own posts ──
    const threadsDaily = dailyTotals['threads'] || { likes: 0, comments: 0, follows: 0 };
    if (threadsDaily.comments < 20) {
      const tLog = {
        run_date: today, platform: 'threads',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: 'comment_replies',
      };
      await runThreadsCommentReplies(base44, tLog);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(tLog);
      results.push({ platform: 'threads', ...tLog });
    } else {
      results.push({ platform: 'threads', status: 'skipped', reason: 'Daily reply limit reached' });
    }

    return Response.json({ success: true, date: today, sessions: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});