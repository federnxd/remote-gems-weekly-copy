import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postContent, postId } = await req.json();
    if (!postContent) {
      return Response.json({ error: 'postContent is required' }, { status: 400 });
    }

    // Get LinkedIn access token from the shared connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');

    // Get the LinkedIn member profile (sub = member URN)
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.sub}`;

    // Publish the post via LinkedIn UGC Posts API
    const body = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: postContent },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const publishRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return Response.json({ error: `LinkedIn API error: ${err}` }, { status: 500 });
    }

    const result = await publishRes.json();
    const linkedInPostId = result.id;

    // Update the post status to published in our DB
    if (postId) {
      await base44.asServiceRole.entities.GeneratedPost.update(postId, {
        status: 'published',
      });
    }

    return Response.json({ success: true, linkedInPostId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});