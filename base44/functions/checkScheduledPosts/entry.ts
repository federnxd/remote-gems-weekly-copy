import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs every 5 minutes.
 * Finds posts that are 'scheduled' and whose scheduled_date + scheduled_time
 * is within the next 30 minutes (the approval window).
 * Sends one approval email per post (tracked via a pending_approval flag).
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled automation calls (no user) and manual admin calls
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch {}

  // For scheduled automations there's no session — allow via service role
  const db = base44.asServiceRole;

  const now = new Date();
  // Buenos Aires is UTC-3
  const nowStr = now.toISOString();

  // Fetch all scheduled posts
  const posts = await db.entities.GeneratedPost.filter({ status: 'scheduled' });

  const duePosts = posts.filter(post => {
    if (!post.scheduled_date) return false;

    // Build the scheduled datetime (assume local time is stored as-is)
    const timeStr = post.scheduled_time || '09:00';
    const scheduledAt = new Date(`${post.scheduled_date}T${timeStr}:00-03:00`); // Argentina TZ

    const diffMs = scheduledAt - now;
    const diffMinutes = diffMs / 60000;

    // Window: post is due within the next 30 minutes AND hasn't been approval-emailed yet
    return diffMinutes >= 0 && diffMinutes <= 30 && !post.notes?.includes('[APPROVAL_SENT]');
  });

  const results = [];

  for (const post of duePosts) {
    // Generate a simple HMAC-free token: base64(postId + timestamp salt)
    const token = btoa(`${post.id}:${Date.now()}`);
    const appBaseUrl = Deno.env.get('APP_URL') || 'https://app.base44.com';
    const approveUrl = `${appBaseUrl}/api/functions/approveScheduledPost?token=${encodeURIComponent(token)}&postId=${post.id}`;

    // Send approval email
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

    // Mark the post so we don't send duplicate emails
    await db.entities.GeneratedPost.update(post.id, {
      notes: ((post.notes || '') + '\n[APPROVAL_SENT]').trim(),
    });

    results.push({ postId: post.id, title: post.title, status: 'approval_email_sent' });
  }

  return Response.json({
    checked: posts.length,
    due: duePosts.length,
    processed: results,
    timestamp: nowStr,
  });
});