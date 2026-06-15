import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Check if paused
    const plannerSettings = await db.entities.PlannerSettings.filter({});
    if (plannerSettings.length > 0 && plannerSettings[0].is_paused) {
      return Response.json({ skipped: true, message: 'DataAnalystPlanner is paused.' });
    }

    // Determine report type from payload or auto-detect
    let body = {};
    try { body = await req.json(); } catch { /* no body */ }

    const today = new Date();
    const isLastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate();
    const reportType = body.report_type || (isLastDayOfMonth ? 'monthly' : 'weekly');

    const periodLabel = reportType === 'monthly'
      ? today.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
      : `Week of ${new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

    // ── 1. GATHER ALL DATA ────────────────────────────────────────────────────

    // All published posts
    const allPosts = await db.entities.GeneratedPost.filter({ status: 'published' });

    // Get posts from the relevant period.
    // Bound on BOTH ends: published posts whose scheduled_date falls within
    // [cutoffDate, today]. Without the upper bound, future-dated posts (e.g.
    // published late, or timezone edges) would leak into the analysis.
    const cutoffDays = reportType === 'monthly' ? 30 : 7;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const recentPosts = allPosts.filter(p => {
      if (!p.scheduled_date) return false;
      const d = new Date(p.scheduled_date);
      return d >= cutoffDate && d <= endOfToday;
    });

    // Community engagement logs
    const allEngLogs = await db.entities.CommunityEngagementLog.list('-run_date', 90);
    const recentEngLogs = allEngLogs.filter(l => l.run_date && new Date(l.run_date) >= cutoffDate);

    // LinkedIn snapshots
    const snapshots = await db.entities.CompanyDashboardSnapshot.list('-snapshot_date', 10);
    const latestSnapshot = snapshots[0] || null;

    // Previous planner reports for context
    const prevReports = await db.entities.PlannerReport.list('-created_date', 3);

    // Nothing to analyze yet — skip the (expensive) AI call and produce no noise.
    if (recentPosts.length === 0 && recentEngLogs.length === 0 && !latestSnapshot) {
      return Response.json({
        skipped: true,
        report_type: reportType,
        period: periodLabel,
        message: 'No published posts, engagement logs, or dashboard snapshots in this period yet — nothing to analyze.',
      });
    }

    // ── 2. COMPUTE STATISTICS ─────────────────────────────────────────────────

    // Per-platform post performance
    const platformStats = {};
    const strategyStats = {};

    for (const post of recentPosts) {
      // Extract platform from notes or title
      const platformMatch = (post.notes || post.title || '').match(/platform:([^\s]+)/);
      const platform = platformMatch ? platformMatch[1] : 'linkedin';

      if (!platformStats[platform]) {
        platformStats[platform] = { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, referrals: 0, hired: 0, count: 0 };
      }

      // Sum all platform metrics for this post
      const totalImpressions = (post.impressions || 0) + (post.twitter_impressions || 0) + (post.fb_impressions || 0) + (post.ig_impressions || 0) + (post.threads_views || 0);
      const totalLikes = (post.likes || 0) + (post.twitter_likes || 0) + (post.fb_likes || 0) + (post.ig_likes || 0) + (post.threads_likes || 0) + (post.bsky_likes || 0) + (post.mastodon_favourites || 0);
      const totalComments = (post.comments || 0) + (post.twitter_replies || 0) + (post.fb_comments || 0) + (post.ig_comments || 0) + (post.threads_replies || 0) + (post.bsky_replies || 0) + (post.mastodon_replies || 0);
      const totalShares = (post.shares || 0) + (post.twitter_retweets || 0) + (post.fb_shares || 0) + (post.ig_shares || 0) + (post.threads_reposts || 0) + (post.bsky_reposts || 0) + (post.mastodon_boosts || 0);
      const totalClicks = (post.clicks || 0) + (post.twitter_link_clicks || 0) + (post.fb_link_clicks || 0);

      platformStats[platform].impressions += totalImpressions;
      platformStats[platform].likes += totalLikes;
      platformStats[platform].comments += totalComments;
      platformStats[platform].shares += totalShares;
      platformStats[platform].clicks += totalClicks;
      platformStats[platform].referrals += post.referrals || 0;
      platformStats[platform].hired += post.hired || 0;
      platformStats[platform].count++;

      // Strategy stats
      const strat = post.strategy || 'unknown';
      if (!strategyStats[strat]) {
        strategyStats[strat] = { totalImpressions: 0, totalEngagement: 0, referrals: 0, hired: 0, count: 0 };
      }
      strategyStats[strat].totalImpressions += totalImpressions;
      strategyStats[strat].totalEngagement += totalLikes + totalComments + totalShares;
      strategyStats[strat].referrals += post.referrals || 0;
      strategyStats[strat].hired += post.hired || 0;
      strategyStats[strat].count++;
    }

    // Compute engagement rates per strategy
    const strategyRanked = Object.entries(strategyStats).map(([strat, s]) => ({
      strategy: strat,
      engagementRate: s.totalImpressions > 0 ? ((s.totalEngagement / s.totalImpressions) * 100).toFixed(2) : '0',
      referrals: s.referrals,
      hired: s.hired,
      avgEngagementPerPost: s.count > 0 ? (s.totalEngagement / s.count).toFixed(1) : '0',
      postCount: s.count,
    })).sort((a, b) => parseFloat(b.referrals) - parseFloat(a.referrals) || parseFloat(b.engagementRate) - parseFloat(a.engagementRate));

    // Top posts by referrals + engagement
    const topPosts = [...recentPosts]
      .map(p => ({
        id: p.id,
        title: p.title,
        strategy: p.strategy,
        referrals: p.referrals || 0,
        hired: p.hired || 0,
        date: p.scheduled_date,
        totalEngagement: (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.twitter_likes || 0) + (p.twitter_replies || 0),
      }))
      .sort((a, b) => b.referrals - a.referrals || b.totalEngagement - a.totalEngagement)
      .slice(0, 5);

    // Community managing engagement summary per platform
    const cmSummary = {};
    for (const log of recentEngLogs) {
      if (!cmSummary[log.platform]) cmSummary[log.platform] = { sessions: 0, likes: 0, comments: 0, follows: 0, warnings: 0 };
      cmSummary[log.platform].sessions++;
      cmSummary[log.platform].likes += log.likes_given || 0;
      cmSummary[log.platform].comments += log.comments_posted || 0;
      cmSummary[log.platform].follows += log.follows_made || 0;
      if (log.warnings && log.status !== 'success') cmSummary[log.platform].warnings++;
    }

    // Detect ban risk: platforms with multiple warnings or sudden drops
    const banRiskPlatforms = Object.entries(cmSummary)
      .filter(([_, s]) => s.warnings >= 2 || (s.sessions > 3 && s.likes === 0 && s.comments === 0))
      .map(([platform]) => platform);

    // LinkedIn profile-level data
    const linkedinSummary = latestSnapshot ? {
      impressions: latestSnapshot.impressions,
      reach: latestSnapshot.reach,
      reactions: latestSnapshot.reactions,
      comments: latestSnapshot.comments,
      reposts: latestSnapshot.reposts,
      link_clicks: latestSnapshot.link_clicks,
      followers_gained: latestSnapshot.followers_gained,
      referrals: latestSnapshot.total_referrals,
      hired: latestSnapshot.successful_referrals,
    } : null;

    // ── 3. BUILD AI ANALYSIS PROMPT ───────────────────────────────────────────

    const analysisPrompt = `You are DataAnalystPlanner — an expert data analyst, statistician, and marketing strategist specialized in social media recruitment campaigns. Your goal is to maximize referral submissions and hires for micro1, an AI company that hires remote experts.

ANALYSIS TYPE: ${reportType.toUpperCase()} REPORT
PERIOD: ${periodLabel}
DATE: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

═══════════════════════════════
PUBLISHED POSTS THIS PERIOD: ${recentPosts.length} posts
TOTAL POSTS ALL TIME: ${allPosts.length} posts

STRATEGY PERFORMANCE (ranked by referrals & engagement):
${JSON.stringify(strategyRanked, null, 2)}

PLATFORM PERFORMANCE:
${JSON.stringify(platformStats, null, 2)}

TOP 5 POSTS:
${JSON.stringify(topPosts, null, 2)}

LINKEDIN PROFILE SNAPSHOT:
${linkedinSummary ? JSON.stringify(linkedinSummary, null, 2) : 'No snapshot available'}

COMMUNITY MANAGING SUMMARY (${cutoffDays} days):
${JSON.stringify(cmSummary, null, 2)}

BAN RISK FLAGS: ${banRiskPlatforms.length > 0 ? banRiskPlatforms.join(', ') : 'None detected'}

PREVIOUS REPORT SUMMARY (last 3):
${prevReports.map(r => `- ${r.period_label} (${r.report_type}): ${r.action_items ? r.action_items.slice(0, 200) : 'no actions recorded'}`).join('\n') || 'No previous reports'}
═══════════════════════════════

YOUR TASK: Produce a structured ${reportType} analysis. Be specific, data-driven, and actionable. Avoid generic advice.

RESPOND WITH VALID JSON ONLY (no markdown, no code blocks, pure JSON):
{
  "full_analysis": "3-5 paragraph narrative analysis covering performance, patterns, correlations between engagement and referrals/hires, and strategic recommendations. Be specific and cite the numbers.",
  "top_performing_strategies": [{"strategy": "...", "why": "...", "referrals": 0, "engagement_rate": "0%", "recommendation": "..."}],
  "underperforming_strategies": [{"strategy": "...", "why": "...", "recommendation": "deprioritize|adjust|drop"}],
  "platform_insights": {"linkedin": "...", "twitter": "...", "facebook": "...", "instagram": "...", "threads": "...", "bluesky": "...", "mastodon": "..."},
  "engagement_time_insights": "Best days and times based on available data. If insufficient data, provide evidence-based recommendations for remote work job content.",
  "recommended_hashtags": "comma,separated,list,of,10-15,hashtags,for,community,managing",
  "recommended_posting_times": {"linkedin": "HH:MM", "twitter": "HH:MM", "facebook": "HH:MM", "instagram": "HH:MM", "threads": "HH:MM", "bluesky": "HH:MM", "mastodon": "HH:MM"},
  "recommended_strategies": ["strategy1", "strategy2", "strategy3"],
  "action_items": [
    {"priority": 1, "action": "...", "platform": "all|specific", "rationale": "..."},
    {"priority": 2, "action": "...", "platform": "...", "rationale": "..."},
    {"priority": 3, "action": "...", "platform": "...", "rationale": "..."}
  ],
  "ban_risk_flags": [{"platform": "...", "reason": "...", "recommendation": "pause|reduce|monitor"}],
  "should_pause_community_managing": ["platform1", "platform2"],
  "community_managing_adjustments": "Specific instructions to improve CM: which hashtags to target, when to engage, comment tone, follow/like ratios"
}`;

    // ── 4. CALL AI ────────────────────────────────────────────────────────────

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are DataAnalystPlanner. You respond ONLY with valid JSON. No markdown. No explanations outside the JSON.' },
        { role: 'user', content: analysisPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.3,
    });

    const rawContent = completion.choices?.[0]?.message?.content || '';
    let analysis;
    try {
      analysis = JSON.parse(rawContent.trim());
    } catch {
      // Try to extract a JSON object if it's wrapped in markdown/prose.
      try {
        const match = rawContent.match(/\{[\s\S]+\}/);
        analysis = match ? JSON.parse(match[0]) : { full_analysis: rawContent };
      } catch {
        // Still unparseable — keep the narrative so the report isn't lost,
        // and proceed with safe empty defaults for everything else.
        analysis = { full_analysis: rawContent };
      }
    }
    if (!analysis || typeof analysis !== 'object') analysis = { full_analysis: String(rawContent) };

    // ── 5. HANDLE BAN RISKS — PAUSE COMMUNITY MANAGING ───────────────────────

    // The LLM-suggested list is untrusted: accept it only if it's an array of
    // non-empty strings. Otherwise fall back to our own computed risk detection.
    const llmPause = analysis.should_pause_community_managing;
    const platformsToPause = (Array.isArray(llmPause)
      ? llmPause.filter(p => typeof p === 'string' && p.trim())
      : banRiskPlatforms);

    if (platformsToPause.length > 0) {
      // Pause community managing globally if any high-risk platform is flagged.
      const cmSettings = await db.entities.CommunityManagingSettings.filter({});
      if (cmSettings.length > 0) {
        await db.entities.CommunityManagingSettings.update(cmSettings[0].id, { is_paused: true });
      } else {
        // No settings record yet — create one already paused, so the pause
        // actually takes effect instead of silently doing nothing.
        await db.entities.CommunityManagingSettings.create({ is_paused: true });
      }
    }

    // ── 6. SAVE REPORT ────────────────────────────────────────────────────────

    const report = await db.entities.PlannerReport.create({
      report_type: reportType,
      period_label: periodLabel,
      top_performing_strategies: JSON.stringify(analysis.top_performing_strategies || []),
      underperforming_strategies: JSON.stringify(analysis.underperforming_strategies || []),
      top_performing_posts: JSON.stringify(topPosts),
      platform_insights: JSON.stringify(analysis.platform_insights || {}),
      engagement_time_insights: analysis.engagement_time_insights || '',
      recommended_hashtags: analysis.recommended_hashtags || '',
      recommended_posting_times: JSON.stringify(analysis.recommended_posting_times || {}),
      recommended_strategies: JSON.stringify(analysis.recommended_strategies || []),
      action_items: JSON.stringify(analysis.action_items || []),
      ban_risk_flags: JSON.stringify(analysis.ban_risk_flags || []),
      community_managing_paused_platforms: platformsToPause.join(','),
      full_analysis: analysis.full_analysis || '',
      status: 'completed',
    });

    // ── 7. SYNC THE CURRENT WEEKLY PLAN WITH THE PLANNER'S DECISIONS ──────────
    // The WeeklyPlan / Strategy pages are live reflections of the planner. Posting
    // still reads getPlannerContext (single source of truth); this just keeps the
    // planning views in step with each report so they improve over time.
    try {
      const recStrategies = Array.isArray(analysis.recommended_strategies) ? analysis.recommended_strategies : [];
      const recHashtags = analysis.recommended_hashtags || '';
      const topStr = (analysis.top_performing_strategies || []).slice(0, 3)
        .map(s => typeof s === 'string' ? s : (s?.strategy || s?.name)).filter(Boolean);
      const underStr = (analysis.underperforming_strategies || []).slice(0, 3)
        .map(s => typeof s === 'string' ? s : (s?.strategy || s?.name)).filter(Boolean);
      const actions = (Array.isArray(analysis.action_items) ? analysis.action_items : []).slice(0, 4);

      // Human-readable summary written into strategy_notes.
      const summaryLines = [];
      summaryLines.push(`📊 Auto-synced from ${reportType} report (${periodLabel})`);
      if (recStrategies.length) summaryLines.push(`Priority strategies: ${recStrategies.map(s => s.replace(/_/g, ' ')).join(' › ')}`);
      if (topStr.length) summaryLines.push(`Working well: ${topStr.map(s => String(s).replace(/_/g, ' ')).join(', ')}`);
      if (underStr.length) summaryLines.push(`Ease off: ${underStr.map(s => String(s).replace(/_/g, ' ')).join(', ')}`);
      if (analysis.engagement_time_insights) summaryLines.push(`Timing: ${String(analysis.engagement_time_insights).slice(0, 160)}`);
      if (recHashtags) summaryLines.push(`Hashtags: ${recHashtags}`);
      if (actions.length) summaryLines.push(`Actions:\n${actions.map(a => `• ${typeof a === 'string' ? a : (a?.action || JSON.stringify(a))}`).join('\n')}`);
      const strategyNotes = summaryLines.join('\n');

      // Find the plan to sync. week_label is free-text the user types, so we
      // don't match on it (that would create duplicates). Instead: prefer an
      // 'active' plan, else the most recently created plan, else create one.
      const allPlans = await db.entities.WeeklyPlan.list('-created_date', 20);
      const targetPlan = allPlans.find(p => p.status === 'active')
        || allPlans.find(p => p.status === 'planning')
        || allPlans[0];

      const planFields = {
        active_strategies: recStrategies.join(','),
        recommended_hashtags: recHashtags,
        strategy_notes: strategyNotes,
        last_planner_sync: new Date().toISOString(),
        planner_report_period: periodLabel,
      };
      if (targetPlan) {
        await db.entities.WeeklyPlan.update(targetPlan.id, planFields);
      } else {
        // No plans exist yet — seed one with an auto label so the page has
        // something to show; the user can rename it.
        const autoLabel = `Week of ${today.toISOString().slice(0, 10)}`;
        await db.entities.WeeklyPlan.create({ week_label: autoLabel, status: 'active', ...planFields });
      }
    } catch (e) {
      // Non-fatal: the report itself already saved; plan sync is a reflection.
      console.error('WeeklyPlan sync failed:', e.message);
    }

    return Response.json({
      success: true,
      report_type: reportType,
      period: periodLabel,
      report_id: report.id,
      action_items: analysis.action_items || [],
      ban_risks: platformsToPause,
      cm_paused: platformsToPause.length > 0,
      summary: `${reportType} analysis complete. ${(analysis.action_items || []).length} action items generated. ${platformsToPause.length > 0 ? `⚠️ Community managing paused for: ${platformsToPause.join(', ')}` : 'No ban risks detected.'}`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});