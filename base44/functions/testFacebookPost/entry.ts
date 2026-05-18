import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');

    if (!pageToken || !pageId) {
      return Response.json({ error: 'Facebook credentials not configured' }, { status: 400 });
    }

    const message = `🌍 Remote work is the future — and we're here to help you find your next opportunity!\n\nStay tuned to this page for weekly remote job postings across engineering, design, content, and more. 💼✨\n\n#RemoteWork #RemoteJobs #Hiring #WorkFromAnywhere`;

    // Use query string approach which is more reliable
    const url = `https://graph.facebook.com/v19.0/${pageId}/feed?message=${encodeURIComponent(message)}&access_token=${pageToken}`;

    const res = await fetch(url, {
      method: 'POST',
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json({ 
        error: 'Facebook API error', 
        details: data,
        status: res.status 
      }, { status: 500 });
    }

    return Response.json({ success: true, postId: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});