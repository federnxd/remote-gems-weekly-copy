import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scheduled automation: syncs LinkedIn engagement stats for all published posts.
 * - Likes + comments via /v2/socialActions (works with activity URN)
 * - Impressions/clicks via /v2/postStatistics (newer endpoint)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const posts = await base44.asServiceRole.entities.GeneratedPost.filter({ status: 'published' });
    const publishedWithId = posts.filter(p => p.linkedin_post_id);

    if (publishedWithId.length === 0) {
      return Response.json({ message: 'No published posts to sync', updated: 0 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    };

    let updated = 0;

    await Promise.all(publishedWithId.map(async (post) => {
      const activityUrn = post.linkedin_post_id;
      const encodedUrn = encodeURIComponent(activityUrn);

      // Get likes + comments
      const socialRes = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
        { headers }
      );
      const socialData = socialRes.ok ? await socialRes.json() : {};

      const likes = socialData.likesSummary?.totalLikes ?? post.likes ?? 0;
      const comments = socialData.commentsSummary?.totalFirstLevelComments ?? post.comments ?? 0;

      // Try to get impressions/clicks via postStatistics
      let impressions = post.impressions ?? 0;
      let clicks = post.clicks ?? 0;
      let shares = post.shares ?? 0;

      const statsRes = await fetch(
        `https://api.linkedin.com/v2/postStatistics/${encodedUrn}`,
        { headers }
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        impressions = statsData.impressionCount ?? impressions;
        clicks = statsData.clickCount ?? clicks;
        shares = statsData.shareCount ?? shares;
      }

      await base44.asServiceRole.entities.GeneratedPost.update(post.id, {
        impressions,
        clicks,
        likes,
        comments,
        shares,
        last_synced_at: new Date().toISOString(),
      });

      updated++;
    }));

    return Response.json({ message: 'Sync complete', updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});