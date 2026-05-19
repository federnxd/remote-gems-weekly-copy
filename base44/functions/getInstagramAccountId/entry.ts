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

    // Check token permissions
    const debugRes = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${pageAccessToken}&access_token=${pageAccessToken}`
    );
    const debugData = await debugRes.json();

    // Try fetching instagram_business_account
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,instagram_business_account,connected_instagram_account&access_token=${pageAccessToken}`
    );
    const igData = await igRes.json();

    // Also try listing all pages to confirm which page we have
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${pageAccessToken}`
    );
    const pagesData = await pagesRes.json();

    return Response.json({
      pageId,
      pageData: igData,
      tokenScopes: debugData?.data?.scopes || debugData,
      pages: pagesData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});