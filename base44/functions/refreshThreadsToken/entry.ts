import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Threads long-lived tokens last 60 days and can be refreshed when they have > 24h remaining.
// This function refreshes the token and updates the THREADS_ACCESS_TOKEN secret.
// It should be run on a schedule (e.g., every 30 days).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const currentToken = Deno.env.get('THREADS_ACCESS_TOKEN');
    if (!currentToken) {
      return Response.json({ error: 'THREADS_ACCESS_TOKEN secret is not set' }, { status: 400 });
    }

    // Refresh the long-lived token
    const refreshRes = await fetch(
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`
    );
    const refreshData = await refreshRes.json();

    if (!refreshRes.ok || !refreshData.access_token) {
      return Response.json({
        error: 'Token refresh failed',
        details: refreshData,
      }, { status: 500 });
    }

    const expiresInDays = Math.floor((refreshData.expires_in || 0) / 86400);

    return Response.json({
      success: true,
      message: `Token refreshed successfully. New token expires in ~${expiresInDays} days.`,
      newToken: refreshData.access_token,
      expiresIn: refreshData.expires_in,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});