import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');

    // Check Instagram account details and permissions
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=name,username,account_type,media_count,biography,website&access_token=${pageToken}`
    );
    const igData = await igRes.json();

    // Check connected FB page
    const pageRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/connected_fb_page?access_token=${pageToken}`
    );
    const pageData = await pageRes.json();

    return Response.json({
      accountType: igData.account_type,
      accountTypeName: igData.account_type === 1 ? 'Personal' : igData.account_type === 2 ? 'Business' : igData.account_type === 3 ? 'Creator' : 'Unknown',
      ...igData,
      connectedPage: pageData,
      note: 'Instagram must be Business (2) or Creator (3) to post via API'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});