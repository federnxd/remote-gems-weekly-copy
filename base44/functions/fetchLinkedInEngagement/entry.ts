import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fetches engagement stats for LinkedIn UGC posts (personal member posts).
 * 
 * The linkedin_post_id stored is a urn:li:activity:... URN.
 * To get share statistics (impressions/clicks) we need urn:li:share:... 
 * which we retrieve from the ugcPost's specificContent.
 * Likes + comments come from /v2/socialActions/{activityUrn} directly.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkedInPostIds } = await req.json();
    if (!linkedInPostIds || linkedInPostIds.length === 0) {
      return Response.json({ stats: {} });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');
    const stats = {};

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    };

    await Promise.all(linkedInPostIds.map(async (activityUrn) => {
      if (!activityUrn) return;
      const encodedActivityUrn = encodeURIComponent(activityUrn);

      // 1. Get likes + comments via socialActions (works with activity URN directly)
      const socialRes = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodedActivityUrn}`,
        { headers }
      );
      const socialData = socialRes.ok ? await socialRes.json() : {};

      const likes = socialData.likesSummary?.totalLikes ?? 0;
      const comments = socialData.commentsSummary?.totalFirstLevelComments ?? 0;

      // 2. Try to get the ugcPost to find the share URN for share statistics
      // ugcPost id = the activity URN itself (they share the same id space for UGC posts)
      let impressions = 0, clicks = 0, shares = 0;

      try {
        const ugcRes = await fetch(
          `https://api.linkedin.com/v2/ugcPosts/${encodedActivityUrn}`,
          { headers }
        );

        if (ugcRes.ok) {
          const ugcData = await ugcRes.json();
          // The share URN lives at ugcData.id or as a related entity
          // For member posts, impressions/clicks require r_member_social (not available)
          // Fall back to the activity's stats via /v2/postStatistics if available
          const shareUrn = ugcData.id; // same as activityUrn for ugcPosts

          if (shareUrn) {
            const shareStatsRes = await fetch(
              `https://api.linkedin.com/v2/postStatistics/${encodeURIComponent(shareUrn)}`,
              { headers }
            );
            if (shareStatsRes.ok) {
              const shareStatsData = await shareStatsRes.json();
              impressions = shareStatsData.impressionCount ?? 0;
              clicks = shareStatsData.clickCount ?? 0;
              shares = shareStatsData.shareCount ?? 0;
            }
          }
        }
      } catch (_) {
        // impressions/clicks remain 0 — not critical
      }

      stats[activityUrn] = { likes, comments, impressions, clicks, shares };
    }));

    return Response.json({ stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});