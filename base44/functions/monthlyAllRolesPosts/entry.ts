import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs on the first Monday of each month (scheduled automation).
 * Generates posts for ALL active roles across ALL platforms.
 * Spreads posts across the first week (Mon–Sun), one platform per slot.
 * All posts saved as 'scheduled' — approval email sent 30 min before via checkScheduledPosts.
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

  // Fetch all active roles
  const roles = await db.entities.OpenRole.filter({ is_active: true });

  if (!roles.length) {
    return Response.json({ message: 'No active roles found', created: 0 });
  }

  // Spread platforms across the week (Mon = day 0, Sun = day 6)
  const today = new Date();
  const scheduledDates = ALL_PLATFORMS.map((_, i) => getDateForDayOffset(today, i % 7));

  // Invoke the generation engine
  const result = await db.functions.invoke('generateCampaignPosts', {
    roles: roles.map(r => ({
      title: r.title,
      is_new: r.is_new || false,
      required_skills: r.required_skills || '',
      pay_rate: r.pay_rate || '',
      openings: r.openings || 0,
    })),
    platforms: ALL_PLATFORMS,
    scheduledDates,
    scheduledTime: '09:00',
    titlePrefix: `Monthly All-Roles — ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    highlightNew: false,
  });

  return Response.json({
    message: 'Monthly all-roles posts generated',
    ...result,
  });
});