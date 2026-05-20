import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs every 5 minutes.
 * - LinkedIn posts: sends approval email (human must approve before publishing)
 * - All other platforms (Mastodon, Bluesky, Threads, Facebook, Twitter, etc.):
 *   auto-published directly at scheduled time (no approval needed)
 */

const LINKEDIN_PLATFORMS = ['linkedin'];

// Detect platform from post notes field (set during generation)
function getPlatformFromPost(post) {
  const notesMatch = post.notes?.match(/platform:(\S+)/);
  return notesMatch ? notesMatch[1] : null;
}

async function publishTwitter(text) {
  const apiKey = Deno.env.get('TWITTER_API_KEY');
  const apiSecret = Deno.env.get('TWITTER_API_SECRET');
  const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
  const accessSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');

  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const sortedParams = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;

  const keyData = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', keyData, new TextEncoder().encode(baseString));
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  const authHeader = 'OAuth ' + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  const tweetText = text.length > 280 ? text.slice(0, 277) + '...' : text;
  const res = await fetch(url, {
    method,
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: tweetText }),
  });
  if (!res.ok) throw new Error(`Twitter API: ${await res.text()}`);
  const data = await res.json();
  return data.data?.id;
}

async function publishFacebook(text) {
  const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, access_token: pageAccessToken }),
  });
  if (!res.ok) throw new Error(`Facebook API: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

async function publishMastodon(text) {
  const instanceUrl = Deno.env.get('MASTODON_INSTANCE_URL');
  const accessToken = Deno.env.get('MASTODON_ACCESS_TOKEN');
  const postText = text.length > 500 ? text.slice(0, 497) + '...' : text;
  const baseUrl = instanceUrl.replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: postText, visibility: 'public' }),
  });
  if (!res.ok) throw new Error(`Mastodon API: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

async function publishBluesky(text) {
  const handle = Deno.env.get('BLUESKY_HANDLE');
  const appPassword = Deno.env.get('BLUESKY_APP_PASSWORD');
  const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!sessionRes.ok) throw new Error(`Bluesky auth: ${await sessionRes.text()}`);
  const { accessJwt, did } = await sessionRes.json();
  const postText = text.length > 300 ? text.slice(0, 297) + '...' : text;
  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: { $type: 'app.bsky.feed.post', text: postText, createdAt: new Date().toISOString() },
    }),
  });
  if (!postRes.ok) throw new Error(`Bluesky post: ${await postRes.text()}`);
  const data = await postRes.json();
  return data.uri;
}

async function publishThreads(text) {
  const accessToken = Deno.env.get('THREADS_ACCESS_TOKEN');
  const userId = Deno.env.get('THREADS_USER_ID');
  const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'TEXT', text: text.slice(0, 500), access_token: accessToken }),
  });
  if (!createRes.ok) throw new Error(`Threads create: ${await createRes.text()}`);
  const { id: containerId } = await createRes.json();
  const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Threads publish: ${await publishRes.text()}`);
  const data = await publishRes.json();
  return data.id;
}

async function autoPublish(platform, content) {
  switch (platform) {
    case 'twitter':    return publishTwitter(content);
    case 'facebook':   return publishFacebook(content);
    case 'mastodon':   return publishMastodon(content);
    case 'bluesky':    return publishBluesky(content);
    case 'threads':    return publishThreads(content);
    default:           return null; // job boards, reddit, discord — manual copy-paste
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  const now = new Date();
  const nowStr = now.toISOString();

  // Fetch all scheduled posts
  const posts = await db.entities.GeneratedPost.filter({ status: 'scheduled' });

  const duePosts = posts.filter(post => {
    if (!post.scheduled_date) return false;
    const timeStr = post.scheduled_time || '09:00';
    const scheduledAt = new Date(`${post.scheduled_date}T${timeStr}:00-03:00`); // Argentina TZ
    const diffMs = scheduledAt - now;
    const diffMinutes = diffMs / 60000;
    return diffMinutes >= 0 && diffMinutes <= 30 && !post.notes?.includes('[APPROVAL_SENT]') && !post.notes?.includes('[AUTO_PUBLISHED]');
  });

  const results = [];

  for (const post of duePosts) {
    const platform = getPlatformFromPost(post);

    // LinkedIn: send approval email (human must approve)
    if (!platform || LINKEDIN_PLATFORMS.includes(platform)) {
      const token = btoa(`${post.id}:${Date.now()}`);
      const appBaseUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';
      const approveUrl = `${appBaseUrl}/api/functions/approveScheduledPost?token=${encodeURIComponent(token)}&postId=${post.id}`;
      const timeDisplay = post.scheduled_time || '09:00';

      await db.integrations.Core.SendEmail({
        to: Deno.env.get('APPROVAL_EMAIL') || 'admin@example.com',
        subject: `✅ Approve LinkedIn Post: "${post.title}" scheduled for ${post.scheduled_date} ${timeDisplay}`,
        body: `
Hi,

A LinkedIn post is scheduled to go out at ${timeDisplay} on ${post.scheduled_date} (Argentina time).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 POST TITLE: ${post.title}
🎯 STRATEGY: ${(post.strategy || '').replace(/_/g, ' ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTENT PREVIEW:
${post.content?.slice(0, 500)}${post.content?.length > 500 ? '\n…[truncated]' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 CLICK TO APPROVE & PUBLISH:
${approveUrl}

If you do NOT want this post published, simply ignore this email.

– Your LinkedIn Automation
        `.trim(),
      });

      await db.entities.GeneratedPost.update(post.id, {
        notes: ((post.notes || '') + '\n[APPROVAL_SENT]').trim(),
      });

      results.push({ postId: post.id, title: post.title, platform: 'linkedin', status: 'approval_email_sent' });

    } else {
      // Non-LinkedIn: auto-publish directly
      try {
        const postId = await autoPublish(platform, post.content);
        const cleanNotes = (post.notes || '').trim();
        await db.entities.GeneratedPost.update(post.id, {
          status: 'published',
          notes: (cleanNotes + '\n[AUTO_PUBLISHED]').trim(),
        });
        results.push({ postId: post.id, title: post.title, platform, status: 'auto_published', externalId: postId });
      } catch (err) {
        // Mark as failed in notes so we don't retry endlessly
        await db.entities.GeneratedPost.update(post.id, {
          notes: ((post.notes || '') + `\n[PUBLISH_ERROR: ${err.message.slice(0, 100)}]`).trim(),
        });
        results.push({ postId: post.id, title: post.title, platform, status: 'error', error: err.message });
      }
    }
  }

  return Response.json({
    checked: posts.length,
    due: duePosts.length,
    processed: results,
    timestamp: nowStr,
  });
});