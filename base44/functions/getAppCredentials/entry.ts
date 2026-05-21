import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Temporary helper to retrieve app credentials for manual token exchange.
// Admin only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({
      FACEBOOK_APP_ID: Deno.env.get('FACEBOOK_APP_ID'),
      FACEBOOK_APP_SECRET: Deno.env.get('FACEBOOK_APP_SECRET'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});