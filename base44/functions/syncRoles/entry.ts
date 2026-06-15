import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { syncText } = await req.json();
    if (!syncText?.trim()) return Response.json({ error: 'No text provided' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are a precise data extractor. Extract every job role from the text below.

For EACH role, extract these fields:
- "title": the job title only (no tags, no extra text)
- "is_new": true ONLY if "NEW", "New", or "🆕" appears on the same line as the role title
- "is_high_demand": true if "High Demand", "high demand", "HIGH DEMAND", or "🔥" appears ANYWHERE on the same line as the role title. This is the most important field — do NOT miss it. When in doubt, set to true.
- "openings": integer count of open positions. Look for patterns like "3 openings", "(5)", "x2", "2 positions", "5 spots". Default 0.
- "required_skills": comma-separated key skills for this role. Empty string if none.
- "pay_rate": pay/compensation info (e.g. "$25/hr", "$80k"). Empty string if none.

CRITICAL RULES:
1. Process EVERY line that contains a job title — do not skip any.
2. For is_high_demand: scan the ENTIRE line. If "High Demand" or "🔥" is anywhere on it, set true.
3. For is_new: scan the ENTIRE line. If "NEW", "New", or "🆕" is anywhere on it, set true.
4. A role can be BOTH is_new AND is_high_demand simultaneously.
5. Return ALL roles found, even if there are 50+.

Text to parse:
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