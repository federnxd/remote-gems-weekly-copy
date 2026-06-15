// ============================================================================
// platform-cta — single source of truth for "include the link?" vs.
// "use a comment-to-DM CTA?" per platform, and the curated CTA pool.
//
// Per the design: on platforms where links work fine OR the algorithm doesn't
// heavily de-prioritize them, we include the referral link. On platforms where
// links are either impossible (Instagram) or actively suppressed by the
// algorithm (Twitter, Facebook, Threads), we use a CTA that asks people to
// comment the word "Remote" — the DM responder then sends them the link.
//
// The CTA word "Remote" must appear in EVERY CTA variant — the DM responder
// matches it case-insensitively as a whole word. Edit the pool freely, but
// keep the "Remote" keyword in every entry.
//
// Used by: autoFillDay, autoFillWeek, generatePost, generateCampaignPosts.
// Used in the frontend by: PostGenerator (manual override UI).
// ============================================================================

// Platforms grouped by how to call-to-action:
//
//   LINK group — paste the referral link inline. The platform/algorithm
//                handles links well enough.
//   CTA group  — do NOT include any URL. End the post with a comment-to-DM CTA.
export const LINK_PLATFORMS = ['linkedin', 'mastodon', 'bluesky'];
export const CTA_PLATFORMS  = ['twitter', 'facebook', 'instagram', 'threads'];

export function ctaModeFor(platform) {
  if (LINK_PLATFORMS.includes(platform)) return 'link';
  if (CTA_PLATFORMS.includes(platform))  return 'cta';
  return 'link'; // safe default for any unknown platform
}

// ── Curated CTA pool ─────────────────────────────────────────────────────────
// Every entry must include the word "Remote" (the DM responder's trigger
// keyword) and clearly state the user will receive the link.
//
// Keep entries short — they're appended after the post body and a blank line.
// Coherent phrasings, no engagement-bait shouting. Rocket emoji optional.
export const CTA_POOL = [
  'Comment "Remote" and I\'ll DM you the referral link 🚀',
  'Drop "Remote" in the comments and I\'ll send you the link.',
  'Want in? Comment "Remote" and I\'ll DM the link to apply.',
  'Reply with "Remote" below and the link will land in your DMs.',
  'Comment "Remote" — I\'ll DM you the full link and details.',
  'Type "Remote" in the comments and I\'ll send the link your way.',
  'Just comment "Remote" — link comes straight to your DMs.',
  'If you\'re interested, comment "Remote" and I\'ll DM the link.',
  'Comment the word "Remote" below and I\'ll send the link by DM.',
  'Tag yourself in with "Remote" in the comments — link via DM.',
  'Drop "Remote" below and I\'ll get the referral link to you.',
  'Curious? Comment "Remote" and the link is yours via DM.',
  'Say "Remote" in a comment — I\'ll DM you the link to apply.',
  'Interested? Comment "Remote" and I\'ll send the link over.',
  'Comment "Remote" and you\'ll get the link in a DM.',
];

// Pick one from the pool. Deterministic when seed is provided (handy if a
// generator wants reproducibility for the same post), random otherwise.
export function pickCTA(seed) {
  if (typeof seed === 'string' && seed.length) {
    // simple hash → stable index
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return CTA_POOL[Math.abs(h) % CTA_POOL.length];
  }
  return CTA_POOL[Math.floor(Math.random() * CTA_POOL.length)];
}

// Build the trailing block for a post on a CTA platform. We put the CTA on
// its own line, preceded by a blank line, so it's visually distinct from the
// post body and visible without "see more" cutoffs.
export function ctaBlock(cta) {
  return `\n\n${cta}`;
}

// Regex the DM responder will use to match "Remote" case-insensitively as a
// whole word in incoming comments. Exported so the responder and any test use
// exactly the same pattern.
export const REMOTE_KEYWORD_REGEX = /\bremote\b/i;
