import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Facebook: fetch post insights ─────────────────────────────────────────────
async function fetchFacebookPostStats(postId, pageAccessToken) {
  // Facebook post insights
  const metricsUrl = `https://graph.facebook.com/v19.0/${postId}/insights?metric=post_impressions,post_reactions_by_type_total,post_clicks,post_video_avg_time_watched&access_token=${pageAccessToken}`;
  const res = await fetch(metricsUrl);
  const data = await res.json();

  let impressions = 0, likes = 0, comments = 0, shares = 0, clicks = 0;

  if (data.data) {
    for (const metric of data.data) {
      const val = metric.values?.[0]?.value ?? metric.value ?? 0;
      if (metric.name === 'post_impressions') impressions = typeof val === 'number' ? val : 0;
      if (metric.name === 'post_clicks') clicks = typeof val === 'number' ? val : 0;
      if (metric.name === 'post_reactions_by_type_total') {
        likes = typeof val === 'object' ? Object.values(val).reduce((s, v) => s + (Number(v) || 0), 0) : 0;
      }
    }
  }

  // Fetch comments count separately
  const commentsRes = await fetch(`https://graph.facebook.com/v19.0/${postId}?fields=comments.summary(true),shares&access_token=${pageAccessToken}`);
  const commentsData = await commentsRes.json();
  comments = commentsData.comments?.summary?.total_count ?? 0;
  shares = commentsData.shares?.count ?? 0;

  return { fb_impressions: impressions, fb_likes: likes, fb_comments: comments, fb_shares: shares, fb_link_clicks: clicks };
}

// ── Instagram: fetch media insights ──────────────────────────────────────────
async function fetchInstagramPostStats(mediaId, pageAccessToken) {
  const metricsUrl = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${pageAccessToken}`;
  const res = await fetch(metricsUrl);
  const data = await res.json();

  let impressions = 0, reach = 0, likes = 0, comments = 0, shares = 0, saves = 0;

  if (data.data) {
    for (const metric of data.data) {
      const val = Number(metric.value ?? 0);
      if (metric.name === 'impressions') impressions = val;
      if (metric.name === 'reach') reach = val;
      if (metric.name === 'likes') likes = val;
      if (metric.name === 'comments') comments = val;
      if (metric.name === 'shares') shares = val;
      if (metric.name === 'saved') saves = val;
    }
  }

  return { ig_impressions: impressions, ig_reach: reach, ig_likes: likes, ig_comments: comments, ig_shares: shares, ig_saves: saves };
}

// ── Threads: fetch post stats ─────────────────────────────────────────────────
async function fetchThreadsPostStats(mediaId, accessToken) {
  const url = `https://graph.threads.net/v1.0/${mediaId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();

  let views = 0, likes = 0, replies = 0, reposts = 0;

  if (data.data) {
    for (const metric of data.data) {
      const val = Number(metric.values?.[0]?.value ?? metric.value ?? 0);
      if (metric.name === 'views') views = val;
      if (metric.name === 'likes') likes = val;
      if (metric.name === 'replies') replies = val;
      if (metric.name === 'reposts') reposts = val;
    }
  }

  return { threads_views: views, threads_likes: likes, threads_replies: replies, threads_reposts: reposts };
}

// ── Bluesky: fetch post stats via getPostThread ───────────────────────────────
async function fetchBlueskyPostStats(postUri, handle, appPassword) {
  // Authenticate first
  const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!sessionRes.ok) throw new Error(`Bluesky auth: ${await sessionRes.text()}`);
  const { accessJwt } = await sessionRes.json();

  // Get post thread to extract engagement
  const threadRes = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}&depth=1`, {
    headers: { Authorization: `Bearer ${accessJwt}` },
  });
  if (!threadRes.ok) return { bsky_likes: 0, bsky_replies: 0, bsky_reposts: 0, bsky_quotes: 0 };

  const threadData = await threadRes.json();
  const post = threadData.thread?.post;

  return {
    bsky_likes: post?.likeCount ?? 0,
    bsky_replies: post?.replyCount ?? 0,
    bsky_reposts: post?.repostCount ?? 0,
    bsky_quotes: post?.quoteCount ?? 0,
  };
}

// ── Mastodon: fetch status stats ──────────────────────────────────────────────
async function fetchMastodonPostStats(statusId, instanceUrl, accessToken) {
  const baseUrl = instanceUrl.replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/api/v1/statuses/${statusId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { mastodon_favourites: 0, mastodon_boosts: 0, mastodon_replies: 0 };
  const data = await res.json();

  return {
    mastodon_favourites: data.favourites_count ?? 0,
    mastodon_boosts: data.reblogs_count ?? 0,
    mastodon_replies: data.replies_count ?? 0,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const fbToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const threadsToken = Deno.env.get('THREADS_ACCESS_TOKEN');
    const bskyHandle = Deno.env.get('BLUESKY_HANDLE');
    const bskyPassword = Deno.env.get('BLUESKY_APP_PASSWORD');
    const mastodonInstance = Deno.env.get('MASTODON_INSTANCE_URL');
    const mastodonToken = Deno.env.get('MASTODON_ACCESS_TOKEN');

    // Fetch all published posts
    const posts = await base44.asServiceRole.entities.GeneratedPost.filter({ status: 'published' });

    const results = { fb: 0, ig: 0, threads: 0, bsky: 0, mastodon: 0, errors: [] };

    // Process all posts in parallel batches
    await Promise.all(posts.map(async (post) => {
      try {
        const updates = {};

        // Facebook
        if (post.fb_post_id && fbToken) {
          const stats = await fetchFacebookPostStats(post.fb_post_id, fbToken);
          Object.assign(updates, stats);
          results.fb++;
        }

        // Instagram
        if (post.ig_post_id && fbToken) {
          const stats = await fetchInstagramPostStats(post.ig_post_id, fbToken);
          Object.assign(updates, stats);
          results.ig++;
        }

        // Threads
        if (post.threads_post_id && threadsToken) {
          const stats = await fetchThreadsPostStats(post.threads_post_id, threadsToken);
          Object.assign(updates, stats);
          results.threads++;
        }

        // Bluesky
        if (post.bsky_post_id && bskyHandle && bskyPassword) {
          const stats = await fetchBlueskyPostStats(post.bsky_post_id, bskyHandle, bskyPassword);
          Object.assign(updates, stats);
          results.bsky++;
        }

        // Mastodon
        if (post.mastodon_post_id && mastodonInstance && mastodonToken) {
          const stats = await fetchMastodonPostStats(post.mastodon_post_id, mastodonInstance, mastodonToken);
          Object.assign(updates, stats);
          results.mastodon++;
        }

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.GeneratedPost.update(post.id, updates);
        }
      } catch (e) {
        results.errors.push({ postId: post.id, error: e.message });
      }
    }));

    return Response.json({
      success: true,
      synced: { ...results },
      message: `Synced FB:${results.fb} IG:${results.ig} Threads:${results.threads} Bsky:${results.bsky} Mastodon:${results.mastodon}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});