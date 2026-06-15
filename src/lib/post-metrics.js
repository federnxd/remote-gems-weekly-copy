// Shared cross-platform metric aggregation.
//
// Engagement is stored on GeneratedPost in two shapes:
//  - bare top-level fields (LinkedIn / Twitter / manual): impressions, likes, ...
//  - platform-prefixed fields (FB/IG/Threads/Bluesky/Mastodon sync):
//      fb_impressions, ig_likes, threads_views, bsky_likes, mastodon_favourites, ...
//
// The DataAnalystPlanner sums BOTH. These helpers do the same so every UI
// surface (IdeaLab, StrategyAdvisor, Analytics) reports the same real totals
// and can't drift from the planner.

const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

export function postImpressions(p = {}) {
  return n(p.impressions) + n(p.twitter_impressions) + n(p.fb_impressions) + n(p.ig_impressions) + n(p.threads_views);
}

export function postLikes(p = {}) {
  return n(p.likes) + n(p.twitter_likes) + n(p.fb_likes) + n(p.ig_likes) + n(p.threads_likes) + n(p.bsky_likes) + n(p.mastodon_favourites);
}

export function postComments(p = {}) {
  return n(p.comments) + n(p.twitter_replies) + n(p.fb_comments) + n(p.ig_comments) + n(p.threads_replies) + n(p.bsky_replies) + n(p.mastodon_replies);
}

export function postShares(p = {}) {
  return n(p.shares) + n(p.twitter_retweets) + n(p.fb_shares) + n(p.ig_shares) + n(p.threads_reposts) + n(p.bsky_reposts) + n(p.mastodon_boosts);
}

export function postClicks(p = {}) {
  return n(p.clicks) + n(p.twitter_link_clicks) + n(p.fb_link_clicks);
}

// referrals / hired are manual-entry fields (logged via the micro1 Dashboard
// paste). They have no platform-prefixed variants.
export function postReferrals(p = {}) {
  return n(p.referrals);
}

export function postHired(p = {}) {
  return n(p.hired);
}

// Total engagement = likes + comments + shares (impressions/clicks tracked separately).
export function postEngagement(p = {}) {
  return postLikes(p) + postComments(p) + postShares(p);
}

// A single score for ranking "top" posts. Referrals weigh heavily because they
// are the conversion that matters most.
export function postScore(p = {}) {
  return postImpressions(p) + postEngagement(p) * 5 + postReferrals(p) * 100 + postHired(p) * 500;
}

// Does this post have ANY real engagement data (across all platforms)?
export function hasEngagement(p = {}) {
  return postImpressions(p) > 0 || postEngagement(p) > 0 || postReferrals(p) > 0 || postClicks(p) > 0;
}
