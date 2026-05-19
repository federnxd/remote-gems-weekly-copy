import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');

    if (!pageAccessToken || !pageId) {
      return Response.json({ error: 'FACEBOOK_PAGE_ACCESS_TOKEN or FACEBOOK_PAGE_ID not set' }, { status: 400 });
    }

    // Fetch Instagram Business Account linked to the Facebook Page
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );
    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: 'Facebook API error', details: data }, { status: 500 });
    }

    if (!data.instagram_business_account) {
      return Response.json({ 
        error: 'No Instagram Business Account linked to this Facebook Page',
        hint: 'Make sure your Instagram is a Business/Creator account and connected to this Facebook Page',
        pageData: data
      }, { status: 404 });
    }

    return Response.json({ 
      success: true,
      instagramUserId: data.instagram_business_account.id,
      message: `Set INSTAGRAM_USER_ID = ${data.instagram_business_account.id}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});