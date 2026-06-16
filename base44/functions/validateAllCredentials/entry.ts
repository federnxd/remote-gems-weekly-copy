import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
    const igAccountId = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID');
    const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');
    const threadsUserId = Deno.env.get('THREADS_USER_ID');

    const results = {};

    // ── FACEBOOK: Validate token and page ─────────────────────────────────
    try {
      // Check if token is valid and get actual page info
      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=name,access_token&access_token=${pageToken}`
      );
      const fbData = await fbRes.json();
      
      if (!fbRes.ok) {
        results.facebook = { valid: false, error: fbData.error?.message };
      } else {
        results.facebook = { 
          valid: true, 
          pageName: fbData.name,
          pageIdMatch: fbData.id === pageId,
          hasPageToken: !!fbData.access_token
        };
      }
    } catch (e) {
      results.facebook = { valid: false, error: e.message };
    }

    // ── INSTAGRAM: Validate account and permissions ───────────────────────
    try {
      // Check if IG account exists and is accessible
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${igAccountId}?fields=name,username,media_count&access_token=${pageToken}`
      );
      const igData = await igRes.json();
      
      if (!igRes.ok) {
        results.instagram = { valid: false, error: igData.error?.message };
      } else {
        // Account accessible — publishing capability verified via testSocialPlatforms
        results.instagram = { 
          valid: true,
          accountName: igData.name,
          username: igData.username,
          mediaCount: igData.media_count
        };
      }
    } catch (e) {
      results.instagram = { valid: false, error: e.message };
    }

    // ── THREADS: Validate token and user ─────────────────────────────────
    try {
      // Check if token is valid by fetching user info
      const threadsRes = await fetch(
        `https://graph.threads.net/v1.0/${threadsUserId}?access_token=${threadsToken}`
      );
      const threadsData = await threadsRes.json();
      
      if (!threadsRes.ok) {
        results.threads = { valid: false, error: threadsData.error?.message };
      } else {
        results.threads = { 
          valid: true, 
          userId: threadsUserId,
          tokenValid: true
        };
      }
    } catch (e) {
      results.threads = { valid: false, error: e.message };
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});