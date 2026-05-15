import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by the scheduled automation to keep all published post stats up to date
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all published posts that have a linkedin_post_id
    const posts = await base44.asServiceRole.entities.GeneratedPost.filter({ status: 'published' });
    const publishedWithId = posts.filter(p => p.linkedin_post_id);

    if (publishedWithId.length === 0) {
      return Response.json({ message: 'No published posts to sync', updated: 0 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');

    let updated = 0;

    await Promise.all(publishedWithId.map(async (post) => {
      const urn = post.linkedin_post_id;
      const encodedUrn = encodeURIComponent(urn);

      const [socialRes, statsRes] = await Promise.all([
        fetch(`https://api.linkedin.com/v2/socialActions/${encodedUrn}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }),
        fetch(`https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodedUrn}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }),
      ]);

      const socialData = socialRes.ok ? await socialRes.json() : {};
      const statsData = statsRes.ok ? await statsRes.json() : {};
      const stat = statsData.elements?.[0]?.totalShareStatistics || {};

      const impressions = stat.impressionCount ?? post.impressions ?? 0;
      const clicks = stat.clickCount ?? post.clicks ?? 0;
      const likes = socialData.likesSummary?.totalLikes ?? post.likes ?? 0;
      const comments = socialData.commentsSummary?.totalFirstLevelComments ?? post.comments ?? 0;
      const shares = stat.shareCount ?? post.shares ?? 0;

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