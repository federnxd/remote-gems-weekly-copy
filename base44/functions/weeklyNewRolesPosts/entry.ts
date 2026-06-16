import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs every Monday (scheduled automation).
 * Generates posts ONLY for roles marked is_new=true.
 * - LinkedIn gets a post on Monday
 * - Non-LinkedIn platforms spread across the remaining week (Tue–Sun)
 * Skips if no new roles found.
 */

const NON_LINKEDIN_PLATFORMS = [
  'twitter', 'instagram',
  'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

const ALL_PLATFORMS = [...NON_LINKEDIN_PLATFORMS];

function getDateOffset(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  // ── Pause gate ────────────────────────────────────────────────────────
  // Honors the global Play/Pause switch in the sidebar. When paused, we
  // return a 200 with a message instead of doing any work — the cron
  // shouldn't treat pause as an error.
  try {
    const settings = await db.entities.AutoPostSettings.list();
    if (settings.length > 0 && settings[0].is_paused) {
      return Response.json({ message: 'Auto-posting is paused. Skipping.', paused: true });
    }
  } catch { /* if settings entity missing, default to running */ }

  // Fetch only NEW active roles
  const newRoles = await db.entities.OpenRole.filter({ is_active: true, is_new: true });

  if (!newRoles.length) {
    return Response.json({ message: 'No new roles found this week — skipping', created: 0 });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Spread non-LinkedIn platforms across Tue–Sun
  const nonLinkedinDates = NON_LINKEDIN_PLATFORMS.map((_, i) => getDateOffset(today, 1 + (i % 6)));

  const nonLinkedinResult = await db.functions.invoke('generateCampaignPosts', {
    roles: newRoles.map(r => ({
      title: r.title,
      is_new: true,
      required_skills: r.required_skills || '',
      pay_rate: r.pay_rate || '',
      openings: r.openings || 0,
    })),
    platforms: NON_LINKEDIN_PLATFORMS,
    scheduledDates: nonLinkedinDates,
    scheduledTime: '10:00',
    titlePrefix: `Weekly New Roles — ${todayStr}`,
    highlightNew: true,
  });

  const totalCreated = (nonLinkedinResult?.data?.total || 0);

  return Response.json({
    message: `Weekly new roles posts generated for ${newRoles.length} new role(s)`,
    newRoles: newRoles.map(r => r.title),
    totalCreated,
  });
});