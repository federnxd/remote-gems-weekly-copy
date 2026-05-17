import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs every Monday (scheduled automation).
 * Generates posts ONLY for roles marked is_new=true, across ALL platforms.
 * Spreads posts Mon–Sun.
 * Skips if no new roles found.
 */

const ALL_PLATFORMS = [
  'linkedin', 'twitter', 'instagram',
  'weworkremotely', 'wellfound', 'remotive',
  'flexjobs', 'remoteok', 'reddit', 'discord',
];

function getDateForDayOffset(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  // Fetch only NEW active roles
  const newRoles = await db.entities.OpenRole.filter({ is_active: true, is_new: true });

  if (!newRoles.length) {
    return Response.json({ message: 'No new roles found this week — skipping', created: 0 });
  }

  const today = new Date();
  const scheduledDates = ALL_PLATFORMS.map((_, i) => getDateForDayOffset(today, i % 7));

  const result = await db.functions.invoke('generateCampaignPosts', {
    roles: newRoles.map(r => ({
      title: r.title,
      is_new: true,
      required_skills: r.required_skills || '',
      pay_rate: r.pay_rate || '',
      openings: r.openings || 0,
    })),
    platforms: ALL_PLATFORMS,
    scheduledDates,
    scheduledTime: '10:00',
    titlePrefix: `Weekly New Roles — ${today.toISOString().split('T')[0]}`,
    highlightNew: true,
  });

  return Response.json({
    message: `Weekly new roles posts generated for ${newRoles.length} new role(s)`,
    newRoles: newRoles.map(r => r.title),
    ...result,
  });
});