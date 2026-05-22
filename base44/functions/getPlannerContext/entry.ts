import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Returns the latest PlannerReport data formatted as a context string
 * to inject into LLM prompts across all automated functions.
 * Called by: weeklyJobPosts, weeklyThoughtLeadershipPosts, autoFillWeek, communityManaging
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Get most recent completed report
    const reports = await db.entities.PlannerReport.list('-created_date', 3);
    const latest = reports.find(r => r.status === 'completed');

    if (!latest) {
      return Response.json({ context: null, hasData: false });
    }

    function safeJSON(str, fallback) {
      try { return typeof str === 'string' ? JSON.parse(str) : (str || fallback); } catch { return fallback; }
    }

    const actionItems = safeJSON(latest.action_items, []);
    const topStrategies = safeJSON(latest.top_performing_strategies, []);
    const underStrategies = safeJSON(latest.underperforming_strategies, []);
    const platformInsights = safeJSON(latest.platform_insights, {});
    const recommendedStrategies = safeJSON(latest.recommended_strategies, []);
    const postingTimes = safeJSON(latest.recommended_posting_times, {});

    // Build compact context string for LLM injection
    const contextLines = [
      `=== DATAANALYSTPLANNER FEEDBACK (${latest.period_label} · ${latest.report_type} report) ===`,
      `Last updated: ${new Date(latest.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      '',
    ];

    if (recommendedStrategies.length > 0) {
      contextLines.push(`PRIORITY STRATEGIES (use these, in order): ${recommendedStrategies.map(s => s.replace(/_/g, ' ')).join(' > ')}`);
    }

    if (topStrategies.length > 0) {
      contextLines.push(`TOP PERFORMING STRATEGIES:`);
      topStrategies.slice(0, 3).forEach(s => {
        contextLines.push(`  - ${s.strategy?.replace(/_/g, ' ')}: ${s.why || ''} ${s.engagement_rate ? `(${s.engagement_rate} eng. rate)` : ''}`);
      });
    }

    if (underStrategies.length > 0) {
      contextLines.push(`UNDERPERFORMING (avoid or adjust):`);
      underStrategies.slice(0, 2).forEach(s => {
        contextLines.push(`  - ${s.strategy?.replace(/_/g, ' ')}: ${s.why || ''}`);
      });
    }

    if (Object.keys(platformInsights).length > 0) {
      contextLines.push(`PLATFORM-SPECIFIC INSIGHTS:`);
      Object.entries(platformInsights).forEach(([p, insight]) => {
        if (insight) contextLines.push(`  - ${p}: ${insight}`);
      });
    }

    if (actionItems.length > 0) {
      contextLines.push(`TOP ACTION ITEMS FOR THIS PERIOD:`);
      actionItems.slice(0, 3).forEach((item, i) => {
        contextLines.push(`  ${i + 1}. ${item.action || item} ${item.platform && item.platform !== 'all' ? `[${item.platform}]` : ''}`);
      });
    }

    if (latest.engagement_time_insights) {
      contextLines.push(`ENGAGEMENT TIMING: ${latest.engagement_time_insights}`);
    }

    if (latest.recommended_hashtags) {
      contextLines.push(`BEST PERFORMING HASHTAGS: ${latest.recommended_hashtags}`);
    }

    contextLines.push(`=== END PLANNER FEEDBACK ===`);

    return Response.json({
      hasData: true,
      context: contextLines.join('\n'),
      postingTimes,
      recommendedHashtags: latest.recommended_hashtags ? latest.recommended_hashtags.split(',').map(h => h.trim()).filter(Boolean) : [],
      recommendedStrategies,
      topStrategies,
      reportType: latest.report_type,
      periodLabel: latest.period_label,
    });

  } catch (error) {
    return Response.json({ context: null, hasData: false, error: error.message });
  }
});