import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COMING_SOON_MESSAGE = `🚀 Something exciting is coming...

We're launching a new way to connect top remote talent with leading AI companies worldwide. 🌍

Stay tuned — big news dropping very soon! 👀

#RemoteWork #AIJobs #FutureOfWork #ComingSoon`;

const INSTAGRAM_COMING_SOON = `🚀 Something exciting is coming...

We're launching a new way to connect top remote talent with leading AI companies worldwide. 🌍✨

Stay tuned — big news dropping very soon! 👀

#RemoteWork #AIJobs #FutureOfWork #ComingSoon #RemoteJobs #Hiring`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
    const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
    const threadsUserId = Deno.env.get('THREADS_USER_ID');
    const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');

    const results = {};

    // ── Get Page-scoped access token first ────────────────────────────────
    let pageAccessToken = pageToken;
    try {
      const pageTokenRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${pageToken}`
      );
      const pageTokenData = await pageTokenRes.json();
      if (pageTokenData.access_token) {
        pageAccessToken = pageTokenData.access_token;
      }
    } catch { /* fallback to original token */ }

    // ── FACEBOOK ──────────────────────────────────────────────────────────
    try {
      const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: COMING_SOON_MESSAGE, access_token: pageAccessToken }),
      });
      const fbData = await fbRes.json();
      if (!fbRes.ok) {
        results.facebook = { success: false, error: fbData.error?.message || JSON.stringify(fbData) };
      } else {
        results.facebook = { success: true, postId: fbData.id };
      }
    } catch (e) {
      results.facebook = { success: false, error: e.message };
    }

    // ── INSTAGRAM ─────────────────────────────────────────────────────────
    try {
      const igImageUrl = 'https://media.base44.com/images/public/69fa0f8cf2ee4daa2ecf29f3/e12bc7fb1_generated_image.png';

      // Step 1: Create media container with image
      const createRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: igImageUrl,
          caption: INSTAGRAM_COMING_SOON,
          access_token: pageAccessToken,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok || !createData.id) {
        results.instagram = { success: false, error: createData.error?.message || JSON.stringify(createData) };
      } else {
        // Step 2: Publish
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: createData.id, access_token: pageAccessToken }),
        });
        const publishData = await publishRes.json();
        if (!publishRes.ok) {
          results.instagram = { success: false, error: publishData.error?.message || JSON.stringify(publishData) };
        } else {
          results.instagram = { success: true, postId: publishData.id };
        }
      }
    } catch (e) {
      results.instagram = { success: false, error: e.message };
    }

    // ── THREADS ───────────────────────────────────────────────────────────
    try {
      // Step 1: Create media object
      const createRes = await fetch(`https://graph.threads.net/v1.0/${threadsUserId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: COMING_SOON_MESSAGE,
          access_token: threadsToken,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok || !createData.id) {
        results.threads = { success: false, error: createData.error?.message || JSON.stringify(createData) };
      } else {
        // Step 2: Publish
        const publishRes = await fetch(`https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: createData.id, access_token: threadsToken }),
        });
        const publishData = await publishRes.json();
        if (!publishRes.ok) {
          results.threads = { success: false, error: publishData.error?.message || JSON.stringify(publishData) };
        } else {
          results.threads = { success: true, postId: publishData.id };
        }
      }
    } catch (e) {
      results.threads = { success: false, error: e.message };
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});