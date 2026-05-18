import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appId = Deno.env.get('FACEBOOK_APP_ID');
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');

    if (!appId || !appSecret || !pageId) {
      return Response.json({ error: 'Facebook credentials not configured' }, { status: 400 });
    }

    // Step 1: Get app access token
    const appTokenRes = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );
    const appTokenData = await appTokenRes.json();
    if (!appTokenRes.ok) {
      return Response.json({ error: 'Failed to get app token', details: appTokenData }, { status: 500 });
    }

    // Step 2: Get page access token using app token
    const pageTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${appTokenData.access_token}`
    );
    const pageTokenData = await pageTokenRes.json();
    if (!pageTokenRes.ok || !pageTokenData.access_token) {
      return Response.json({ error: 'Failed to get page token', details: pageTokenData }, { status: 500 });
    }

    const pageAccessToken = pageTokenData.access_token;
    const message = `🌍 Remote work is the future — and we're here to help you find your next opportunity!\n\nStay tuned to this page for weekly remote job postings across engineering, design, content, and more. 💼✨\n\n#RemoteWork #RemoteJobs #Hiring #WorkFromAnywhere`;

    // Step 3: Post to page
    const postUrl = `https://graph.facebook.com/v19.0/${pageId}/feed?message=${encodeURIComponent(message)}&access_token=${pageAccessToken}`;
    const postRes = await fetch(postUrl, { method: 'POST' });
    const postData = await postRes.json();

    if (!postRes.ok) {
      return Response.json({ error: 'Facebook post failed', details: postData }, { status: 500 });
    }

    return Response.json({ success: true, postId: postData.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});