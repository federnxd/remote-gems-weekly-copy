import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { syncText } = await req.json();
    if (!syncText?.trim()) return Response.json({ error: 'No text provided' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract all job roles from the following text. For each role extract:
- "title": the job title (string)
- "is_new": true if the role is labeled or tagged as "NEW" (e.g. "NEW", "🆕", "new role"), false otherwise
- "is_high_demand": true if the role is labeled as "High demand", "High Demand", "🔥", or similar urgency indicators, false otherwise
- "openings": number of open positions (look for patterns like "3 openings", "(5)", "x2", "2 positions"). Use 0 if not found.
- "required_skills": key skills or requirements mentioned for this role (short comma-separated string, e.g. "Python, 3+ years exp, ML"). Empty string if not found.
- "pay_rate": any pay/compensation info for this role (e.g. "$25/hr", "$80k-120k", "up to $50/hr"). Empty string if not found.

Return a JSON object with a "roles" array.

Text:
${syncText}`,
      response_json_schema: {
        type: 'object',
        properties: {
          roles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                is_new: { type: 'boolean' },
                is_high_demand: { type: 'boolean' },
                openings: { type: 'number' },
                required_skills: { type: 'string' },
                pay_rate: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({ roles: result?.roles || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});