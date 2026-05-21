import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: 'No code provided' }, { status: 400 });

    const appId = Deno.env.get('FACEBOOK_APP_ID');
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    const redirectUri = 'https://remote-gems-weekly.base44.app/threads-callback';

    // Step 1: Exchange code for short-lived token
    const shortRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });
    const shortData = await shortRes.json();

    if (!shortData.access_token) {
      return Response.json({ error: 'Short-lived token exchange failed', details: shortData }, { status: 500 });
    }

    // Step 2: Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortData.access_token}`
    );
    const longData = await longRes.json();

    if (!longData.access_token) {
      return Response.json({ error: 'Long-lived token exchange failed', details: longData }, { status: 500 });
    }

    const expiresInDays = Math.floor((longData.expires_in || 0) / 86400);

    return Response.json({
      access_token: longData.access_token,
      expires_in_days: expiresInDays,
      user_id: shortData.user_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});