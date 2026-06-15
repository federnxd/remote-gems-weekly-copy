import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ============================================================================
// importInstagramPosts — pulls recent IG media and creates GeneratedPost
// records for posts that aren't already tracked.
//
// Why: the daily stats sync only sees posts that have an ig_post_id stored in
// GeneratedPost. Posts you made manually from the Instagram app — reels,
// images, carousels — were invisible to the app. This function discovers them
// so they show up in analytics, get stats synced daily, and have the comment
// responder available on them.
//
// What it does:
//   1. Fetches your IG account's recent media list (cap at maxResults).
//   2. For each item, checks if a GeneratedPost with that ig_post_id already
//      exists. If yes, skips it (idempotent — safe to re-run).
//   3. For new items, creates a GeneratedPost record with:
//      - the caption as content (so the keyword detector sees the same text
//        someone reading the post would)
//      - ig_post_id set
//      - status: 'published' (it's already live on IG)
//      - media_type set (IMAGE / VIDEO / CAROUSEL_ALBUM / REELS)
//      - imported_from: 'instagram' so it's distinguishable from app posts
//      - notes tagged with the media type for the planner/analytics
//
// Idempotent: re-running adds only new posts; existing records aren't touched.
// ============================================================================

const DEFAULT_DAYS_BACK = 60;
const DEFAULT_MAX_RESULTS = 50;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const daysBack = body.daysBack ?? DEFAULT_DAYS_BACK;
    const maxResults = Math.min(100, body.maxResults ?? DEFAULT_MAX_RESULTS);

    const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');
    const pageToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    if (!igAccountId || !pageToken) {
      return Response.json({
        error: 'Instagram credentials missing. Set INSTAGRAM_ACCOUNT_ID and FACEBOOK_PAGE_ACCESS_TOKEN in function settings.',
      }, { status: 400 });
    }

    // Fetch recent media — caption + media type + timestamp + permalink.
    const fields = 'id,caption,media_type,timestamp,permalink';
    const url = `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${fields}&limit=${maxResults}&access_token=${pageToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json({ error: `Instagram media fetch failed: ${res.status} ${await res.text()}` }, { status: 502 });
    }
    const payload = await res.json();
    const media = Array.isArray(payload.data) ? payload.data : [];

    // Filter by time window — we only import recent posts to keep the table tidy.
    const cutoff = new Date(Date.now() - daysBack * 24 * 3600 * 1000);
    const recent = media.filter(m => {
      if (!m.timestamp) return true; // if IG doesn't give a timestamp, include
      return new Date(m.timestamp) >= cutoff;
    });

    // Find which ig_post_ids we already track, so we don't re-create them.
    const existingPosts = await db.entities.GeneratedPost.list('-created_date', 500);
    const existingIgIds = new Set(
      existingPosts.filter(p => p.ig_post_id).map(p => String(p.ig_post_id))
    );

    let createdCount = 0;
    let skippedCount = 0;
    const created = [];

    for (const m of recent) {
      if (existingIgIds.has(String(m.id))) {
        skippedCount++;
        continue;
      }
      try {
        const mediaType = (m.media_type || 'IMAGE').toUpperCase();
        const caption = m.caption || '(no caption)';
        // Build a short title from the caption first line.
        const firstLine = caption.split('\n')[0].slice(0, 80);
        const title = `[IG ${mediaType}] ${firstLine}${firstLine.length === 80 ? '…' : ''}`;
        // Notes carry the media type + import marker so the planner & analytics
        // can distinguish reels from image posts and imported from app-published.
        const notes = `[IMPORTED] platform:instagram media_type:${mediaType.toLowerCase()} permalink:${m.permalink || ''}`;

        const record = await db.entities.GeneratedPost.create({
          title,
          content: caption,
          strategy: 'targeted_role', // imported posts have no strategy from us; use the default
          status: 'published',
          ig_post_id: m.id,
          media_type: mediaType,
          imported_from: 'instagram',
          notes,
        });
        created.push({ postId: record.id, ig_post_id: m.id, media_type: mediaType });
        createdCount++;
      } catch (e) {
        // skip this one — could be a schema validation issue on an exotic media_type
        skippedCount++;
      }
    }

    return Response.json({
      message: `Imported ${createdCount} new Instagram post(s); ${skippedCount} already tracked or skipped.`,
      imported: createdCount,
      skipped: skippedCount,
      window_days: daysBack,
      total_media_fetched: media.length,
      created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
