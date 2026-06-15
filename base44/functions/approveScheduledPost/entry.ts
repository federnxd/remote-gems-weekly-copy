import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Called via the one-click approval link in the email.
 * Validates postId, publishes the post to LinkedIn, and marks it published.
 * Returns a simple HTML confirmation page.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  const url = new URL(req.url);
  const postId = url.searchParams.get('postId');
  const token  = url.searchParams.get('token');

  const html = (title, message, color = '#10b981') => new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;}
    .card{background:#fff;border-radius:16px;padding:40px 48px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;text-align:center;}
    h2{color:${color};margin:0 0 12px;}p{color:#64748b;line-height:1.6;margin:0;}</style></head>
    <body><div class="card"><h2>${title}</h2><p>${message}</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );

  if (!postId || !token) {
    return html('❌ Invalid Link', 'This approval link is missing required parameters.', '#ef4444');
  }

  // Validate the token: it's btoa(`${postId}:${timestamp}`) from checkScheduledPosts.
  // We confirm (a) it decodes cleanly, (b) the embedded postId matches the URL's
  // postId (so a token for one post can't approve another), and (c) it's not
  // older than the link lifetime — old leaked emails shouldn't approve anything.
  const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  let tokenPostId = null;
  let tokenTime = NaN;
  try {
    const decoded = atob(token);
    const colonIdx = decoded.lastIndexOf(':');
    if (colonIdx > 0) {
      tokenPostId = decoded.slice(0, colonIdx);
      tokenTime = Number(decoded.slice(colonIdx + 1));
    }
  } catch { /* malformed token */ }

  if (!tokenPostId || tokenPostId !== postId || !Number.isFinite(tokenTime)) {
    return html('❌ Invalid Approval Token', 'This approval link is malformed or does not match this post.', '#ef4444');
  }
  if (Date.now() - tokenTime > TOKEN_TTL_MS) {
    return html('⌛ Approval Link Expired', 'This approval link is older than 7 days. Re-schedule the post to get a fresh link.', '#f59e0b');
  }

  // Fetch the post
  const posts = await db.entities.GeneratedPost.filter({ id: postId });
  const post = posts?.[0];

  if (!post) {
    return html('❌ Post Not Found', `No post found with ID: ${postId}`, '#ef4444');
  }

  if (post.status === 'published') {
    return html('✅ Already Published', `"${post.title}" was already published to LinkedIn.`);
  }

  if (post.status !== 'scheduled') {
    return html('⚠️ Not Scheduled', `"${post.title}" is not in scheduled status (current: ${post.status}).`, '#f59e0b');
  }

  // Get LinkedIn access token
  const { accessToken } = await db.connectors.getConnection('linkedin');

  // Get the author URN
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return html('❌ LinkedIn Error', 'Could not fetch your LinkedIn profile. Please check your connection.', '#ef4444');
  }
  const profile = await profileRes.json();
  const authorUrn = `urn:li:person:${profile.sub}`;

  // Publish the post
  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const publishRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    return html('❌ Publish Failed', `LinkedIn returned an error: ${err}`, '#ef4444');
  }

  const result = await publishRes.json();
  const linkedInPostId = result.id;

  // Update status in DB — strip the [APPROVAL_SENT] marker from notes
  const cleanNotes = (post.notes || '').replace(/\[APPROVAL_SENT\]/g, '').trim();
  await db.entities.GeneratedPost.update(postId, {
    status: 'published',
    linkedin_post_id: linkedInPostId,
    notes: cleanNotes,
  });

  return html(
    '🎉 Published!',
    `"${post.title}" has been successfully published to LinkedIn.<br><br>LinkedIn Post ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px">${linkedInPostId}</code>`
  );
});