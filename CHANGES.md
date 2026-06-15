# Remote Gems Weekly — Change Log

Summary of all fixes and changes made in this working session. The code is
verified to parse cleanly with all imports resolved. Backend functions are Deno
(`entry.ts`); frontend is the Vite/React app under `src/`.

---

## Files changed

**Backend (`base44/`)**
- `entities/OpenRole.jsonc` — added missing field
- `entities/WeeklyPlan.jsonc` — added planner-reflection fields
- `functions/autoFillDay/entry.ts` — multiple fixes + planner-aware strategies
- `functions/autoFillWeek/entry.ts` — multiple fixes
- `functions/checkScheduledPosts/entry.ts` — Instagram publish fix
- `functions/dataAnalystPlanner/entry.ts` — robustness fixes + WeeklyPlan sync
- `functions/generatePost/entry.ts` — **NEW** backend function

**Frontend (`src/`)**
- `lib/post-metrics.js` — **NEW** shared cross-platform metric helper
- `pages/PostGenerator.jsx` — reworked for per-platform generation
- `pages/Strategy.jsx` — live planner reflection (already present, verified)
- `pages/WeeklyPlanner.jsx` — surfaces planner auto-sync fields
- `pages/IdeaLab.jsx` — bug fixes + cross-platform metrics
- `pages/Analytics.jsx` — cross-platform metric totals
- `components/generator/PlatformPostCard.jsx` — **NEW** component
- `components/idealab/StrategyAdvisor.jsx` — cross-platform metrics
- `components/idealab/RepurposePanel.jsx` — link + save-tag fixes
- `components/calendar/AutoFillCalendarButton.jsx` — per-day generation loop
- `components/calendar/GenerateDayButton.jsx` — platform list update

**Deleted**
- `components/generator/PostPreview.jsx`
- `components/generator/ABComparePreview.jsx`

---

## What changed, by issue

### 1. Instagram auto-publish was broken (`checkScheduledPosts`)
The scheduled-post publisher used the wrong token, tried to post a text-only
Instagram post (not supported by the IG API), and skipped media processing.
Rewrote it to generate an image, use the Facebook page token, wait for
processing, then publish — matching the working logic in `publishToSocialMedia`.

### 2. "High demand" feature was silently dead (`OpenRole`)
Six functions and the Roles page reference `is_high_demand`, but the field was
never defined in the `OpenRole` schema, so it never persisted and every
high-demand filter returned nothing. Added the field to the schema.

### 3. Wrong post type per day (`autoFillDay`)
A Sunday-vs-Monday indexing bug shifted every day's strategy by one (e.g.
Tuesday produced "social proof" instead of thought leadership). Re-aligned the
day→strategy map and the thought-leadership-day list to the calendar UI, using
correct `getDay()` indices.

### 4. Wrong Saturday post type (`autoFillWeek`)
Same family of bug. `autoFillWeek` uses Monday-based offsets, so its
thought-leadership-day list was fine, but the strategy map was wrong on
Saturday (produced "niche_community" instead of "urgency") and on the
thought-leadership days. Aligned it to the calendar UI.

### 5. Niche posts added on thought-leadership days
On Tue/Thu/Sun, each non-LinkedIn platform now also gets a `niche_community`
referral post (scheduled later in the day), on top of the existing thought
post. Implemented in both `autoFillDay` and `autoFillWeek`.

### 6. Posts overflowing limits / mangled link / truncated text
Replaced the "ask the LLM to count characters" approach (unreliable) with a
shared `generateReferralPost` helper: the LLM writes TEXT ONLY, code appends
the referral link, a word-target with safety buffer is used instead of a char
count, the best fitting candidate is kept across attempts, and any overflow is
trimmed at a sentence boundary (never mid-word). Applied to `autoFillDay`,
`autoFillWeek`, and the new `generatePost`. Result: every generated post fits
its platform limit, contains exactly one correct link, and reads as complete.

### 7. Platform time-outs on full-week generation
A single `autoFillWeek` call tried to generate ~189 posts (~284 LLM calls) in
one request and timed out. Two changes:
- Dropped the 8 manual-only job boards (IndieHackers, WeWorkRemotely, Wellfound,
  Remotive, FlexJobs, RemoteOK, Reddit, Discord) from auto-generation — the
  scheduler can't auto-publish them anyway. Now: LinkedIn + 6 auto-publishable
  platforms (Twitter, Facebook, Instagram, Mastodon, Bluesky, Threads).
- The "Auto-fill Week" button now calls `autoFillDay` once per day (7 short
  sequential requests) instead of one giant request. Real progress, per-day
  error resilience, no week-level timeout.

### 8. DataAnalystPlanner hardening
- Period filter now bounds posts on both ends (future-dated posts no longer leak
  into reports).
- The LLM's `should_pause_community_managing` is type-guarded (array of strings)
  so a malformed value can't crash the function.
- Ban-risk pause now creates a settings record if none exists (previously the
  pause silently did nothing on a fresh install).
- Malformed AI JSON degrades gracefully instead of throwing.
- Skips the (expensive) AI call entirely when there is no data to analyze.

### 9. Post Generator — full per-platform alignment
- New backend function `generatePost` produces one clean, in-limit,
  link-bearing post PER selected platform (same reliable approach as autofill).
- The page now shows one editable card per platform (`PlatformPostCard`), each
  with its own char-count, hashtag suggester, Save/Schedule/Publish actions.
- A/B mode shows Variant A and B side-by-side within each platform card.
- Saved posts now write `notes: platform:<x> type:job_referral` so the
  scheduler routes them correctly (this tag was previously missing).
- Removed ~200 lines of duplicated prompt logic from the frontend; deleted the
  now-unused `PostPreview` and `ABComparePreview` components.

---

## Deploying back to Base44

1. Push / import this project into Base44 (Git integration or upload).
2. **New backend function:** `generatePost` — make sure Base44 registers it
   alongside the existing functions.
3. **Entity schema change:** `OpenRole` now has an `is_high_demand` boolean.
   Confirm Base44 picks up the schema update.
4. No new environment variables are required by these changes. The existing
   secrets (see `.env.example`) are unchanged.
5. If a Monday cron currently calls `autoFillWeek` directly, it still works, but
   the lighter, timeout-safe path is the per-day approach the calendar button
   now uses. Optionally point the cron at per-day generation too.

## Notes / things intentionally left alone
- The `community_managing` engine (automated likes/follows/comments on other
  accounts) was not tuned — it carries platform-ToS / account-ban risk.
- `approveScheduledPost` does not validate its `token` param (the approval link
  relies on only reaching your own inbox). Flagged, not changed.
- `autoFillWeek`'s original job-post loop has an uncapped regeneration `while`;
  the new niche loop and `generatePost` are bounded. Flagged, not changed.

---

## Feedback loop & planning pages (later session)

### 10. autoFillDay honors planner strategy recommendations
Confirmed (and verified by simulation) that `autoFillDay` fetches
`getPlannerContext` first and builds a planner-aware day→strategy map: when the
planner provides recommendations it overrides the Wed/Fri/Sat job-days with
planner priorities, while preserving the Tue/Thu/Sun thought-leadership days and
the Monday "new roles" anchor. Since the weekly button now runs `autoFillDay`
per-day, the planner's strategy decisions are applied on that path too.

### 11. WeeklyPlan now reflects DataAnalystPlanner decisions (single source of truth)
- Added fields to `WeeklyPlan`: `active_strategies`, `recommended_hashtags`,
  `last_planner_sync`, `planner_report_period`.
- When a planner report completes, `dataAnalystPlanner` now syncs the current
  plan (active → else most recent → else creates one) with a readable strategy
  summary, the priority strategies, recommended hashtags, and a sync timestamp.
  It selects by recency/status (not the free-text week label) to avoid dupes.
- The Strategy page already read the latest report (priority strategies,
  hashtags, action items, planner-adjusted posting times); the Weekly Planner
  page now also surfaces the auto-sync banner + active-strategy badges per plan.
- IMPORTANT: posting still reads `getPlannerContext` (the PlannerReport) as the
  ONE source of truth. The planning pages are live *reflections* of that same
  data — they don't independently drive posting, so they can't drift out of sync.

Behavior note: the planner overwrites the synced plan's `strategy_notes` with
its auto-summary each report. If you'd prefer append-only or opt-in syncing,
that's a small change.

---

## Session 2 additions — feedback loop fixes

### (a) autoFillDay now honors planner strategy recommendations
Previously only `autoFillWeek` overrode its day→strategy map with the planner's
`recommendedStrategies`. Since the "Auto-fill Week" button now calls
`autoFillDay` per day (timeout fix), the planner's strategy reordering was being
lost on that path. `autoFillDay` now applies the same override (getDay-indexed):
planner priorities override the Wed/Fri/Sat job days, keeping the Monday anchor
and the Tue/Thu/Sun thought-leadership days. Falls back to defaults when no
report exists. Also fixed two latent getDay-indexing bugs in autoFillDay (the
Monday 🆕 new-roles annotation and the day-name labels were Monday-first while
indexed Sunday-first).

### (b) Strategy & Weekly Planner pages are now planner-driven
Both pages now read the latest `PlannerReport` (same source the autofill
functions use, so they never drift):
- **Strategy page**: shows a live "DataAnalystPlanner Recommendations" card
  (priority strategies, recommended hashtags, action items) when a report
  exists, and overlays recommended posting times onto the weekly schedule.
  Falls back to the baseline hardcoded plan until the first report.
- **Weekly Planner**: shows a "current planner guidance" banner and prefills new
  weekly plans' strategy notes with the planner's latest priorities/action
  items. Manual budget/metrics fields remain user-controlled.

Design note: these pages READ from the planner output rather than introducing a
parallel feedback path, so DataAnalystPlanner remains the single source of truth
and all consumers (autofill, community managing, Strategy, Weekly Planner) stay
consistent automatically.

---

## Idea Lab fixes (Option 1 — kept as LinkedIn ideation tool)

### 12. Idea Lab clear-bug fixes
- **Save misroute:** saved idea drafts had no `platform:` tag (would misroute to
  LinkedIn at schedule time). Now tagged `platform:linkedin type:job_referral`.
- **Banned template:** the generator prompt instructed the old banned opener
  ("📍 [Month] - Remote Opportunities at...") — flipped to an explicit "never
  use it" rule + "never name a specific company".
- **Truncated link:** generator and Repurpose panel used the short referral link
  missing UTM params — replaced with the full canonical link in both.
- **State ordering:** moved `insights`/`tab` useState to the top (were declared
  after the handler that used them).
- **RepurposePanel:** repurposed saves now tag platform correctly
  (tweet_thread → twitter; blog/newsletter left untagged as copy-only content).

Note: per the chosen scope, Idea Lab stays an *ideation* tool (outline +
reasoning + LinkedIn-style draft). It was NOT routed through the per-platform
`generatePost` backend nor made planner-aware — the actual platform-tailored
generation happens in the Post Generator. The StrategyAdvisor (analytics) tab
needed no changes.

---

## Thought-leadership in the manual generator

### 13. Added Thought Leadership to the Post Generator
The generator offered every strategy EXCEPT thought leadership, so link-free
authority posts couldn't be made manually. Added a real path for it:
- New "Thought Leadership" option in StrategySelector (link-free, no roles).
- `generatePost` backend now branches on `strategy === 'thought_leadership'`:
  skips the role lookup and referral-link requirement, and generates a
  link-free post PER platform.
- The TOPIC is invented fresh by the AI each time (random current AI/remote-work
  insight) — NOT drawn from the hardcoded TOPIC_THEMES list.
- New `generatePlainPost` helper gives the same length guarantees as referral
  posts (respects each platform's char limit, complete sentence, strips any
  stray URL) but appends NO link.
- Frontend: referral-link validation is now thought-leadership-aware (no link
  required for thought posts, including A/B mode). Saved thought posts are
  tagged `type:thought_leadership` with no target_roles, so the scheduler/planner
  classify them correctly.

Files: base44/functions/generatePost/entry.ts,
src/components/generator/StrategySelector.jsx, src/pages/PostGenerator.jsx.

---

## Cross-platform metrics consistency

### 14. Analytics surfaces now read REAL cross-platform engagement
Platform sync (syncAllPlatformStats) writes engagement into platform-PREFIXED
fields (fb_impressions, ig_likes, threads_views, bsky_likes, mastodon_favourites,
etc.). The DataAnalystPlanner correctly summed bare + prefixed fields, but three
user-facing surfaces read only the BARE fields (p.impressions, p.referrals) — so
posts that only went to FB/IG/Threads/Bluesky/Mastodon showed as ZERO engagement
in those views (IdeaLab said "no data", Analytics undercounted, StrategyAdvisor
stats were wrong).

Fix: added a shared helper `src/lib/post-metrics.js` (postImpressions, postLikes,
postComments, postShares, postClicks, postReferrals, postHired, postEngagement,
postScore, hasEngagement) that sums bare + all prefixed fields exactly like the
planner. Wired it into IdeaLab, StrategyAdvisor, and the Analytics page so all
four analysis surfaces report the same real cross-platform totals.

Files: src/lib/post-metrics.js (NEW), src/pages/IdeaLab.jsx,
src/components/idealab/StrategyAdvisor.jsx, src/pages/Analytics.jsx.

### Verified (no change needed): referral data flow
The micro1 referral data pasted via the Dashboard Snapshot modal is stored in the
CompanyDashboardSnapshot entity as account-level totals (total_referrals,
successful_referrals, certified, earnings) — NOT per-post. This is correct
(referral attribution is account-level). Confirmed dataAnalystPlanner reads the
latest snapshot and feeds total_referrals/successful_referrals into its analysis.
Note: per-post `referrals`/`hired` fields are not auto-synced by design; the real
referral signal lives in the snapshot the planner reads.

---

## Optimization & effectiveness improvements

### 15. Per-post UTM `content` attribution
Every published referral link is now stamped with `utm_content=p<postId>_<platform>`
at publish time (publishToSocialMedia + checkScheduledPosts). Same post text
fanned out to multiple platforms gets distinct attribution tags. If micro1's
referral source data ever surfaces `utm_content`, you'll have per-post
conversion data. Stamper is idempotent (re-publish doesn't duplicate) and
preserves surrounding punctuation.

### 16. Snapshot-staleness reminder banner (Dashboard)
A warning Card appears on the Dashboard when the latest CompanyDashboardSnapshot
is older than 7 days (or missing). Click to open the paste modal. Keeps the
planner's most important manual input (referral data) from going stale.

### 17. Hardened sync/planner for unattended cron runs
- `syncAllPlatformStats`: removed the `auth.me()` guard that 401'd on cron calls
  (the function only uses asServiceRole anyway). Per-platform try/catch inside
  the per-post loop, so one platform's API failure no longer skips the others.
- `syncLinkedInStats` and `dataAnalystPlanner` already cron-safe (asServiceRole,
  body-less call handled).
- Recommended Base44 cron rules (set in the dashboard, not in code):
    * `syncAllPlatformStats` — daily, e.g. 03:00
    * `syncLinkedInStats`    — daily, e.g. 03:30
    * `dataAnalystPlanner`   — weekly Sunday late night
    * `checkScheduledPosts`  — every 5–15 minutes

### 18. Opt-in review gate ("Hold for review")
- New field `GeneratedPost.needs_review` (boolean).
- Post Generator: when scheduling, a checkbox "Hold for review before publishing"
  marks the post.
- Scheduler (`checkScheduledPosts`) skips posts where `needs_review=true` with
  status `awaiting_review` until cleared.
- New ReviewQueueCard on the Dashboard lists held posts with Approve/Discard
  buttons. Approve clears the flag; Discard moves the post back to drafts.

### 19. Smarter role rotation (anti-repeat)
Both autoFillDay and autoFillWeek now count how many times each role appeared
in posts over the last 14 days and sort roles ascending by that count BEFORE
strategy selection runs. Every strategy slices these arrays, so all of them
automatically pick fresher roles. Same-count tiebreaker is randomized so the
exact order varies. Result: no single role gets posted four times across the
week — coverage spreads naturally.

Files: base44/functions/publishToSocialMedia/entry.ts,
base44/functions/checkScheduledPosts/entry.ts,
base44/functions/syncAllPlatformStats/entry.ts,
base44/functions/autoFillDay/entry.ts,
base44/functions/autoFillWeek/entry.ts,
base44/entities/GeneratedPost.jsonc (new field: needs_review),
src/pages/Dashboard.jsx, src/pages/PostGenerator.jsx,
src/components/dashboard/ReviewQueueCard.jsx (NEW).

---

## Final sweep: remaining areas + small fixes

### 20. autoFillWeek thought-leadership: bounded retries + sentence-boundary trim
The lone remaining `while` loop in autoFillWeek (thought-leadership block) was
already bounded but cap was tight (2 attempts) and fallback was a hard
`.slice(0, limit)` truncation. Widened cap to 4 and replaced the hard slice with
`cleanTrim` so the fallback ends on a sentence boundary, never mid-word.

### 21. approveScheduledPost token validation
The approval link's `token` parameter was unused. Added validation: the token
(`btoa(<postId>:<timestamp>)`) must decode cleanly, the embedded postId must
match the URL postId (so a token for one post can't approve another), and the
timestamp must be within the last 7 days (so an old leaked email can't approve).
This isn't cryptographic — anyone who can guess a recent timestamp and a postId
could still forge a token. To genuinely secure, an HMAC with a server secret
would be needed. But for a single-user app where the link only goes to your own
inbox, this validation is reasonable defense.

### 22. Campaigns flow review + fix
Found significant bugs in `generateCampaignPosts` (called from 6 places: Roles,
PostGenerator, `monthlyAllRolesPosts`, `weeklyNewRolesPosts`,
`weeklyThoughtLeadershipPosts`). It built its own prompt and called InvokeLLM
with no character-limit, link-presence, or sentence-boundary validation — the
same problems we fixed everywhere else. Worse, none of its callers set
`campaign_id`, so the Campaigns page (which filters by `campaign_id`) showed
near-zero posts per campaign.

Fix: rewrote `generateCampaignPosts` as a thin wrapper that delegates to
`generatePost` per platform. Inherits all the in-limit/clean-link/sentence-trim
guarantees automatically. Added `campaignId` parameter that threads through to
the saved record's `campaign_id` field. Removed the auth.me() block so backend
cron callers (monthlyAllRolesPosts etc.) can invoke without 401. Tagged saved
posts with `type:job_referral` so the planner classifies them correctly.

### 23. Roles page: removed roles also clear is_high_demand
When a role is removed from a new sync, it was marked `is_active=false` and
`is_new=false` — but `is_high_demand` was NOT cleared. So a role flagged 🔥 in
last week's paste stayed 🔥 forever even after disappearing from the list. Now
all three flags clear together. (`syncRoles` itself is clean.)

### 24. Calendar page: needs_review surfaced
The Calendar didn't visually distinguish posts held for review (`needs_review`)
from normal scheduled ones. Added a 🟠 marker on each calendar card, a "held
for review" badge in the post detail dialog, plus toggle buttons in the dialog
to either "Approve & release" (clears the flag) or "Hold for review" (sets it)
without leaving the Calendar.

### Verified (no change needed): platform dashboards, MetricsHistory
- Per-platform dashboards (Facebook/Instagram/Threads/Bluesky/Mastodon/Twitter/
  LinkedIn) correctly read platform-prefixed fields. LinkedIn uses bare fields,
  which is also correct (LinkedIn sync writes to those directly).
- MetricsHistory reads CompanyDashboardSnapshot fields correctly.
- `syncRoles` is a pure LLM parser — the DB writes happen in Roles.jsx which
  already passes is_high_demand through correctly.

### Design note: Campaign entity in analytics
Only PostGenerator's optional campaign dropdown ever set `campaign_id` on a
post. No cron path does, so per-campaign analytics (posts per campaign, hires
per campaign) show near-zero by design. With #22's `campaignId` parameter,
`generateCampaignPosts` now accepts it — but I deliberately did NOT auto-attach
campaigns from cron functions, because that would dilute campaigns from
"strategic groupings you define" into "auto-batch labels." Campaign stays a
manual labeling tool, which is closer to what campaigns are usefully for.

Files: base44/functions/autoFillWeek/entry.ts,
base44/functions/approveScheduledPost/entry.ts,
base44/functions/generateCampaignPosts/entry.ts,
src/pages/Roles.jsx, src/pages/Calendar.jsx.

---

## New feature: Daily Growth checklist + AI Growth Helper

### 25. Daily Growth page (genuine, non-bot growth activities)
A new page (sidebar: "Daily Growth", route /daily-growth) with per-platform
daily checklists of GENUINE growth activities — the kind a thoughtful human does,
deliberately NOT performative engagement that gets accounts suspended.

- Curated activity lists for all 7 platforms (LinkedIn, X, Facebook, Instagram,
  Mastodon, Bluesky, Threads) in src/lib/daily-activities.js. Each activity is
  specific and actionable (e.g. "leave 3 substantive comments — add a
  perspective or ask a real question, not 'Great post!'"). Some are flagged
  weekly. Written by hand, not LLM-generated.
- Checkboxes persist per platform per day via the new DailyActivity entity.
  Includes a forgiving day-streak counter and today's completion %.
- Activities reset each day (the page reads today's records).

### 26. AI Growth Helper (assists the daily activities)
A helper panel on the Daily Growth page + backend function `growthHelper`,
with three modes:
  - Reply helper: paste a post/comment → 3 genuine reply options (a question,
    an experience, a perspective). Hard rules against "Great post!"/emoji-spam/
    empty validation/selling.
  - Post outline: give a topic → hooks, structure, key points, closing options,
    tone notes, and what to avoid.
  - Writing advice: ask how to approach a topic on a platform → core advice,
    do-this / avoid-this, an example hook.
All outputs are platform-tone aware and explicitly steer away from performative
engagement and recruitment-pitch voice.

New files: base44/entities/DailyActivity.jsonc,
base44/functions/growthHelper/entry.ts,
src/lib/daily-activities.js,
src/pages/DailyGrowth.jsx,
src/components/growth/GrowthHelper.jsx.
Wired: src/App.jsx (route), src/components/layout/Sidebar.jsx (nav item).

Base44 import notes: new entity DailyActivity and new function growthHelper must
register on import.

---

## DM Responder (final integration)

### "Comment Remote" → automated DM/public-reply with the link

When someone comments the word "Remote" (case-insensitive, whole-word) on one
of our CTA-mode posts, the community-managing engine now responds with the
referral link and full context.

**Per-platform delivery:**
- **Instagram & Facebook** — sends a private DM via the Graph API. DM is
  assembled from 6 sections in fixed order: greeting → value statement →
  link reveal → process instructions → nudge about new roles → sign-off.
  Sections 1, 2, 3, 5, 6 each pick randomly from a 12-entry pool. Section 4
  (process instructions) is canonical text, same every time (since
  application instructions should be unambiguous, not "varied"). Result:
  ~250,000 unique DM combinations, no LLM calls per send.
- **Threads** — replies publicly (no DM API available). Uses a 12-entry pool
  of 500-char-budget replies, each containing the full link + apply-broadly
  message.
- **Twitter / X** — scaffolded only. Returns `status: 'skipped'` with a
  warning until the OAuth 1.0a signing path is wired alongside the existing
  publishTwitter helper. When you're ready to pay for the Twitter API tier,
  there's a 12-entry pool of 280-char replies waiting for it.

**Compliance & rate limits (new-account tier):**
- `perSessionActions: 2` — max actions per cron run, per platform
- `perHourActions: 8` — rolling 60-min combined cap, per platform
- `perDayActions: 20` — daily combined cap, per platform
- COMBINED across comment-replies and DMs (one shared budget — platforms
  count total outbound actions reputationally)
- The remaining-budget calc uses the MORE RESTRICTIVE of daily and hourly,
  with live in-flight tracking between the comment-replier and DM responder
  for each platform
- 30-60 second pacing between actions within a single run (replaces the
  too-fast 0.6-1.2s old timing)
- 24-hour Meta policy window honored on FB/IG
- Per-commenter dedup across the last 90 days (each user receives the link
  exactly once, ever)

**Recommended cron schedule for community managing: every 5 minutes** — small
sessions plus frequent runs gives realistic human cadence and resolves
~30-person bursts of "Remote" comments within ~2 hours.

**To lift the new-account haircut:** after ~30 days of activity without
warnings, edit `LIMITS` at the top of `communityManaging/entry.ts` and roughly
double the three caps (20 → 40 daily, 8 → 15 hourly, 2 → 4 per session).
Keep cron at 5 minutes.

**Schema changes (CommunityEngagementLog):**
- `twitter` added to platform enum
- `dms_sent` field — counts DMs/public-replies sent
- `dm_recipient_ids` field — comma-separated per-commenter dedup keys
- `rate_limited` added to status enum
- `replied_notification_ids` (added earlier for Mastodon/Bluesky dedup)

Files: base44/functions/communityManaging/entry.ts (responder pools, dispatch),
base44/entities/CommunityEngagementLog.jsonc (new fields).

### DM responder: per-flow UTM source attribution
Added compact `utm_content` stamping to the referral link in every DM and
public-reply assembled by the responder, so DM-driven clicks are
distinguishable from clicks on the link inside posts. Codes:
  - `dmi` = DM on Instagram
  - `dmf` = DM on Facebook
  - `rth` = public reply on Threads
  - `rtw` = public reply on Twitter (active when OAuth is wired)

Codes are kept short because Twitter's 280-char limit is tight. Verified all
12 Twitter pool entries fit with the tagged link and a 19-char worst-case
username; one entry needed a 2-char trim to fit. All four codes are
unambiguous (no collisions).

This complements (doesn't replace) the per-post stamping from
publishToSocialMedia, which uses `p<postId>_<platform>` for clicks on
published posts. Combined, the micro1 dashboard reader can now tell exactly
where every click came from: which post and platform if it came from a post,
or which channel (DM vs public reply) and platform if it came from the
responder.

Files: base44/functions/communityManaging/entry.ts.

### Thought-leadership topic library: expanded from 7 to 27 themes
The `TOPIC_THEMES` constant (shared across autoFillDay, autoFillWeek, and
weeklyThoughtLeadershipPosts) now contains 27 themes across 5 categories,
up from 7 themes all in one bucket:

  - **market_ai** (7 themes — kept) — commentary on the AI + remote job market
  - **interview_prep** (5 themes — new) — practical guidance for landing roles
  - **remote_work_practical** (5 themes — new) — actually doing remote work well
  - **communication_teamwork** (5 themes — new) — working with people across distance
  - **professionalism** (5 themes — new) — career-level habits

Each theme has a specific `angle` (the LLM brief) that pushes for substantive
content over generic advice. The pool is briefs only — the LLM still
generates fresh post text per call; nothing in the pool appears verbatim.

A new `category` field on each entry is logged into the post's `notes`
(`type:thought_leadership category:X theme:Y`) so the dataAnalystPlanner can
eventually weight category selection by engagement — no logic change to the
planner yet, just laying the groundwork.

Rotation math: ~21 thought-leadership posts/week (3 days × 7 platforms) cycle
through 27 themes in ~9 weeks before any repeat. All three callers stay in
sync; field access (`theme.theme`, `theme.angle`) is unchanged.

Files: base44/functions/autoFillDay/entry.ts,
base44/functions/autoFillWeek/entry.ts,
base44/functions/weeklyThoughtLeadershipPosts/entry.ts.

---

## Responder Activity view

### New page: /responder-activity ("Option B" from the messages-menu discussion)
Instead of building a unified DM inbox (which would have duplicated native apps
poorly), this page shows what the community-managing responder has done on
your behalf — the actual signal you want during the first weeks of
calibrating trust with the automation.

**What the page shows:**
- Top metrics for the last 24h: DMs sent, comment replies, public replies,
  errors / rate-limited count.
- Per-platform headroom view: how many of today's daily cap (20) and the last
  hour's hourly cap (8) each platform has consumed, with progress bars that
  turn orange at >80% so you can see when you're close to a limit.
- Timeline of every action with: action type, platform, recipient handle, the
  trigger text that fired it (truncated, italicized), error notes if any,
  and time-ago.
- Filter chips: by platform (All / IG / FB / Threads / Mastodon / Bluesky /
  Twitter) and by action type (All / DMs / Comment replies / Public replies /
  Errors).
- Auto-refresh every 60 seconds so newly-fired actions appear without manual
  reload.

**New entity: ResponderAction**
Per-action audit records (in addition to the existing aggregate
CommunityEngagementLog which stays for trend analysis). Fields: platform,
action_type, trigger_text (~200 chars), trigger_post_id, recipient_handle,
status (sent / rate_limited / error), notes. 30-day retention — older
records are pruned at the start of each community-managing run.

**Each responder function now writes one ResponderAction record per success,
rate-limit, or error** — 8 action points × 3 outcome paths = 24 recordAction
calls, threaded through with best-effort error handling (audit failures
never break the responder's actual work).

Files: base44/entities/ResponderAction.jsonc (NEW),
base44/functions/communityManaging/entry.ts (recordAction helper +
per-action logging + 30-day cleanup),
src/pages/ResponderActivity.jsx (NEW),
src/App.jsx (route), src/components/layout/Sidebar.jsx (nav item).

Base44 import note: new entity ResponderAction must register on import.

---

## Import from Instagram

### New feature: pulls manually-posted IG content into the app
Reels, images, and carousels posted from the Instagram phone app (or any other
tool) were previously invisible to Remote Gems Weekly — stats sync only saw
posts the app itself had published. Now there's an "Import from Instagram"
button on the Posts page that pulls recent IG media and creates GeneratedPost
records for anything not already tracked.

**What it imports** (per-call, idempotent):
- Recent media from your IG business account (last 60 days, max 50 items by
  default — both adjustable in the function call if you ever need more).
- Caption goes into `content` (so the "Remote" keyword detector sees the same
  text a viewer sees), `ig_post_id` is set, `status: 'published'`.
- `media_type` field stores IMAGE / VIDEO / CAROUSEL_ALBUM / REELS so analytics
  can compare formats later.
- `imported_from: 'instagram'` flag distinguishes imported posts from
  app-published ones.
- Title: `[IG REELS] First line of caption…` so they're scannable in the list.
- Notes: `[IMPORTED] platform:instagram media_type:reels permalink:...` so
  the planner sees them with full context.

**What "just works" after import** (no extra plumbing needed):
- `syncAllPlatformStats` daily cron picks up imported posts naturally because
  they have `ig_post_id` set — daily stats land on them like any other post.
- The community-managing responder ALREADY worked on manually-posted IG
  content because it queries the IG API directly for posts on your account,
  not the GeneratedPost table. So the "Remote" trigger has always fired on
  any IG post; importing just makes that visible in the app.
- Analytics, Posts page, Calendar — all show imported posts alongside
  app-published ones with the new badges (REELS / CAROUSEL / imported).

**What's NOT built** (and the honest reason why):
- Publishing reels FROM the app. Meta's reels API is fiddly (public video
  hosting required, format restrictions, processing waits often exceeding
  serverless timeouts) and most users prefer the native IG app for reels
  anyway. If this ever becomes a real need, revisit.
- Image upload UI for scheduled IG posts. Backend supports `igImageUrl`; the
  frontend would need a file picker + storage. Reasonable future addition.

**Schema changes:**
- `GeneratedPost.media_type` (enum: IMAGE/VIDEO/CAROUSEL_ALBUM/REELS/TEXT)
- `GeneratedPost.imported_from` (enum: instagram)

**New function:** `importInstagramPosts` (must register on Base44 import).

Files: base44/entities/GeneratedPost.jsonc (new fields),
base44/functions/importInstagramPosts/entry.ts (NEW),
src/pages/Posts.jsx (Import button, media-type badges).

---

## Roles page: hide inactive + opt-in purge

### Hide inactive roles from the list (with toggle)
Before: when sync marked old roles `is_active: false`, they kept showing in
the Roles page list, making it cluttered after a few syncs. The counter at
the top showed only active, but the visible cards included everything.

Now: the list filters by `is_active !== false` by default. An inactive-roles
strip appears only when there ARE inactive roles, showing the count, a "Show
inactive" toggle, and the purge button.

When `Show inactive` is toggled on, inactive roles render with reduced
opacity, a dashed border, and an "inactive" badge so they're visually
distinct. They also sort to the bottom of the list, after active roles.

### Verified: inactive roles are excluded from EVERY generator
Surveyed all OpenRole reads across the codebase. Every backend generator
function (`monthlyAllRolesPosts`, `weeklyThoughtLeadershipPosts`,
`generatePost`, `weeklyJobPosts`, `autoFillDay`, `weeklyNewRolesPosts`,
`autoFillWeek`) and every frontend generator-related query
(`AutoFillCalendarButton`, `PostGenerator`) already filter by
`{ is_active: true }`. Inactive roles never appear in generation paths. No
fix was needed here — the original design was correct on this point.

### Opt-in "Permanently delete N inactive" button
Inline with the inactive strip, a red-outlined Trash button that permanently
deletes all currently-inactive roles. Includes a confirmation dialog naming
the exact count and warning the action is irreversible. Existing posts that
targeted those roles aren't touched — their `target_roles` text field
already contains the role names as strings, not foreign keys.

Files: src/pages/Roles.jsx (showInactive state, inactive strip with toggle +
purge, sort puts inactive at the bottom, role cards visually distinguish
inactive). No backend or schema changes.

---

## Roles page: search filters

### Stackable filter UI + dedicated sort
Replaced the three mutually-exclusive chips (All / High Demand / New) with a
richer, stackable filter system:

**Search bar** (text match on title — unchanged)

**Segment dropdown** — filter by category (IT & Engineering, Language &
Translation, Creative & Design, Business & Finance, etc.). 10 categories.
Filter respects the displayed category, including the regex-guessed fallback
for roles stored as 'other', so the result matches what the user sees on
each card.

**Sort dropdown** — five sort modes:
- Best match (default) — high demand + new score
- Most openings — descending by `openings` count
- Highest pay — descending by parsed max value from pay_rate (best-effort,
  details below)
- Recently added — descending by created_date
- A → Z — alphabetical by title

**Stackable boolean chips** — High Demand / 🆕 New / Has openings. Each
toggles independently and they AND-combine. Each chip shows the count of
matching active roles next to its label, with subtle color hints.

**Reset filters** link — appears whenever any non-default filter is active.

**"Showing N of M" indicator** — clarifies how many roles match the current
filter set.

**Sort is always layered on top of active-first** — every sort mode keeps
inactive roles (when shown via the toggle) at the bottom regardless of sort
direction. Inactive cards still render with dashed border + reduced opacity.

### Honest note on "highest pay" sort
The `pay_rate` field is free-form text. The parser:
- Strips commas from numbers (`$80,000` → `$80000`)
- Recognizes `k` suffix as ×1000
- Recognizes `/hr`, `/hour`, `/h`, `per hour` as hourly → ×2000 to compare with annual
- Picks the HIGHEST value when a range is given (`$80-120k` → 120000)
- Heuristic: if the string contains BOTH a `k` suffix AND `/hr`, treats as
  annual (avoids treating `"80k annual or $40/hr"` as 80,000,000)
- Returns 0 if no number is found, which sinks unparseable roles to the
  bottom of pay-sorted lists

Verified against 12 realistic input cases — all pass.

This is best-effort. Mixed-unit strings with multiple hourly numbers can
still order surprisingly. If a sorted list ever looks wrong, the fix is to
clean up the underlying pay_rate text in that role.

Files: src/pages/Roles.jsx (filter state, parsePayMax helper, new filter UI).
No backend or schema changes.

---

## PostGenerator: filters + new spotlight strategies

### Stackable filter chips ("Filters" row)
Added a row of three stackable chips alongside the existing segment selector:
- 🔥 **High Demand** — restricts the role pool to `is_high_demand: true`
- 🆕 **New** — restricts to `is_new: true`
- **Has openings** — restricts to roles with `openings > 0`

Each chip shows a live count of roles in *the current selection context*
(selected roles or all active if none selected), so the number reflects what
would actually remain after toggling — not a global figure that might be
misleading.

The chips are AND-combined: turning on all three filters to just roles that
are simultaneously high demand AND new AND have openings. A "reset" link
appears when any filter is on. Filters apply intersection-style — they
narrow what's already selected, never expand it.

### Two new spotlight strategies in StrategySelector
Following the same pattern as the existing 🆕 New Roles spotlight:
- 🔥 **High Demand** (`high_demand_spotlight`) — generates a post specifically
  about high-demand roles. Backend strategy definition added with its own
  goal/hook examples/structure/tone.
- 💰 **Top Pay** (`top_pay_spotlight`) — generates a post about the top-paying
  roles. Takes the top 8 by parsed pay (descending), with non-zero pay only.

Both spotlight strategies layer ON TOP of the chip filters and the segment
selection. Example: segment "IT & Engineering" + chip "Has openings" +
strategy "Top Pay" yields the highest-paying engineering roles that
currently have openings.

### Guards
Each spotlight strategy fails loudly with a specific toast message when its
filtered pool is empty: "No 🔥 High Demand roles match your current
selection + filters." Prevents silently generating an empty/generic post.

### Refactor: pay parser extracted to a shared util
`parsePayMax` (used by both the Roles page Highest Pay sort and the new Top
Pay spotlight strategy) moved to `src/lib/pay-utils.js` so both pages
import from one source of truth. Same 12-case verification still applies.

Files: src/pages/PostGenerator.jsx (filter state, role-pool computation,
guards, filter chip UI), src/components/generator/StrategySelector.jsx (two
new strategy cards), src/pages/Roles.jsx (now imports shared util),
src/lib/pay-utils.js (NEW), base44/functions/generatePost/entry.ts (two new
strategy definitions with hooks/structure/tone).

---

## Play/Pause button: actually pauses what it claims to

### Honest pre-fix state
The Play/Pause toggle in the sidebar was wired to update THREE settings
entities (AutoPostSettings, CommunityManagingSettings, PlannerSettings) — but
only `communityManaging` and `dataAnalystPlanner` actually checked those
settings before running. Every other automated function kept running on its
cron regardless. So clicking pause was, in practice, only stopping ~25% of
the automation.

### What's gated now (cron-driven only — they should fully stop on pause)
Added pause gates at the top of these functions. Each reads
AutoPostSettings.is_paused on every invocation and returns a 200 with
`{ paused: true }` if pause is active — the cron treats it as a successful
no-op, not an error.

- `checkScheduledPosts` — was publishing scheduled posts. Now respects pause.
- `autoFillWeek` — was generating bulk posts via LLM. Now respects pause.
- `weeklyJobPosts` — bulk LLM generation. Now respects pause.
- `weeklyNewRolesPosts` — bulk LLM generation. Now respects pause.
- `weeklyThoughtLeadershipPosts` — bulk LLM generation. Now respects pause.
- `monthlyAllRolesPosts` — bulk LLM generation. Now respects pause.
- `syncAllPlatformStats` — daily API stats sync. Gated for cron, with
  bypass for manual user clicks (see below).
- `syncLinkedInStats` — same pattern as the above.

Plus the two already-gated functions:
- `communityManaging` (was already gated against CommunityManagingSettings)
- `dataAnalystPlanner` (was already gated against PlannerSettings)

### What's NOT gated (user-driven — should work while paused)
- `autoFillDay` — user clicks the calendar fill button
- `generatePost` — user clicks the PostGenerator generate button
- `generateCampaignPosts` — user-initiated campaign generation
- `approveScheduledPost` — user clicks the approve link
- `growthHelper`, `importInstagramPosts` — user-triggered features

### Manual sync bypass
`syncAllPlatformStats` and `syncLinkedInStats` accept `{ manual: true }` to
bypass the pause gate. Every frontend "Refresh stats" button now passes this
flag, so users can manually pull fresh stats while the system is paused.
The cron invocation (no body, no flag) is gated normally.

### Summary in plain language
Clicking Pause now actually stops the app from doing anything on its own —
no more publishing scheduled posts, no more bulk content generation, no more
daily stats fetches, no more comment-replier/DM-responder runs, no more
planner reports. Your LLM and platform-API spend drops to zero from
automation while paused.

Manual use of PostGenerator, AutoFillDay, the campaign tools, refresh
buttons, etc. continues to work — your active workflow isn't affected.

Files modified:
- base44/functions/checkScheduledPosts/entry.ts (gate)
- base44/functions/autoFillWeek/entry.ts (gate)
- base44/functions/weeklyJobPosts/entry.ts (gate)
- base44/functions/weeklyNewRolesPosts/entry.ts (gate)
- base44/functions/weeklyThoughtLeadershipPosts/entry.ts (gate)
- base44/functions/monthlyAllRolesPosts/entry.ts (gate)
- base44/functions/syncAllPlatformStats/entry.ts (gate + manual bypass)
- base44/functions/syncLinkedInStats/entry.ts (gate + manual bypass)
- 8 frontend files: pass { manual: true } when invoking sync functions

---

## QA review fixes (pre-launch)

Three bugs surfaced in the pre-launch review, all fixed:

### Bug #1 — ResponderAction 30-day retention cleanup was dead code
The cleanup queried `list('-created_date', 500)` (newest 500 records, sorted
descending). The 500 newest records are by definition all newer than the
30-day cutoff, so the deletion check `r.created_date < cutoff` never matched
and nothing was ever deleted. The table would have grown unbounded.

Fix: sort ASCENDING (oldest first) via `list('created_date', 200)`, then
iterate and break out as soon as we hit a record at-or-newer-than the cutoff.
Added a per-run delete cap (50) so a backlog after a long pause doesn't blow
the function timeout — leftover old records are picked up by subsequent
runs. Also made the loop robust against null `created_date` (defensive: skip
rather than break, so a single bad record can't block cleanup).

Verified across 5 scenarios: all-fresh (0 deleted, breaks early), mixed-old-
and-fresh (deletes exactly the old ones), large backlog (deletes the cap and
leaves the rest for next run), empty table (no work), nulls in the middle
(skipped, real deletes still happen).

File: base44/functions/communityManaging/entry.ts.

### Bug #2 — `dms_sent` never initialized in `freshLog()`
The `freshLog()` factory initialized `comments_posted: 0` but not
`dms_sent`. The DM responder functions then did `if (log.dms_sent >= cap)
break` and `log.dms_sent++` — but `undefined >= cap` is `false`, so the
break never fired on the first action, and `undefined++` produced `NaN`.
Once NaN, the value stayed NaN, the cap check silently disabled itself,
and `consume(log)` added NaN to the in-flight budget tracker, corrupting
it for the rest of the cron run.

Net effect: the per-session DM cap (2 actions) was silently disabled,
allowing burstier DM sending than designed on each cron run.

Fix: added `dms_sent: 0` to `freshLog()`. Verified via Node.js that
`{dms_sent:0}.dms_sent++` produces 1 (and `1 >= 2` correctly evaluates
to false, then `2 >= 2` correctly evaluates to true — cap works).

File: base44/functions/communityManaging/entry.ts.

### Bug #3 — Setup guide was missing required crons
The guide listed 4 crons (`checkScheduledPosts`, `syncAllPlatformStats`,
`syncLinkedInStats`, `dataAnalystPlanner`) but didn't mention
`communityManaging`. Without that one, the entire community-managing engine
— comment replies, DM responder, "Comment Remote" flow, the Responder
Activity audit — never fires.

Also missing: the four Tier 3 content-automation crons (`autoFillWeek`,
`weeklyJobPosts`, `weeklyNewRolesPosts`, `weeklyThoughtLeadershipPosts`,
`monthlyAllRolesPosts`).

Fix: rewrote Step 5 of the setup guide with a three-tier structure (Tier 1
required, Tier 2 strongly recommended, Tier 3 optional content automation).
Each cron has a one-line explanation of what it does and what breaks if
you skip it. Updated the troubleshooting section to list communityManaging
in the silent-failure causes.

Regenerated both Base44_Setup_Guide.txt and Base44_Setup_Guide.pdf.

Files: SETUP_BASE44.txt, /mnt/user-data/outputs/Base44_Setup_Guide.{txt,pdf}.
