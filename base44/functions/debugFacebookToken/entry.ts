import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');

    // Check what permissions this token actually has
    const permRes = await fetch(
      `https://graph.facebook.com/v19.0/me/permissions?access_token=${pageToken}`
    );
    const permData = await permRes.json();

    // Check token type (user vs page)
    const debugRes = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${pageToken}&access_token=${pageToken}`
    );
    const debugData = await debugRes.json();

    // Try fetching page-scoped token
    const pageRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=name,access_token&access_token=${pageToken}`
    );
    const pageData = await pageRes.json();

    // Try posting with the page's own token if available
    let postTest = null;
    const effectiveToken = pageData.access_token || pageToken;
    const postRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test post - please ignore', access_token: effectiveToken }),
    });
    postTest = await postRes.json();

    // Get the actual page ID from the token itself
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${pageToken}`);
    const meData = await meRes.json();

    return Response.json({
      tokenType: debugData?.data?.type,
      tokenScopes: debugData?.data?.scopes,
      actualPageId: meData.id,
      actualPageName: meData.name,
      configuredPageId: pageId,
      pageIdMatch: meData.id === pageId,
      postTest,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});