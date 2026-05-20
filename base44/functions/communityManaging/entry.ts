import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// ── Utility: human-like random delay ─────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randMs = (minSec, maxSec) => Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;

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
async function runMastodonSession(base44, log) {
  const instanceUrl = (Deno.env.get('MASTODON_INSTANCE_URL') || '').replace(/\/+$/, '');
  const token = Deno.env.get('MASTODON_ACCESS_TOKEN');
  if (!instanceUrl || !token) { log.warnings = 'Mastodon credentials missing'; return log; }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Session limits
  const maxLikes = Math.floor(Math.random() * 20) + 10;     // 10-30 per session
  const maxComments = Math.floor(Math.random() * 3) + 1;    // 1-4 per session
  const maxFollows = Math.floor(Math.random() * 8) + 3;     // 3-11 per session

  // Pick 2-3 random hashtags to search
  const hashtags = pickRandom(NICHE_HASHTAGS, Math.floor(Math.random() * 2) + 2);
  const seenPostIds = new Set();
  const seenAccountIds = new Set();

  for (const tag of hashtags) {
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

      // Like the post (human delay before action)
      if (log.likes_given < maxLikes && !post.favourited) {
        await sleep(randMs(8, 25));
        try {
          const likeRes = await fetch(`${instanceUrl}/api/v1/statuses/${post.id}/favourite`, { method: 'POST', headers });
          if (likeRes.status === 429) { log.warnings = 'Rate limited during like'; return log; }
          if (likeRes.ok) log.likes_given++;
        } catch { /* continue */ }
      }

      // Maybe comment (much rarer, more human)
      if (log.comments_posted < maxComments && content.length > 80 && Math.random() < 0.15) {
        await sleep(randMs(30, 90));
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

      // Maybe follow the account (rarest, most deliberate)
      const accountId = post.account?.id;
      if (accountId && !seenAccountIds.has(accountId) && log.follows_made < maxFollows && !post.account?.following && Math.random() < 0.2) {
        seenAccountIds.add(accountId);
        await sleep(randMs(15, 40));
        try {
          const followRes = await fetch(`${instanceUrl}/api/v1/accounts/${accountId}/follow`, { method: 'POST', headers });
          if (followRes.status === 429) { log.warnings = 'Rate limited during follow'; break; }
          if (followRes.ok) log.follows_made++;
        } catch { /* continue */ }
      }

      // Break if session limits hit
      if (log.likes_given >= maxLikes && log.follows_made >= maxFollows && log.comments_posted >= maxComments) break;
    }

    // Pause between hashtags
    await sleep(randMs(20, 60));
  }

  // Unfollow accounts that didn't follow back (tracked in a separate daily logic via log — keep simple for now)
  // This would require storing follow history — skipped for first iteration, to be added with CommunityEngagementLog queries

  log.status = 'success';
  return log;
}

// ── BLUESKY ───────────────────────────────────────────────────────────────────
async function runBlueskySession(base44, log) {
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

  const maxLikes = Math.floor(Math.random() * 20) + 10;
  const maxComments = Math.floor(Math.random() * 3) + 1;
  const maxFollows = Math.floor(Math.random() * 8) + 3;

  const hashtags = pickRandom(NICHE_HASHTAGS, Math.floor(Math.random() * 2) + 2);
  const seenUris = new Set();
  const seenDids = new Set();

  for (const tag of hashtags) {
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

      // Like
      if (log.likes_given < maxLikes && !post.viewer?.like) {
        await sleep(randMs(8, 25));
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

      // Comment
      if (log.comments_posted < maxComments && text.length > 80 && Math.random() < 0.15) {
        await sleep(randMs(30, 90));
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

      // Follow author
      const authorDid = post.author?.did;
      if (authorDid && !seenDids.has(authorDid) && log.follows_made < maxFollows && !post.author?.viewer?.following && Math.random() < 0.2) {
        seenDids.add(authorDid);
        await sleep(randMs(15, 40));
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

    await sleep(randMs(20, 60));
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
    if (mastodonDaily.likes < 180 && mastodonDaily.comments < 22 && mastodonDaily.follows < 55) {
      const mLog = {
        run_date: today, platform: 'mastodon',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: null,
      };
      await runMastodonSession(base44, mLog);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(mLog);
      results.push({ platform: 'mastodon', ...mLog });
    } else {
      results.push({ platform: 'mastodon', status: 'skipped', reason: 'Daily limit reached' });
    }

    // Pause between platforms (human-like)
    await sleep(randMs(60, 180));

    // ── Bluesky session ──
    const bskyDaily = dailyTotals['bluesky'] || { likes: 0, comments: 0, follows: 0 };
    if (bskyDaily.likes < 180 && bskyDaily.comments < 22 && bskyDaily.follows < 55) {
      const bLog = {
        run_date: today, platform: 'bluesky',
        likes_given: 0, comments_posted: 0, follows_made: 0, unfollows_made: 0,
        posts_found: 0, status: 'success', warnings: null, notes: null,
      };
      await runBlueskySession(base44, bLog);
      await base44.asServiceRole.entities.CommunityEngagementLog.create(bLog);
      results.push({ platform: 'bluesky', ...bLog });
    } else {
      results.push({ platform: 'bluesky', status: 'skipped', reason: 'Daily limit reached' });
    }

    // Note: Facebook, Instagram, Threads APIs do not support engaging with external posts/profiles.
    // These platforms are handled by auto-posting only. Will revisit if APIs expand.

    return Response.json({ success: true, date: today, sessions: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});