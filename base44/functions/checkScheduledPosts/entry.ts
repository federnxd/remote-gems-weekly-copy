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
  const resText = await res.text();
  if (!res.ok) throw new Error(`Facebook API: ${resText}`);
  const data = JSON.parse(resText);
  if (!data.id) throw new Error('Facebook returned no post ID');
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
  
  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: { $type: 'app.bsky.feed.post', text: text, createdAt: new Date().toISOString() },
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
    body: JSON.stringify({ media_type: 'TEXT', text: text, access_token: accessToken }),
  });
  if (!createRes.ok) throw new Error(`Threads create: ${await createRes.text()}`);
  const { id: containerId } = await createRes.json();
  const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Threads publish: ${await createRes.text()}`);
  const data = await publishRes.json();
  return data.id;
}

async function generateInstagramImage(base44, text) {
  // Instagram has no text-only post type — it requires an image or video.
  // Generate a thematic image from the post content, matching publishToSocialMedia.
  const keywords = text.slice(0, 200);
  const prompt = `A vibrant, modern, professional social media image for Instagram about remote work and AI jobs. The image should evoke themes of: remote work, technology, global talent, careers, hiring, AI industry. Style: clean, bold, visually striking, no text overlay. Inspired by: "${keywords}". Bright colors, professional aesthetic, suitable for a tech recruitment brand.`;
  const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
  return result.url;
}

async function publishInstagram(text, base44) {
  // Instagram Graph API uses the FACEBOOK PAGE token (not the Threads token),
  // and requires a media container backed by a real image_url.
  const accessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  const userId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
  if (!accessToken || !userId) {
    throw new Error('Instagram credentials not configured (FACEBOOK_PAGE_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID).');
  }

  const imageUrl = await generateInstagramImage(base44, text);

  // Step 1: create media container with the generated image
  const createRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: text,
      access_token: accessToken,
    }),
  });
  if (!createRes.ok) throw new Error(`Instagram create: ${await createRes.text()}`);
  const { id: containerId } = await createRes.json();

  // Step 2: wait for Instagram to process the media (fixed wait is more reliable than the status API)
  await new Promise(r => setTimeout(r, 60000));

  // Step 3: publish the container
  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });
  if (!publishRes.ok) throw new Error(`Instagram publish: ${await publishRes.text()}`);
  const data = await publishRes.json();
  return data.id;
}

async function autoPublish(platform, content, base44) {
  switch (platform) {
    case 'twitter':    return publishTwitter(content);
    case 'facebook':   return publishFacebook(content);
    case 'instagram':  return publishInstagram(content, base44);
    case 'mastodon':   return publishMastodon(content);
    case 'bluesky':    return publishBluesky(content);
    case 'threads':    return publishThreads(content);
    default:           return null; // job boards, reddit, discord — manual copy-paste
  }
}

// Per-platform UTM stamping (same approach as publishToSocialMedia):
// rewrites the micro1 referral link to add utm_content=p<postId>_<platform>
// so each scheduled publish gets unique attribution.
function stampLink(text, postId, platform) {
  if (!text || !postId) return text;
  return text.replace(
    /(https:\/\/refer\.micro1\.ai\/referral\/jobs\?[^\s)"']+)/g,
    (url) => {
      const cleaned = url.replace(/([?&])utm_content=[^&]*/g, '$1').replace(/[?&]$/, '');
      const sep = cleaned.includes('?') ? '&' : '?';
      return `${cleaned}${sep}utm_content=p${postId}_${platform}`;
    }
  );
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
      return Response.json({ message: 'Auto-posting is paused. Skipping scheduled-posts check.', paused: true });
    }
  } catch { /* if the settings entity is missing, default to running */ }

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
    // Publish if: within 30 min window OR already overdue (diffMinutes < 0 but still today)
    const isOverdue = diffMinutes < 0 && diffMinutes > -1440; // within last 24 hours
    const isDueSoon = diffMinutes >= 0 && diffMinutes <= 30;
    return (isDueSoon || isOverdue) && !post.notes?.includes('[APPROVAL_SENT]') && !post.notes?.includes('[AUTO_PUBLISHED]');
  });

  const results = [];

  for (const post of duePosts) {
    // Opt-in review gate: posts marked needs_review pause here until the user
    // clears the flag from the UI. This keeps risky/unreviewed posts from
    // auto-publishing.
    if (post.needs_review) {
      results.push({ postId: post.id, status: 'awaiting_review' });
      continue;
    }

    const platform = getPlatformFromPost(post);

    // LinkedIn: send approval email (human must approve)
    if (!platform || LINKEDIN_PLATFORMS.includes(platform)) {
      const token = btoa(`${post.id}:${Date.now()}`);
      const appBaseUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';
      const approveUrl = `${appBaseUrl}/api/functions/approveScheduledPost?token=${encodeURIComponent(token)}&postId=${post.id}`;
      const timeDisplay = post.scheduled_time || '09:00';

      try {
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
      } catch (emailErr) {
        // If email fails, mark post for manual review but don't block other posts
        await db.entities.GeneratedPost.update(post.id, {
          notes: ((post.notes || '') + `\n[APPROVAL_EMAIL_FAILED: ${emailErr.message.slice(0, 100)}]`).trim(),
        });
        results.push({ postId: post.id, title: post.title, platform: 'linkedin', status: 'email_failed', error: emailErr.message });
      }

    } else {
      // Non-LinkedIn: auto-publish directly
      try {
        const stamped = stampLink(post.content, post.id, platform);
        const postId = await autoPublish(platform, stamped, base44);
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