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

    // Snapshot existing roles ONCE up front so we can decide create-vs-update
    // as each chunk arrives.
    const existingRoles = await db.entities.OpenRole.list('-created_date', 1000);
    const existingByTitle = new Map(existingRoles.map(r => [r.title.toLowerCase(), r]));

    // Split into chunks of ~30 lines. Bigger chunks = fewer LLM calls = far
    // fewer rate-limit (429) hits and faster total runtime.
    const chunks = chunkLines(syncText, 30);

    // Process chunks in parallel, but each chunk PERSISTS its own roles as soon
    // as its LLM extraction returns — instead of waiting for every chunk to
    // finish. This means roles start appearing in the UI (via the frontend's
    // refetch loop) within a few seconds, long before the request completes,
    // so a browser timeout can no longer "lose" the result.
    const seen = new Set();          // titles handled this run (dedupe across chunks)
    const extracted = [];            // merged result returned to the caller
    const newRolesForPosts = [];     // brand-new roles flagged is_new

    await Promise.all(chunks.map(async (chunkText) => {
      const roles = await extractChunk(db, chunkText);

      const toCreate = [];
      for (const r of roles) {
        if (!r.title?.trim()) continue;
        const key = r.title.trim().toLowerCase();
        if (seen.has(key)) continue;   // already handled by another chunk
        seen.add(key);

        const clean = {
          title: r.title.trim(),
          is_new: r.is_new || false,
          is_high_demand: r.is_high_demand || false,
          openings: r.openings || 0,
          required_skills: r.required_skills || '',
          pay_rate: r.pay_rate || '',
        };
        extracted.push(clean);

        const existing = existingByTitle.get(key);
        if (existing) {
          // Update in place (kept light; updates are rare relative to creates).
          await db.entities.OpenRole.update(existing.id, {
            openings: clean.openings ?? existing.openings,
            is_new: clean.is_new,
            is_high_demand: clean.is_high_demand,
            required_skills: clean.required_skills || existing.required_skills || '',
            pay_rate: clean.pay_rate || existing.pay_rate || '',
            is_active: true,
          });
        } else {
          toCreate.push({
            title: clean.title,
            category: categoryGuess(clean.title),
            priority: clean.is_high_demand ? 'high' : 'medium',
            is_active: true,
            is_new: clean.is_new,
            is_high_demand: clean.is_high_demand,
            openings: clean.openings,
            required_skills: clean.required_skills,
            pay_rate: clean.pay_rate,
          });
          if (clean.is_new) newRolesForPosts.push(clean);
        }
      }

      // One bulk write per chunk — fast and never rate-limits.
      if (toCreate.length > 0) {
        await db.entities.OpenRole.bulkCreate(toCreate);
      }
    }));

    const newOnes = newRolesForPosts; // for the response summary below
    const extractedTitles = new Set(extracted.map(r => r.title.toLowerCase()));

    // Deactivate roles that are no longer in the pasted list.
    const removed = existingRoles.filter(r => !extractedTitles.has(r.title.toLowerCase()));
    const toUpdate = existingRoles.filter(r => extractedTitles.has(r.title.toLowerCase()));

    // Deactivations (removed roles) — run in small sequential batches to stay
    // under the rate limit. Updates were already applied inline per-chunk above.
    const deactivateOps = removed.map(role => () =>
      db.entities.OpenRole.update(role.id, { is_active: false, is_new: false, is_high_demand: false })
    );

    const BATCH = 5;
    for (let i = 0; i < deactivateOps.length; i += BATCH) {
      await Promise.all(deactivateOps.slice(i, i + BATCH).map(fn => fn()));
      if (i + BATCH < deactivateOps.length) await new Promise(res => setTimeout(res, 300));
    }

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