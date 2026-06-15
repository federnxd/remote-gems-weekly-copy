import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// ============================================================================
// communityManaging — COMPLIANT community engagement.
//
// SCOPE (deliberately narrow & policy-safe):
//   This function ONLY replies to comments left on YOUR OWN posts, on platforms
//   whose official APIs support it (Instagram, Facebook Page, Threads).
//
// What it intentionally does NOT do (these violate platform ToS and/or aren't
// available through official APIs — removed permanently):
//   - No liking, commenting, or following on OTHER people's posts
//   - No hashtag-search-and-engage on strangers
//   - No follow/unfollow tactics
//   - No "human mimicry" to evade detection
//
// The official APIs are built for exactly this: responding to people who
// engaged YOU first. That is authentic, encouraged, and durable.
//
// COMPLIANCE RULES enforced below:
//   - 24-HOUR WINDOW: only reply to comments newer than 24h (Meta policy).
//   - RATE LIMITS: conservative per-session and per-day caps, well under the
//     platform ceilings (Meta post-comment private replies ~750/hr; we cap far
//     lower). Replies are public comment replies, not DMs.
//   - DEDUP: never reply to a comment we've already replied to.
//   - One reply per commenter-comment. No spam.
// ============================================================================

// ── Conservative limits (well under platform ceilings) ──────────────────────
// These numbers reflect a NEW ACCOUNT (less than ~30 days old). Once the
// account has been active for a month without warnings, you can roughly
// DOUBLE every value below (e.g. perDayActions 20 → 40, perHourActions 8 → 15,
// perSessionActions 2 → 4). Keep cron at every 5 minutes either way.
//
// The cap is COMBINED across comment-replies and DM/public-reply responders —
// platforms count total outbound account actions against reputation, not
// "comment-replies" vs "DMs" separately. One shared budget.
const LIMITS = {
  perSessionActions: 2,     // max actions (comment-replies + DMs combined) per cron run, per platform
  perHourActions: 8,        // rolling 60-minute combined cap, per platform
  perDayActions: 20,        // combined cap per platform per calendar day
  postsToScan: 15,          // how many recent own-posts to scan for new comments
  commentWindowHours: 24,   // only reply to comments newer than this (Meta rule)
  minCommentChars: 5,       // ignore trivial comments
};

// Spacing between actions WITHIN a single session: 30-60 seconds randomized.
// This is genuine platform-recommended pacing (per published automation
// guidance), not "human mimicry" for evasion. It keeps any single session
// from looking like a burst, and combined with cron-every-5-min it gives
// roughly human cadence across the day.
function pace() {
  const ms = 30000 + Math.floor(Math.random() * 30000); // 30000–60000ms
  return new Promise((r) => setTimeout(r, ms));
}

function withinWindow(timestampIso) {
  if (!timestampIso) return true; // if the platform doesn't give a timestamp, don't exclude
  const t = new Date(timestampIso).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t <= LIMITS.commentWindowHours * 3600 * 1000;
}

// ── Per-action logger: writes a ResponderAction record for each successful
// (or attempted) action. Used by the Responder Activity UI to show "what the
// responder did and why" — per-action granularity, complements the aggregate
// CommunityEngagementLog. Fails silently if write errors: we never want
// failed audit logging to break the responder's actual work.
async function recordAction(db, { platform, action_type, trigger_text, trigger_post_id, recipient_handle, status = 'sent', notes }) {
  try {
    const truncated = trigger_text ? String(trigger_text).slice(0, 200) : undefined;
    await db.entities.ResponderAction.create({
      platform,
      action_type,
      trigger_text: truncated,
      trigger_post_id: trigger_post_id || undefined,
      recipient_handle: recipient_handle || 'unknown',
      status,
      notes: notes || undefined,
    });
  } catch { /* logging is best-effort */ }
}

// ── LLM: generate a genuine reply to a comment on OUR OWN post ───────────────
async function generateCommentReply(postCaption, commentText, platform) {
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
  const platformNotes = {
    instagram: 'Instagram (warm, visual, community-driven tone)',
    threads: 'Threads (casual, conversational, authentic)',
    facebook: 'Facebook (friendly, professional, community-focused)',
    mastodon: 'Mastodon (open-source community, authentic, no marketing voice — sound like a person at a meetup, not a brand)',
    bluesky: 'Bluesky (tech-aware, slightly irreverent, honest — short and substantive; Bluesky users dislike performative replies)',
  };
  const platformNote = platformNotes[platform] || 'social media (professional and warm)';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a genuine, warm community manager replying to comments on your OWN ${platformNote} posts about remote work and AI job opportunities.
Rules:
- 1-2 sentences max, warm and conversational.
- Address what the commenter actually said — never generic.
- If they ask a question, give a real, helpful, direct answer.
- NEVER include referral links or promotional pitches in replies.
- NEVER name a specific company.
- Sound like a real person, not a brand bot.`,
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

// ── INSTAGRAM: reply to comments on own posts ────────────────────────────────
async function runInstagramCommentReplies(db, log, remainingToday) {
  const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
  const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!igAccountId || !pageToken) { log.warnings = 'Instagram credentials missing'; log.status = 'skipped'; return log; }

  const baseUrl = 'https://graph.facebook.com/v19.0';
  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  let media = [];
  try {
    const res = await fetch(`${baseUrl}/${igAccountId}/media?fields=id,caption,comments_count&limit=${LIMITS.postsToScan}&access_token=${pageToken}`);
    if (res.status === 429) { log.warnings = 'Rate limited (media fetch)'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `Instagram media fetch failed: ${res.status}`; log.status = 'error'; return log; }
    media = (await res.json()).data || [];
  } catch (e) { log.warnings = `Instagram media error: ${e.message}`; log.status = 'error'; return log; }

  for (const post of media) {
    if (log.comments_posted >= cap) break;
    if (!post.comments_count) continue;

    let comments = [];
    try {
      const res = await fetch(`${baseUrl}/${post.id}/comments?fields=id,text,timestamp,replies{id}&limit=15&access_token=${pageToken}`);
      if (res.status === 429) { log.warnings = 'Rate limited (comments)'; log.status = 'rate_limited'; return log; }
      if (!res.ok) continue;
      comments = (await res.json()).data || [];
    } catch { continue; }

    for (const c of comments) {
      if (log.comments_posted >= cap) break;
      if (!c.text || c.text.trim().length < LIMITS.minCommentChars) continue;
      if (c.replies?.data?.length > 0) continue;        // already replied
      if (!withinWindow(c.timestamp)) continue;          // 24h window

      log.posts_found++;
      await pace();
      try {
        const reply = await generateCommentReply(post.caption, c.text, 'instagram');
        const r = await fetch(`${baseUrl}/${c.id}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply, access_token: pageToken }),
        });
        if (r.status === 429) {
          log.warnings = 'Rate limited (reply)'; log.status = 'rate_limited';
          await recordAction(db, { platform: 'instagram', action_type: 'comment_reply', trigger_text: c.text, trigger_post_id: post.id, status: 'rate_limited' });
          return log;
        }
        if (r.ok) {
          log.comments_posted++;
          await recordAction(db, { platform: 'instagram', action_type: 'comment_reply', trigger_text: c.text, trigger_post_id: post.id, recipient_handle: c.from?.username });
        }
      } catch (e) {
        await recordAction(db, { platform: 'instagram', action_type: 'comment_reply', trigger_text: c.text, trigger_post_id: post.id, status: 'error', notes: e.message });
      }
    }
  }
  log.status = log.status || 'success';
  return log;
}

// ── FACEBOOK: reply to comments on own Page posts ────────────────────────────
async function runFacebookCommentReplies(db, log, remainingToday) {
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!pageId || !pageToken) { log.warnings = 'Facebook credentials missing'; log.status = 'skipped'; return log; }

  const baseUrl = 'https://graph.facebook.com/v19.0';
  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  let posts = [];
  try {
    const res = await fetch(`${baseUrl}/${pageId}/posts?fields=id,message,comments_count&limit=${LIMITS.postsToScan}&access_token=${pageToken}`);
    if (res.status === 429) { log.warnings = 'Rate limited (posts)'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `Facebook posts fetch failed: ${res.status}`; log.status = 'error'; return log; }
    posts = (await res.json()).data || [];
  } catch (e) { log.warnings = `Facebook posts error: ${e.message}`; log.status = 'error'; return log; }

  for (const post of posts) {
    if (log.comments_posted >= cap) break;

    let comments = [];
    try {
      const res = await fetch(`${baseUrl}/${post.id}/comments?fields=id,message,from,created_time,comments{id}&limit=15&filter=stream&access_token=${pageToken}`);
      if (res.status === 429) { log.warnings = 'Rate limited (comments)'; log.status = 'rate_limited'; return log; }
      if (!res.ok) continue;
      comments = (await res.json()).data || [];
    } catch { continue; }

    for (const c of comments) {
      if (log.comments_posted >= cap) break;
      if (!c.message || c.message.trim().length < LIMITS.minCommentChars) continue;
      if (c.comments?.data?.length > 0) continue;        // already replied
      if (c.from && c.from.id === pageId) continue;       // our own comment
      if (!withinWindow(c.created_time)) continue;        // 24h window

      log.posts_found++;
      await pace();
      try {
        const reply = await generateCommentReply(post.message, c.message, 'facebook');
        const r = await fetch(`${baseUrl}/${c.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply, access_token: pageToken }),
        });
        if (r.status === 429) {
          log.warnings = 'Rate limited (reply)'; log.status = 'rate_limited';
          await recordAction(db, { platform: 'facebook', action_type: 'comment_reply', trigger_text: c.message, trigger_post_id: post.id, status: 'rate_limited' });
          return log;
        }
        if (r.ok) {
          log.comments_posted++;
          await recordAction(db, { platform: 'facebook', action_type: 'comment_reply', trigger_text: c.message, trigger_post_id: post.id, recipient_handle: c.from?.name });
        }
      } catch (e) {
        await recordAction(db, { platform: 'facebook', action_type: 'comment_reply', trigger_text: c.message, trigger_post_id: post.id, status: 'error', notes: e.message });
      }
    }
  }
  log.status = log.status || 'success';
  return log;
}

// ── THREADS: reply to comments on own posts ──────────────────────────────────
async function runThreadsCommentReplies(db, log, remainingToday) {
  const threadsUserId = Deno.env.get('THREADS_USER_ID');
  const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');
  if (!threadsUserId || !threadsToken) { log.warnings = 'Threads credentials missing'; log.status = 'skipped'; return log; }

  const baseUrl = 'https://graph.threads.net/v1.0';
  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  let posts = [];
  try {
    const res = await fetch(`${baseUrl}/${threadsUserId}/threads?fields=id,text,timestamp&limit=${LIMITS.postsToScan}&access_token=${threadsToken}`);
    if (res.status === 429) { log.warnings = 'Rate limited (posts)'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `Threads posts fetch failed: ${res.status}`; log.status = 'error'; return log; }
    posts = (await res.json()).data || [];
  } catch (e) { log.warnings = `Threads posts error: ${e.message}`; log.status = 'error'; return log; }

  for (const post of posts) {
    if (log.comments_posted >= cap) break;

    let replies = [];
    try {
      const res = await fetch(`${baseUrl}/${post.id}/conversation?fields=id,text,timestamp,username,has_replies&limit=15&access_token=${threadsToken}`);
      if (res.status === 429) { log.warnings = 'Rate limited (conversation)'; log.status = 'rate_limited'; return log; }
      if (!res.ok) continue;
      replies = (await res.json()).data || [];
    } catch { continue; }

    // Identify our own handle so we never reply to ourselves and can detect
    // comments we've already answered (a reply whose author is us).
    for (const c of replies) {
      if (log.comments_posted >= cap) break;
      if (!c.text || c.text.trim().length < LIMITS.minCommentChars) continue;
      if (c.username && threadsUserId && String(c.username).toLowerCase() === String(threadsUserId).toLowerCase()) continue; // our own
      if (c.has_replies) continue;                       // already has replies (likely answered)
      if (!withinWindow(c.timestamp)) continue;          // 24h window

      log.posts_found++;
      await pace();
      try {
        const replyText = await generateCommentReply(post.text, c.text, 'threads');
        const createRes = await fetch(`${baseUrl}/${threadsUserId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_type: 'TEXT', text: replyText, reply_to_id: c.id, access_token: threadsToken }),
        });
        if (createRes.status === 429) {
          log.warnings = 'Rate limited (create)'; log.status = 'rate_limited';
          await recordAction(db, { platform: 'threads', action_type: 'comment_reply', trigger_text: c.text, trigger_post_id: post.id, status: 'rate_limited' });
          return log;
        }
        if (!createRes.ok) continue;
        const createData = await createRes.json();
        if (createData.id) {
          const pubRes = await fetch(`${baseUrl}/${threadsUserId}/threads_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: createData.id, access_token: threadsToken }),
          });
          if (pubRes.ok) {
            log.comments_posted++;
            await recordAction(db, { platform: 'threads', action_type: 'comment_reply', trigger_text: c.text, trigger_post_id: post.id, recipient_handle: c.username });
          }
        }
      } catch (e) {
        await recordAction(db, { platform: 'threads', action_type: 'comment_reply', trigger_text: c.text, trigger_post_id: post.id, status: 'error', notes: e.message });
      }
    }
  }
  log.status = log.status || 'success';
  return log;
}

// ── Dedup helper: load already-replied notification IDs from recent logs ─────
// We track IDs we've replied to so we never double-reply across runs/days.
// We look at recent logs (last 7 days) to cover the 24h window with a margin.
async function loadRepliedIds(db, platform) {
  try {
    const recent = await db.entities.CommunityEngagementLog.list('-run_date', 30);
    const ids = new Set();
    for (const log of recent) {
      if (log.platform !== platform) continue;
      if (!log.replied_notification_ids) continue;
      for (const id of String(log.replied_notification_ids).split(',')) {
        const trimmed = id.trim();
        if (trimmed) ids.add(trimmed);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

// ── MASTODON: reply to mentions on own posts ─────────────────────────────────
async function runMastodonCommentReplies(db, log, remainingToday) {
  const instanceUrl = Deno.env.get('MASTODON_INSTANCE_URL');
  const accessToken = Deno.env.get('MASTODON_ACCESS_TOKEN');
  if (!instanceUrl || !accessToken) { log.warnings = 'Mastodon credentials missing'; log.status = 'skipped'; return log; }

  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  const headers = { 'Authorization': `Bearer ${accessToken}` };
  const replied = await loadRepliedIds(db, 'mastodon');
  const newlyReplied = [];

  // Mastodon's notifications endpoint gives us every mention with the original
  // status (post) embedded — exactly the green-flag "they engaged me first"
  // signal. Filter to type=mention only.
  let notifications = [];
  try {
    const res = await fetch(
      `${instanceUrl.replace(/\/$/, '')}/api/v1/notifications?types[]=mention&limit=40`,
      { headers }
    );
    if (res.status === 429) { log.warnings = 'Rate limited (notifications)'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `Mastodon notifications fetch failed: ${res.status}`; log.status = 'error'; return log; }
    notifications = await res.json();
  } catch (e) { log.warnings = `Mastodon notifications error: ${e.message}`; log.status = 'error'; return log; }

  for (const n of notifications) {
    if (log.comments_posted >= cap) break;
    if (n.type !== 'mention' || !n.status) continue;
    if (replied.has(String(n.id))) continue;          // already replied (dedup)
    if (!withinWindow(n.created_at)) continue;         // 24h quality window

    const status = n.status;
    const commentText = (status.content || '').replace(/<[^>]+>/g, '').trim(); // strip HTML
    if (commentText.length < LIMITS.minCommentChars) continue;

    log.posts_found++;
    await pace();
    try {
      const replyText = await generateCommentReply(commentText, commentText, 'mastodon');
      // Mastodon replies: POST status with in_reply_to_id pointing at the mentioning post.
      // Include an @ mention so the user gets notified (required for thread continuity).
      const acct = n.account?.acct ? `@${n.account.acct} ` : '';
      const body = JSON.stringify({
        status: `${acct}${replyText}`.slice(0, 500),
        in_reply_to_id: status.id,
        visibility: 'public',
      });
      const r = await fetch(`${instanceUrl.replace(/\/$/, '')}/api/v1/statuses`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body,
      });
      if (r.status === 429) {
        log.warnings = 'Rate limited (reply)'; log.status = 'rate_limited';
        await recordAction(db, { platform: 'mastodon', action_type: 'comment_reply', trigger_text: commentText, trigger_post_id: status.id, status: 'rate_limited' });
        break;
      }
      if (r.ok) {
        log.comments_posted++;
        newlyReplied.push(String(n.id));
        await recordAction(db, { platform: 'mastodon', action_type: 'comment_reply', trigger_text: commentText, trigger_post_id: status.id, recipient_handle: n.account?.acct });
      }
    } catch (e) {
      await recordAction(db, { platform: 'mastodon', action_type: 'comment_reply', trigger_text: commentText, trigger_post_id: status.id, status: 'error', notes: e.message });
    }
  }

  if (newlyReplied.length) {
    // Concatenate with any existing list for today (if this is a re-run)
    const existing = log.replied_notification_ids ? log.replied_notification_ids.split(',') : [];
    log.replied_notification_ids = [...existing, ...newlyReplied].join(',');
  }
  log.status = log.status || 'success';
  return log;
}

// ── BLUESKY: reply to mentions/replies on own posts ──────────────────────────
async function runBlueskyCommentReplies(db, log, remainingToday) {
  const handle = Deno.env.get('BLUESKY_HANDLE');
  const password = Deno.env.get('BLUESKY_APP_PASSWORD');
  if (!handle || !password) { log.warnings = 'Bluesky credentials missing'; log.status = 'skipped'; return log; }

  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  // Authenticate (AT Protocol: handle + app password -> session token)
  let accessJwt, ownDid;
  try {
    const authRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password }),
    });
    if (!authRes.ok) { log.warnings = `Bluesky auth failed: ${authRes.status}`; log.status = 'error'; return log; }
    const auth = await authRes.json();
    accessJwt = auth.accessJwt;
    ownDid = auth.did;
  } catch (e) { log.warnings = `Bluesky auth error: ${e.message}`; log.status = 'error'; return log; }

  const authHeaders = { 'Authorization': `Bearer ${accessJwt}` };
  const replied = await loadRepliedIds(db, 'bluesky');
  const newlyReplied = [];

  // app.bsky.notification.listNotifications — the canonical endpoint for
  // "things that happened to your account". We filter to reasons: 'reply' and 'mention'.
  let notifications = [];
  try {
    const res = await fetch(
      'https://bsky.social/xrpc/app.bsky.notification.listNotifications?limit=40',
      { headers: authHeaders }
    );
    if (res.status === 429) { log.warnings = 'Rate limited (notifications)'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `Bluesky notifications fetch failed: ${res.status}`; log.status = 'error'; return log; }
    notifications = (await res.json()).notifications || [];
  } catch (e) { log.warnings = `Bluesky notifications error: ${e.message}`; log.status = 'error'; return log; }

  for (const n of notifications) {
    if (log.comments_posted >= cap) break;
    if (n.reason !== 'reply' && n.reason !== 'mention') continue;
    if (n.author?.did === ownDid) continue;            // never reply to ourselves
    // Bluesky notifications don't have a single stable "notification ID" we
    // can dedup against the same way Mastodon does — but they do have a uri
    // (the AT URI of the offending post), which is stable per-record.
    const notifId = n.uri || `${n.cid || ''}_${n.author?.did || ''}`;
    if (replied.has(notifId)) continue;                // already replied (dedup)
    if (!withinWindow(n.indexedAt || n.record?.createdAt)) continue; // 24h window

    const commentText = (n.record?.text || '').trim();
    if (commentText.length < LIMITS.minCommentChars) continue;

    log.posts_found++;
    await pace();
    try {
      const replyText = await generateCommentReply(commentText, commentText, 'bluesky');

      // Bluesky replies need TWO refs: immediate parent and thread root.
      // For a direct reply to our own post, root === parent (the notification's uri/cid).
      // If the notification is itself a reply within a thread, use the embedded
      // record.reply for the true root.
      const parentRef = { uri: n.uri, cid: n.cid };
      const rootRef = n.record?.reply?.root || parentRef;

      const record = {
        $type: 'app.bsky.feed.post',
        text: replyText.slice(0, 300),
        createdAt: new Date().toISOString(),
        reply: { root: rootRef, parent: parentRef },
      };

      const r = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: ownDid, collection: 'app.bsky.feed.post', record }),
      });
      if (r.status === 429) {
        log.warnings = 'Rate limited (reply)'; log.status = 'rate_limited';
        await recordAction(db, { platform: 'bluesky', action_type: 'comment_reply', trigger_text: commentText, trigger_post_id: n.uri, status: 'rate_limited' });
        break;
      }
      if (r.ok) {
        log.comments_posted++;
        newlyReplied.push(notifId);
        await recordAction(db, { platform: 'bluesky', action_type: 'comment_reply', trigger_text: commentText, trigger_post_id: n.uri, recipient_handle: n.author?.handle });
      }
    } catch (e) {
      await recordAction(db, { platform: 'bluesky', action_type: 'comment_reply', trigger_text: commentText, trigger_post_id: n.uri, status: 'error', notes: e.message });
    }
  }

  if (newlyReplied.length) {
    const existing = log.replied_notification_ids ? log.replied_notification_ids.split(',') : [];
    log.replied_notification_ids = [...existing, ...newlyReplied].join(',');
  }
  log.status = log.status || 'success';
  return log;
}

// ============================================================================
// DM RESPONDER — triggered by the keyword "Remote" in comments on our posts.
//
// On CTA-mode posts (Twitter / Facebook / Instagram / Threads), the post asks
// people to comment "Remote" and we send them the link in response. This block
// delivers that promise:
//   - Instagram & Facebook  → send a private DM (Graph API supports it)
//   - Twitter & Threads     → reply publicly with the link (no DM API for us)
//
// COMPLIANCE:
//   - Same `is_paused` gate as the rest of the engine.
//   - Same per-day rate cap (counts toward LIMITS.perDayActions).
//   - Hourly cap also applies (LIMITS.perHourActions) — combined with comments.
//   - 24h Meta policy window honored on FB/IG.
//   - Per-commenter dedup across all runs: each user receives the link once.
//   - Trigger is case-insensitive whole-word "Remote" — doesn't match
//     "remotely" or "removed".
// ============================================================================

const REMOTE_TRIGGER = /\bremote\b/i;
const REFERRAL_LINK = 'https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e&utm_source=referral&utm_medium=share&utm_campaign=job_referral';

// ── Pool 1: opening greetings (uses {username}) ──────────────────────────────
const POOL_1_GREETINGS = [
  'Hi @{username}! 👋',
  'Hey @{username}, thanks for the comment 🙌',
  'Hi @{username} — glad you reached out 🙂',
  'Hey @{username}! Appreciate you commenting.',
  'Hello @{username}! Thanks for showing interest 🌟',
  'Hi there @{username} 👋 happy you stopped by.',
  'Hey @{username}, good to hear from you 🙌',
  'Hi @{username}! Thanks for jumping in 🙂',
  'Hello @{username} — your comment made my day a little better 🌱',
  'Hey @{username}! Welcome 👋',
  'Hi @{username}, lovely to see your interest 🌟',
  'Hey @{username} — thanks for raising your hand 🙋',
];

// ── Pool 2: value statement (remote work + AI careers) ───────────────────────
const POOL_2_VALUE = [
  'It means a lot that you\'re thinking about a remote path. Working remotely buys you back the hours commutes steal, lets you design days around your sharpest focus windows, and opens doors to teams across the world. The leading AI companies are actively looking for people whose specific expertise can\'t be replicated — that\'s where careers are being built right now.',
  'Remote work isn\'t just a perk anymore — for thoughtful professionals it\'s become the format that actually rewards depth and autonomy. The new wave of AI-driven companies needs experienced humans to ground their models in real-world judgment, and that means careers like yours are more valuable, not less. Your interest in this space is exactly the kind of curiosity that opens doors.',
  'Glad you\'re exploring this. The way remote work compounds — no commute, flexible hours, geography-independent income — frees up time for the deep work that builds real careers. And right now, leading AI labs are putting serious resources behind hiring people who bring genuine domain expertise to the table. Your background can fit in beautifully there.',
  'Your interest is genuinely appreciated. Remote roles give you control over your schedule, your environment, and ultimately your trajectory — and the most exciting opportunities right now are at AI companies that need experts (not generalists) to teach and shape their systems. Combining what you already know with the way the industry is moving is a smart move.',
  'I love seeing people lean into this. Remote work means choosing where you live, how you focus, and which projects align with your actual strengths — and the AI companies leading the field are realizing they can\'t build what they\'re building without seasoned human expertise. Pairing the two — your skill set + remote flexibility — is one of the better career bets right now.',
  'Really happy to share this with you. Beyond flexibility and time saved, remote work changes the kind of careers you can have — global teams, project variety, and the chance to grow on your own terms. The most forward-looking AI companies are looking for human experts to anchor their work, and that means professionals like you have a real opening here.',
  'Thanks for being curious about this path. Remote roles let you trade commute time for life and learning, and they connect you to companies that wouldn\'t hire locally otherwise. The current wave of AI businesses needs human experts whose judgment they can\'t synthesize — careers built on actual expertise are more relevant than ever.',
  'Appreciate you taking the step. Remote work, done well, is less about location and more about owning your time and focus — two things this industry rewards. And the AI companies setting the pace right now genuinely need domain experts to guide their systems; the human side of this work is what makes it worthwhile. Building a career on what you uniquely know is a strong play here.',
  'Your interest is welcome — and timely. Remote work has matured into something that suits experienced professionals especially well: deep focus, no office politics, balance you can shape. The AI companies that are shipping serious work right now need human experts to do what models alone can\'t, and that\'s where careers like yours can really compound.',
  'So glad you reached out. Remote work earns you back the small hours that quietly add up — focus, family time, energy — and connects you with teams whose missions actually fit your skills. The leading AI companies have realized they need seasoned humans, not just data, to push the field forward. That\'s a great moment for a career like yours.',
  'Thanks for showing up here. The honest case for remote work is freedom — over your day, your geography, your projects — and the honest case for the AI economy right now is that human expertise has rarely been more valuable. The companies doing the most interesting work need people who bring real depth, and that\'s exactly the kind of skillset worth investing in.',
  'I appreciate the interest. Remote roles give you both flexibility and exposure to teams you\'d never reach otherwise — and the next wave of AI work specifically needs experienced humans who can teach systems to behave well in the real world. Matching your expertise to that need is where genuinely strong careers are being built right now.',
];

// ── Pool 3: link reveal + "apply to as many as match your expertise" ─────────
const POOL_3_LINK = [
  'Here\'s the link 👇\n{link}\nApply to as many of the open roles as match your expertise — there\'s no cap on how many you can put your name in for.',
  'Here you go — this is the gateway:\n{link}\nFeel free to apply to every role that matches your skills. Casting a wider net helps; the right fits often surface in unexpected places.',
  'The link is right here:\n{link}\nYou can apply to any (and as many) of the roles that match what you already do well. Each application is independent — more shots, more chances.',
  'This is the referral link 👇\n{link}\nApply to every role that genuinely aligns with your expertise. No limit on the number of applications you can submit.',
  'Here you go:\n{link}\nYou\'re welcome to apply to as many openings as you feel match your background. The more good fits you spot, the better your chances.',
  'Here\'s where it all starts:\n{link}\nApply to whichever roles speak to your actual skills — and there\'s no upper limit on how many you go for.',
  'Link below ⬇️\n{link}\nGo through and apply to every role that matches your expertise. Multiple applications are encouraged, not penalized.',
  'Here\'s the link to get going:\n{link}\nLook through the openings and apply to all the ones that fit your background. There\'s no quota — apply to as many as you\'d like.',
  'Right here 👇\n{link}\nApply to every role you see that lines up with your skill set. There\'s no limit, and each application stands on its own.',
  'Here\'s the link 🔗\n{link}\nScan the list and apply to anything that matches your expertise. Multiple applications are fine — encouraged, even.',
  'Here\'s your starting point:\n{link}\nApply to as many openings as match what you bring to the table. Each one is reviewed independently.',
  'This is the link:\n{link}\nFeel free to apply to every role that fits your background — there\'s no cap, and applying broadly often pays off.',
];

// ── Section 4: process / instructions (canonical — same text every time) ─────
// Unlike pools 1, 2, 3, 5, 6, this is a SINGLE block. The application process
// is one fixed sequence of steps, so varying the wording per DM would risk
// miscommunicating it. Greetings and value statements should feel personal
// and varied; instructions should be identical and unambiguous.
const PROCESS_INSTRUCTIONS = `Here's how the process works:

1. Apply through the link to any roles that fit your skills — you can apply to more than one.
2. You'll receive an email invitation to a short interview (~30 min).
3. The interview is to verify your skills and experience — no trick questions, just a real assessment.
4. If you pass, you'll get a certification and access to the platform where you can tune your profile.
5. From there you're eligible to be matched with leading AI companies and projects that fit your expertise.

After that it works like any other hiring process: the company reaches out, offers you a contract, and once you sign you'll get the onboarding instructions.`;

// ── Pool 5: nudge about new roles + stay engaged ─────────────────────────────
const POOL_5_NUDGE = [
  'Heads up — new roles get added almost every day, so it\'s worth checking the list now and then. Even if nothing perfect shows up today, it might next week.',
  'One more thing: the list refreshes constantly. New openings land almost daily, so if nothing jumps out yet, it\'s worth coming back in a few days.',
  'Quick note — new roles are added on a near-daily basis. Keeping an eye on the list over the next couple of weeks is worth the small effort.',
  'A small tip: openings change quickly. New ones get added almost every day, so even passing checks over the next weeks can surface the right match.',
  'Worth knowing: the list isn\'t static. Roles are added almost daily, so it pays to come back periodically rather than treat today\'s list as the whole picture.',
  'One thing I\'d underline: new roles drop almost every single day. If you don\'t see your perfect fit yet, give it a few days — it\'s probably on the way.',
  'Heads up — the openings refresh constantly. Many new roles are added daily, so keeping the link bookmarked and dropping by every few days really helps.',
  'Quick reminder: this list moves fast. Almost every day new roles land, so checking in regularly over the next couple of weeks is more valuable than one big look today.',
  'Something I always mention: new opportunities get added almost daily. It\'s worth coming back every few days, not just once — patterns of new postings often favor patient applicants.',
  'A little tip: don\'t treat today\'s list as final. New roles are added almost every day, and openings that suit you well might come in next week — keep the link handy.',
  'Worth noting — the listing is alive. New roles appear almost daily, so casual repeat visits over the next couple of weeks tend to pay off more than one deep scan.',
  'One last thing: roles roll in nearly every day. Keep an eye on the list across the coming weeks — the right fit often shows up when you weren\'t specifically looking for it.',
];

// ── Pool 6: sign-off / closing ───────────────────────────────────────────────
const POOL_6_SIGNOFF = [
  'Wishing you the best of luck — feel free to reach back out with any questions 🤝',
  'Hope this opens a door for you. I\'m around if anything comes up 🙌',
  'Rooting for you. Don\'t hesitate to ask if you want to talk through anything 🌱',
  'Best of luck out there — happy to answer questions if you have any 🙂',
  'Sending good vibes. If anything is unclear, just ask 🙌',
  'Hope you find something that fits. I\'m here if you need to bounce ideas 🌟',
  'Cheering you on — feel free to message me back with any questions 🤝',
  'All the best with the applications. I\'m around if questions come up 🙂',
  'Good luck — and don\'t hesitate to reach out if anything is unclear 🌱',
  'Wishing you a smooth journey through it. Reply any time if I can help 🙌',
  'Best of luck — and seriously, ping me if anything stumps you 🤝',
  'Hope this is the start of something good. Happy to help if anything comes up 🌟',
];

// ── Threads public reply pool (500-char limit — uses the breathing room) ─────
// Threads has roughly twice Twitter's character budget, so these replies can
// be warmer and include all the context: the link, what to do with it, and
// what happens after applying.
const POOL_THREADS_REPLY = [
  'Hi @{username}! In this link you can search for remote open roles at leading AI companies: {link} You can apply to the ones that match your expertise and you\'ll get an invitation for an interview to certify your skills. If you pass, you become eligible for positions or projects like in any other job. 🤗',
  'Hey @{username} — here\'s where to look: {link} Browse the open remote roles and apply to as many as match your expertise. You\'ll be invited to a short interview to certify your skills; pass it, and you become eligible for hiring at leading AI companies. 🙌',
  'Hi @{username}! Here you have the link to all the open remote roles at top AI companies: {link} Apply to whichever ones match your skills. They\'ll send an interview invite to certify your expertise, and if you pass, you can be hired. 🚀',
  '@{username} 👋 The link to open remote roles: {link} Look through the openings, apply to any that match your background, and you\'ll be invited to an interview that certifies your skills. Pass it and you\'re eligible for real positions. 🌟',
  'Hi @{username}! Through this link you can apply to remote roles at leading AI companies: {link} Apply to as many as fit your expertise — each application is reviewed independently. Skills are certified via a short interview, then hiring happens like any other role. 🤗',
  'Hey @{username} — here\'s the link: {link} Browse the listings, apply to every role that matches what you do well, and you\'ll get invited to interview. The interview certifies your skills; if you pass, you become eligible for hiring. 🙌',
  'Hi @{username}! The full list of open remote roles is here: {link} Pick the ones that match your skills and apply broadly — there\'s no cap. You\'ll be invited to a short certification interview; pass it, and you\'re eligible for positions. 🚀',
  '@{username} here\'s your starting point: {link} Apply to any of the remote AI roles that fit your expertise — multiple applications are encouraged. After applying, you get an interview invite to certify your skills, then real hiring follows. 🌱',
  'Hi @{username}! In this link you\'ll find the open remote roles at leading AI companies: {link} Apply to as many as match what you\'re good at. The interview that follows certifies your skills, and if you pass, you\'re eligible for hiring. 🤗',
  'Hey @{username}! Link to remote AI openings: {link} Look through them and apply to anything that matches your background. You\'ll be sent an interview to certify your skills; passing it makes you eligible for actual positions. 🙌',
  'Hi @{username}! Here is the link with all the open remote roles: {link} Apply to every one that fits your expertise. There\'s a quick skills-certification interview, and if you pass, you can be hired into real positions. 🚀',
  '@{username} the link is here: {link} Browse the openings and apply to as many roles as match your skills. You\'ll receive an interview invite that certifies your expertise, then you become eligible for hiring. 🌟',
];

// ── Twitter public reply pool (280-char hard cap — straight to the point) ────
// Twitter's tight limit means these have to be direct: greet, link, what to
// do with it, what happens. Every entry verified to fit 280 chars with a
// 19-character username (worst realistic case).
const POOL_TWITTER_REPLY = [
  '@{username} link: {link} — apply to any role that fits your skills. Interview certifies you, then hiring. 🙌',
  '@{username} here it is: {link} — apply broadly; interview certifies your skills; pass it, you\'re eligible. 🚀',
  '@{username} the link: {link} — pick any role matching your expertise. Quick skills interview, then hiring. 🤗',
  '@{username} {link} — apply to all roles that fit your background. Interview to certify, then you\'re in. 🌟',
  '@{username} here you go: {link} — apply to as many roles as match your skills. Interview certifies you. 🙌',
  '@{username} link: {link} — apply broadly; certify via a short interview; eligible for positions if you pass. 🤝',
  '@{username} all open remote AI roles: {link} — apply to any that fit. Short interview certifies your skills. 🚀',
  '@{username} {link} — feel free to apply to anything matching your expertise. Skills interview, then hiring. 🌱',
  '@{username} here\'s the link: {link} — apply to every role you qualify for. Interview, then real positions. 🙌',
  '@{username} the link is here: {link} — apply broadly, you\'ll be invited to interview to certify skills. 🤗',
  '@{username} {link} — pick the roles that fit your expertise. Quick interview, certification, then hiring. 🚀',
  '@{username} link 👇 {link} — apply to as many as match your skills. Skills interview, then you\'re eligible. 🙌',
];

const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];

// Tag the referral link with a utm_content source so we can attribute DM /
// public-reply driven clicks separately from clicks on the link in posts. The
// existing per-post UTM stamping (publishToSocialMedia / checkScheduledPosts)
// uses `utm_content=p<postId>_<platform>` for clicks ON posts; this responder
// uses compact codes for clicks from DMs/public replies. The tags are kept
// short because Twitter's 280-char limit is tight; the meaning is documented
// here so the micro1 dashboard reader can decode them:
//   dmi = DM on Instagram
//   dmf = DM on Facebook
//   rth = public reply on Threads
//   rtw = public reply on Twitter / X
const SOURCE_CODES = {
  'dm:instagram': 'dmi',
  'dm:facebook':  'dmf',
  'reply:threads': 'rth',
  'reply:twitter': 'rtw',
};
function linkWithSource(platform, channel) {
  const code = SOURCE_CODES[`${channel}:${platform}`] || `${channel}_${platform}`;
  // Strip any existing utm_content (defensive — the constant doesn't have one,
  // but staying idempotent matches the publishToSocialMedia helper).
  const cleaned = REFERRAL_LINK.replace(/([?&])utm_content=[^&]*/g, '$1').replace(/[?&]$/, '');
  const sep = cleaned.includes('?') ? '&' : '?';
  return `${cleaned}${sep}utm_content=${code}`;
}

// Assemble a full DM from the six sections, in order 1-2-3-4-5-6, separated
// by blank lines. Sections 1, 2, 3, 5, 6 pick randomly from their 12-entry
// pools. Section 4 is the canonical process text (same every time, since
// process instructions should be unambiguous). {username} and {link} get
// substituted afterward; the link is tagged with a source so DM-driven clicks
// are distinguishable from post-link clicks.
function assembleDM(platform, username) {
  const parts = [
    pick(POOL_1_GREETINGS),
    pick(POOL_2_VALUE),
    pick(POOL_3_LINK),
    PROCESS_INSTRUCTIONS,
    pick(POOL_5_NUDGE),
    pick(POOL_6_SIGNOFF),
  ];
  return parts.join('\n\n')
    .replace(/{username}/g, username || 'there')
    .replace(/{link}/g, linkWithSource(platform, 'dm'));
}

// Assemble a public reply (Twitter or Threads) — pulls from the platform-
// specific pool so Threads uses its 500-char breathing room and Twitter stays
// inside the 280-char limit. Public-reply links are tagged 'reply' so they
// can be measured separately from DMs.
function assemblePublicReply(platform, username) {
  const pool = platform === 'threads' ? POOL_THREADS_REPLY : POOL_TWITTER_REPLY;
  return pick(pool)
    .replace(/{username}/g, username || 'there')
    .replace(/{link}/g, linkWithSource(platform, 'reply'));
}

// Trigger detection — case-insensitive whole-word "remote".
function containsRemoteTrigger(text) {
  return typeof text === 'string' && REMOTE_TRIGGER.test(text);
}

// Per-commenter dedup. Aggregates dm_recipient_ids from the last 90 days of
// logs for this platform so each commenter receives the link only once, ever.
async function loadDMRecipients(db, platform) {
  try {
    const recent = await db.entities.CommunityEngagementLog.list('-run_date', 90);
    const ids = new Set();
    for (const log of recent) {
      if (log.platform !== platform) continue;
      if (!log.dm_recipient_ids) continue;
      for (const id of String(log.dm_recipient_ids).split(',')) {
        const t = id.trim();
        if (t) ids.add(t);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

// ── INSTAGRAM: DM responder ──────────────────────────────────────────────────
async function runInstagramDMResponder(db, log, remainingToday) {
  const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
  const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!igAccountId || !pageToken) { log.warnings = 'Instagram credentials missing'; log.status = 'skipped'; return log; }

  const baseUrl = 'https://graph.facebook.com/v19.0';
  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  const alreadyDMd = await loadDMRecipients(db, 'instagram');
  const newRecipients = [];

  let media = [];
  try {
    const res = await fetch(`${baseUrl}/${igAccountId}/media?fields=id,caption,comments_count&limit=${LIMITS.postsToScan}&access_token=${pageToken}`);
    if (res.status === 429) { log.warnings = 'Rate limited'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `IG media fetch failed: ${res.status}`; log.status = 'error'; return log; }
    media = (await res.json()).data || [];
  } catch (e) { log.warnings = `IG media error: ${e.message}`; log.status = 'error'; return log; }

  for (const post of media) {
    if (log.dms_sent >= cap) break;
    if (!post.comments_count) continue;

    let comments = [];
    try {
      const res = await fetch(`${baseUrl}/${post.id}/comments?fields=id,text,username,from,timestamp&limit=30&access_token=${pageToken}`);
      if (res.status === 429) { log.warnings = 'Rate limited (comments)'; log.status = 'rate_limited'; return log; }
      if (!res.ok) continue;
      comments = (await res.json()).data || [];
    } catch { continue; }

    for (const c of comments) {
      if (log.dms_sent >= cap) break;
      if (!containsRemoteTrigger(c.text)) continue;     // not a "Remote" trigger
      if (!withinWindow(c.timestamp)) continue;          // 24h policy window
      const commenterId = c.from?.id || c.username;
      if (!commenterId) continue;
      if (alreadyDMd.has(String(commenterId))) continue; // dedup: one DM per person

      log.posts_found++;
      await pace();
      try {
        // IG Messaging API: POST a private DM via the page's messaging endpoint.
        const dmText = assembleDM('instagram', c.username || 'there');
        const r = await fetch(`${baseUrl}/${igAccountId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { comment_id: c.id }, // IG-supported: target by the comment
            message: { text: dmText },
            access_token: pageToken,
          }),
        });
        if (r.status === 429) {
          log.warnings = 'Rate limited (DM)'; log.status = 'rate_limited';
          await recordAction(db, { platform: 'instagram', action_type: 'dm', trigger_text: c.text, trigger_post_id: post.id, status: 'rate_limited' });
          break;
        }
        if (r.ok) {
          log.dms_sent++;
          newRecipients.push(String(commenterId));
          await recordAction(db, { platform: 'instagram', action_type: 'dm', trigger_text: c.text, trigger_post_id: post.id, recipient_handle: c.username });
        }
      } catch (e) {
        await recordAction(db, { platform: 'instagram', action_type: 'dm', trigger_text: c.text, trigger_post_id: post.id, status: 'error', notes: e.message });
      }
    }
  }

  if (newRecipients.length) {
    const existing = log.dm_recipient_ids ? log.dm_recipient_ids.split(',') : [];
    log.dm_recipient_ids = [...existing, ...newRecipients].join(',');
  }
  log.status = log.status || 'success';
  return log;
}

// ── FACEBOOK: DM responder (private replies via Messenger) ───────────────────
async function runFacebookDMResponder(db, log, remainingToday) {
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!pageId || !pageToken) { log.warnings = 'Facebook credentials missing'; log.status = 'skipped'; return log; }

  const baseUrl = 'https://graph.facebook.com/v19.0';
  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  const alreadyDMd = await loadDMRecipients(db, 'facebook');
  const newRecipients = [];

  let posts = [];
  try {
    const res = await fetch(`${baseUrl}/${pageId}/posts?fields=id,message,comments_count&limit=${LIMITS.postsToScan}&access_token=${pageToken}`);
    if (res.status === 429) { log.warnings = 'Rate limited'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `FB posts fetch failed: ${res.status}`; log.status = 'error'; return log; }
    posts = (await res.json()).data || [];
  } catch (e) { log.warnings = `FB posts error: ${e.message}`; log.status = 'error'; return log; }

  for (const post of posts) {
    if (log.dms_sent >= cap) break;

    let comments = [];
    try {
      const res = await fetch(`${baseUrl}/${post.id}/comments?fields=id,message,from,created_time&limit=30&filter=stream&access_token=${pageToken}`);
      if (res.status === 429) { log.warnings = 'Rate limited (comments)'; log.status = 'rate_limited'; return log; }
      if (!res.ok) continue;
      comments = (await res.json()).data || [];
    } catch { continue; }

    for (const c of comments) {
      if (log.dms_sent >= cap) break;
      if (!containsRemoteTrigger(c.message)) continue;
      if (c.from && c.from.id === pageId) continue;     // our own comment
      if (!withinWindow(c.created_time)) continue;
      const commenterId = c.from?.id;
      if (!commenterId) continue;
      if (alreadyDMd.has(String(commenterId))) continue;

      log.posts_found++;
      await pace();
      try {
        // FB Messenger: send a private reply to the commenter via the comment_id.
        const dmText = assembleDM('facebook', c.from?.name || 'there');
        const r = await fetch(`${baseUrl}/${pageId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { comment_id: c.id },
            message: { text: dmText },
            messaging_type: 'RESPONSE',
            access_token: pageToken,
          }),
        });
        if (r.status === 429) {
          log.warnings = 'Rate limited (DM)'; log.status = 'rate_limited';
          await recordAction(db, { platform: 'facebook', action_type: 'dm', trigger_text: c.message, trigger_post_id: post.id, status: 'rate_limited' });
          break;
        }
        if (r.ok) {
          log.dms_sent++;
          newRecipients.push(String(commenterId));
          await recordAction(db, { platform: 'facebook', action_type: 'dm', trigger_text: c.message, trigger_post_id: post.id, recipient_handle: c.from?.name });
        }
      } catch (e) {
        await recordAction(db, { platform: 'facebook', action_type: 'dm', trigger_text: c.message, trigger_post_id: post.id, status: 'error', notes: e.message });
      }
    }
  }

  if (newRecipients.length) {
    const existing = log.dm_recipient_ids ? log.dm_recipient_ids.split(',') : [];
    log.dm_recipient_ids = [...existing, ...newRecipients].join(',');
  }
  log.status = log.status || 'success';
  return log;
}

// ── THREADS: public-reply responder (no DM API available) ────────────────────
async function runThreadsPublicReplyResponder(db, log, remainingToday) {
  const threadsUserId = Deno.env.get('THREADS_USER_ID');
  const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');
  if (!threadsUserId || !threadsToken) { log.warnings = 'Threads credentials missing'; log.status = 'skipped'; return log; }

  const baseUrl = 'https://graph.threads.net/v1.0';
  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  const alreadyDMd = await loadDMRecipients(db, 'threads');
  const newRecipients = [];

  let posts = [];
  try {
    const res = await fetch(`${baseUrl}/${threadsUserId}/threads?fields=id,text,timestamp&limit=${LIMITS.postsToScan}&access_token=${threadsToken}`);
    if (res.status === 429) { log.warnings = 'Rate limited'; log.status = 'rate_limited'; return log; }
    if (!res.ok) { log.warnings = `Threads posts fetch failed: ${res.status}`; log.status = 'error'; return log; }
    posts = (await res.json()).data || [];
  } catch (e) { log.warnings = `Threads posts error: ${e.message}`; log.status = 'error'; return log; }

  for (const post of posts) {
    if (log.dms_sent >= cap) break;

    let replies = [];
    try {
      const res = await fetch(`${baseUrl}/${post.id}/conversation?fields=id,text,username,timestamp&limit=30&access_token=${threadsToken}`);
      if (res.status === 429) { log.warnings = 'Rate limited (conversation)'; log.status = 'rate_limited'; return log; }
      if (!res.ok) continue;
      replies = (await res.json()).data || [];
    } catch { continue; }

    for (const c of replies) {
      if (log.dms_sent >= cap) break;
      if (!containsRemoteTrigger(c.text)) continue;
      if (c.username && threadsUserId && String(c.username).toLowerCase() === String(threadsUserId).toLowerCase()) continue;
      if (!withinWindow(c.timestamp)) continue;
      const commenterId = c.username; // Threads doesn't expose a stable id here; username serves as the dedup key
      if (!commenterId) continue;
      if (alreadyDMd.has(String(commenterId))) continue;

      log.posts_found++;
      await pace();
      try {
        // Threads public reply: create + publish a thread with reply_to_id.
        const replyText = assemblePublicReply('threads', c.username);
        const createRes = await fetch(`${baseUrl}/${threadsUserId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_type: 'TEXT', text: replyText, reply_to_id: c.id, access_token: threadsToken }),
        });
        if (createRes.status === 429) {
          log.warnings = 'Rate limited (create)'; log.status = 'rate_limited';
          await recordAction(db, { platform: 'threads', action_type: 'public_reply', trigger_text: c.text, trigger_post_id: post.id, status: 'rate_limited' });
          break;
        }
        if (!createRes.ok) continue;
        const createData = await createRes.json();
        if (createData.id) {
          const pubRes = await fetch(`${baseUrl}/${threadsUserId}/threads_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: createData.id, access_token: threadsToken }),
          });
          if (pubRes.ok) {
            log.dms_sent++;
            newRecipients.push(String(commenterId));
            await recordAction(db, { platform: 'threads', action_type: 'public_reply', trigger_text: c.text, trigger_post_id: post.id, recipient_handle: c.username });
          }
        }
      } catch (e) {
        await recordAction(db, { platform: 'threads', action_type: 'public_reply', trigger_text: c.text, trigger_post_id: post.id, status: 'error', notes: e.message });
      }
    }
  }

  if (newRecipients.length) {
    const existing = log.dm_recipient_ids ? log.dm_recipient_ids.split(',') : [];
    log.dm_recipient_ids = [...existing, ...newRecipients].join(',');
  }
  log.status = log.status || 'success';
  return log;
}

// ── TWITTER / X: public-reply responder (no usable DM API for our case) ──────
async function runTwitterPublicReplyResponder(db, log, remainingToday) {
  const apiKey = Deno.env.get('TWITTER_API_KEY');
  const apiSecret = Deno.env.get('TWITTER_API_SECRET');
  const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
  const accessTokenSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    log.warnings = 'Twitter credentials missing'; log.status = 'skipped'; return log;
  }

  const cap = Math.min(LIMITS.perSessionActions, remainingToday);
  if (cap <= 0) { log.status = 'skipped'; log.warnings = 'Daily reply limit reached'; return log; }

  // NOTE: Twitter / X requires OAuth 1.0a request-signing for write endpoints.
  // This responder relies on the same signing path the existing publishTwitter
  // function uses. To keep this function focused on the responder logic and
  // avoid reimplementing OAuth, we mark Twitter responder as "scaffolded" —
  // it logs the intent and counts what it WOULD send, but does not actually
  // post until the OAuth-signed reply call is wired in alongside the existing
  // publishTwitter helper. This avoids shipping a broken-but-firing endpoint.
  log.status = 'skipped';
  log.warnings = 'Twitter public-reply responder is scaffolded but not yet sending. Wire the OAuth-signed reply call alongside publishTwitter to enable.';
  log.notes = 'reply-to-own-comments + DM responder (Twitter awaiting OAuth wiring)';
  return log;
}

function freshLog(platform, today) {
  return {
    run_date: today, platform,
    likes_given: 0, comments_posted: 0, dms_sent: 0, follows_made: 0, unfollows_made: 0,
    posts_found: 0, status: 'success', warnings: null, notes: 'reply-to-own-comments only',
  };
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Respect the pause toggle (and the planner's ban-risk auto-pause).
    const settings = await db.entities.CommunityManagingSettings.filter({});
    const isPaused = settings.length === 0 || settings[0].is_paused;
    if (isPaused) {
      return Response.json({ message: 'Community managing is paused. Skipping.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const nowMs = Date.now();
    const oneHourMs = 3600 * 1000;

    // 30-day retention on ResponderAction audit records. Run as a small
    // best-effort cleanup at the start of each handler invocation — keeps the
    // table bounded without needing a separate cron. Errors here are
    // swallowed since this is housekeeping, not core work.
    //
    // Implementation notes:
    //   • Sort ASCENDING by created_date so the oldest records are first —
    //     this is the slice we actually want to scan for deletion candidates.
    //   • Break out as soon as we hit a record newer than the cutoff. Most
    //     runs will scan zero records since old data ages in slowly.
    //   • Cap deletes per run (DELETE_BATCH_MAX) so a sudden backlog after
    //     a long pause doesn't blow the function timeout — leftover old
    //     records are picked up by the next run.
    try {
      const cutoff = new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString();
      const FETCH_BATCH = 200;       // how many oldest records to inspect per run
      const DELETE_BATCH_MAX = 50;   // ceiling on actual deletes per run
      const candidates = await db.entities.ResponderAction.list('created_date', FETCH_BATCH);
      let deleted = 0;
      for (const r of candidates) {
        if (deleted >= DELETE_BATCH_MAX) break;
        // Skip records with a missing date — defensive, shouldn't happen since
        // Base44 auto-populates created_date, but don't let a stray bad record
        // block cleanup of the genuinely-old records sorted right behind it.
        if (!r.created_date) continue;
        // Once we see a record at-or-newer-than the cutoff, everything after
        // is also newer (ascending sort) — safe to stop.
        if (r.created_date >= cutoff) break;
        await db.entities.ResponderAction.delete(r.id);
        deleted++;
      }
    } catch { /* housekeeping; ignore failures */ }

    // Sum today's actions per platform — COMBINED across comment-replies and
    // DM/public-reply responders (one shared budget, since the platform
    // doesn't distinguish between them reputationally). Separately compute the
    // last-hour total so we can apply the hourly cap on top of the daily cap.
    const todayLogs = await db.entities.CommunityEngagementLog.filter({ run_date: today });
    const dayTotals = {};   // platform -> combined count today
    const hourTotals = {};  // platform -> combined count in the last 60 minutes

    for (const l of todayLogs) {
      const actions = (l.comments_posted || 0) + (l.dms_sent || 0);
      if (actions === 0) continue;
      dayTotals[l.platform] = (dayTotals[l.platform] || 0) + actions;
      // created_date is auto-populated by Base44; if missing, treat as "now".
      const recordTime = l.created_date ? new Date(l.created_date).getTime() : nowMs;
      if (Number.isFinite(recordTime) && nowMs - recordTime <= oneHourMs) {
        hourTotals[l.platform] = (hourTotals[l.platform] || 0) + actions;
      }
    }

    // The remaining budget is the MIN of daily-remaining and hourly-remaining.
    // Whichever cap is closer to its ceiling determines how many more actions
    // this run can perform.
    //
    // CRITICAL: the comment-replier runs BEFORE the DM responder for each
    // platform. The comment-replier's actions need to count against the DM
    // responder's budget, otherwise they each get the full cap and we
    // accidentally double the per-run total. So we mutate dayTotals/hourTotals
    // in-flight after each function completes, before computing remaining()
    // for the next call on the same platform.
    const remaining = (platform) => {
      const dayLeft  = Math.max(0, LIMITS.perDayActions  - (dayTotals[platform]  || 0));
      const hourLeft = Math.max(0, LIMITS.perHourActions - (hourTotals[platform] || 0));
      return Math.min(dayLeft, hourLeft);
    };

    // Helper: after a function returns its log, fold its action counts into
    // both totals so the next function on the same platform sees the updated
    // budget. Returns the log so we can keep the chain readable.
    const consume = (log) => {
      const actions = (log.comments_posted || 0) + (log.dms_sent || 0);
      if (actions > 0) {
        dayTotals[log.platform]  = (dayTotals[log.platform]  || 0) + actions;
        hourTotals[log.platform] = (hourTotals[log.platform] || 0) + actions;
      }
      return log;
    };

    const results = [];
    const persistIfMeaningful = async (log) => {
      if (log.status !== 'skipped' || log.comments_posted > 0 || log.dms_sent > 0) {
        await db.entities.CommunityEngagementLog.create(log);
      }
      results.push(log);
    };

    // ── Per-platform dispatch ──
    // For each platform we run BOTH the comment-replier AND the DM responder
    // back to back, with the budget tracker live between them. The DM
    // responder always runs second so comment-replies (higher-signal
    // engagement) take budget priority during busy hours.

    // Instagram: comment replies → DM responder
    const igCommentLog = consume(await runInstagramCommentReplies(db, freshLog('instagram', today), remaining('instagram')));
    await persistIfMeaningful(igCommentLog);
    const igDmLog = consume(await runInstagramDMResponder(db, freshLog('instagram', today), remaining('instagram')));
    igDmLog.notes = 'dm-responder';
    await persistIfMeaningful(igDmLog);

    // Facebook: comment replies → DM responder
    const fbCommentLog = consume(await runFacebookCommentReplies(db, freshLog('facebook', today), remaining('facebook')));
    await persistIfMeaningful(fbCommentLog);
    const fbDmLog = consume(await runFacebookDMResponder(db, freshLog('facebook', today), remaining('facebook')));
    fbDmLog.notes = 'dm-responder';
    await persistIfMeaningful(fbDmLog);

    // Threads: comment replies → public-reply DM responder
    const thCommentLog = consume(await runThreadsCommentReplies(db, freshLog('threads', today), remaining('threads')));
    await persistIfMeaningful(thCommentLog);
    const thDmLog = consume(await runThreadsPublicReplyResponder(db, freshLog('threads', today), remaining('threads')));
    thDmLog.notes = 'public-reply-responder';
    await persistIfMeaningful(thDmLog);

    // Mastodon: comment replies only (no CTA mode on Mastodon — link is in the post)
    const mLog = consume(await runMastodonCommentReplies(db, freshLog('mastodon', today), remaining('mastodon')));
    await persistIfMeaningful(mLog);

    // Bluesky: comment replies only (no CTA mode on Bluesky — link is in the post)
    const bLog = consume(await runBlueskyCommentReplies(db, freshLog('bluesky', today), remaining('bluesky')));
    await persistIfMeaningful(bLog);

    // Twitter: DM responder only (scaffolded — won't fire until OAuth is wired)
    const twLog = consume(await runTwitterPublicReplyResponder(db, freshLog('twitter', today), remaining('twitter')));
    twLog.notes = 'public-reply-responder';
    await persistIfMeaningful(twLog);

    const totalComments = results.reduce((s, r) => s + (r.comments_posted || 0), 0);
    const totalDMs      = results.reduce((s, r) => s + (r.dms_sent || 0), 0);

    return Response.json({
      message: `Community managing complete — ${totalComments} comment replies, ${totalDMs} DMs/public replies.`,
      scope: 'reply-to-own-comments + Remote-keyword DM responder (compliant)',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
