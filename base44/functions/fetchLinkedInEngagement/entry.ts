import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Fetch social stats for each post using the socialActions API
    await Promise.all(linkedInPostIds.map(async (urn) => {
      if (!urn) return;

      // Encode the URN for use in the URL
      const encodedUrn = encodeURIComponent(urn);

      // Fetch like count
      const likeRes = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (likeRes.ok) {
        const likeData = await likeRes.json();
        stats[urn] = {
          likes: likeData.likesSummary?.totalLikes ?? 0,
          comments: likeData.commentsSummary?.totalFirstLevelComments ?? 0,
        };
      } else {
        stats[urn] = { likes: 0, comments: 0 };
      }
    }));

    return Response.json({ stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});