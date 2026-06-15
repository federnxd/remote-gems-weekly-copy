import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lightweight category guesser (mirrors the frontend's categoryGuess) so the
// backend can set a sensible category when creating roles.
function categoryGuess(title) {
  const t = (title || '').toLowerCase();
  if (/engineer|developer|devops|python|ios|android|backend|frontend|full.stack|full stack|ml |ai |machine learning|data engineer|data analyst|data science|software|cloud|cybersecurity|blockchain|qa |quality assurance|mobile dev|web dev|sre |site reliability|platform engineer|infrastructure|firmware|embedded|architect|data platform|mlops|llm|nlp|computer vision|robotics|database admin|dba|systems|gameplay|data capture|annotation|labeling|tagger/.test(t)) return 'engineering';
  if (/ux|ui |user interface|user experience|graphic design|brand design|visual design|illustrat|adobe|motion graphic|animation|3d artist|photo|web design|product design|interaction design|figma|sketch/.test(t)) return 'design';
  if (/audio|voice actor|voice over|voiceover|crowd worker|field record|recording expert|sound|music|speech|accent|dialect|film editor|video edit|video produc|runops|podcast|narrator|broadcaster|streamer|voice coach|voice director/.test(t)) return 'media';
  if (/language expert|language specialist|linguist|translat|interpret|locali[sz]|subtitl|caption|transcri|proofreader|bilingual|multilingual/.test(t)) return 'language';
  if (/writer|author|journalist|content|copywriter|linguistic|philosophy|editor|blogger|seo|social media|marketing|communication|public relation|brand strategist/.test(t)) return 'content';
  if (/attorney|general counsel|legal expert|legal counsel|paralegal|compliance officer|legal/.test(t)) return 'finance_legal';
  if (/finance|financial|investment|investor|cpa|accountant|tax|bookkeep|treasurer|controller|actuar|underwriter|banker|budget|audit|revenue|profit|economic|business analyst|business dev|sales|account manager|customer success|hr |human resource|recruiter|talent|product manager|project manager|program manager|operations|chief|director|vp |ceo|cto|cfo|manager|executive|coordinator|administrator|consultant|advisor|strategist|analyst|wealth|portfolio|asset/.test(t)) return 'business';
  if (/biolog|health|medical|clinical|nurse|doctor|pharma|stem|scientist|researcher|lab|chemistry|physic|neuroscien|genomic|biotech|radiolog|psycholog|therapist|nutritionist|epidemiolog|neurolog|dentist|optometr|veterinar|surgeon/.test(t)) return 'science';
  if (/supervisor|clerk|hospitality|hotel|motel|resort|landscap|groundskeep|service worker|specialist/.test(t)) return 'management';
  return 'other';
}

// Splits the raw pasted list into smaller line-chunks so each LLM call stays
// fast (big lists otherwise take 20s+ and the frontend request times out).
function chunkLines(text, linesPerChunk) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    chunks.push(lines.slice(i, i + linesPerChunk).join('\n'));
  }
  return chunks;
}

async function extractChunk(db, chunkText) {
  const result = await db.integrations.Core.InvokeLLM({
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
5. Return ALL roles found.

Text to parse:
${chunkText}`,
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
  return result?.roles || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { syncText } = await req.json();
    if (!syncText?.trim()) return Response.json({ error: 'No text provided' }, { status: 400 });

    const db = base44.asServiceRole;

    // Split into chunks of ~15 lines and extract them in parallel — keeps each
    // LLM call short so even 50+ role lists finish quickly.
    const chunks = chunkLines(syncText, 15);
    const chunkResults = await Promise.all(chunks.map(c => extractChunk(db, c)));

    // Merge + dedupe by lowercased title (later chunks win on signal flags).
    const byTitle = new Map();
    for (const roles of chunkResults) {
      for (const r of roles) {
        if (!r.title?.trim()) continue;
        const key = r.title.trim().toLowerCase();
        const prev = byTitle.get(key) || {};
        byTitle.set(key, {
          title: r.title.trim(),
          is_new: r.is_new || prev.is_new || false,
          is_high_demand: r.is_high_demand || prev.is_high_demand || false,
          openings: r.openings || prev.openings || 0,
          required_skills: r.required_skills || prev.required_skills || '',
          pay_rate: r.pay_rate || prev.pay_rate || '',
        });
      }
    }
    const extracted = [...byTitle.values()];

    // ── Persist directly in the backend ──────────────────────────────────
    // Doing the DB writes here (instead of in the browser after the response)
    // means the whole sync completes in one request and can't be lost to a
    // frontend timeout.
    const existingRoles = await db.entities.OpenRole.list('-created_date', 1000);
    const extractedTitles = new Set(extracted.map(r => r.title.toLowerCase()));
    const existingTitles = new Set(existingRoles.map(r => r.title.toLowerCase()));

    const newOnes = extracted.filter(r => !existingTitles.has(r.title.toLowerCase()));
    const toUpdate = existingRoles.filter(r => extractedTitles.has(r.title.toLowerCase()));
    const removed = existingRoles.filter(r => !extractedTitles.has(r.title.toLowerCase()));

    await Promise.all([
      ...newOnes.map(r => db.entities.OpenRole.create({
        title: r.title,
        category: categoryGuess(r.title),
        priority: r.is_high_demand ? 'high' : 'medium',
        is_active: true,
        is_new: r.is_new || false,
        is_high_demand: r.is_high_demand || false,
        openings: r.openings || 0,
        required_skills: r.required_skills || '',
        pay_rate: r.pay_rate || '',
      })),
      ...toUpdate.map(role => {
        const m = extracted.find(r => r.title.toLowerCase() === role.title.toLowerCase());
        return db.entities.OpenRole.update(role.id, {
          openings: m.openings ?? role.openings,
          is_new: m.is_new || false,
          is_high_demand: m.is_high_demand || false,
          required_skills: m.required_skills || role.required_skills || '',
          pay_rate: m.pay_rate || role.pay_rate || '',
          is_active: true,
        });
      }),
      ...removed.map(role => db.entities.OpenRole.update(role.id, { is_active: false, is_new: false, is_high_demand: false })),
    ]);

    return Response.json({
      roles: extracted,
      added: newOnes.length,
      updated: toUpdate.length,
      deactivated: removed.length,
      newRoles: newOnes.filter(r => r.is_new),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});