import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');

    // Fetch Instagram Business Account ID linked to this page
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );
    const igData = await igRes.json();

    if (!igData.instagram_business_account) {
      return Response.json({ 
        error: 'No Instagram account linked to this page',
        pageId,
        rawResponse: igData 
      }, { status: 400 });
    }

    const igAccountId = igData.instagram_business_account.id;

    // Also fetch basic info to confirm it's valid
    const infoRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=name,username&access_token=${pageToken}`
    );
    const infoData = await infoRes.json();

    return Response.json({
      instagramAccountId: igAccountId,
      name: infoData.name,
      username: infoData.username,
      message: 'Update your INSTAGRAM_ACCOUNT_ID secret with this value'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});