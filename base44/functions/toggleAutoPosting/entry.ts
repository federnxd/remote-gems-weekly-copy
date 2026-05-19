import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Toggles all auto-posting scheduled automations on/off.
 * Returns the new state (isPaused: boolean).
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { pause } = body;

  // If pause is undefined/null, just return current state
  if (pause === undefined || pause === null) {
    const automations = await base44.asServiceRole.automations.list({ automation_type: 'scheduled' });
    const autoPostFunctions = [
      'autoFillWeek',
      'weeklyJobPosts',
      'weeklyNewRolesPosts',
      'weeklyThoughtLeadershipPosts',
      'monthlyAllRolesPosts',
    ];
    const autoPostAutomations = automations.filter(a => autoPostFunctions.includes(a.function_name));
    // If any are inactive, we're paused
    const anyActive = autoPostAutomations.some(a => a.is_active);
    return Response.json({ isPaused: !anyActive, automations: autoPostAutomations.map(a => ({ id: a.id, name: a.name, is_active: a.is_active })) });
  }

  const db = base44.asServiceRole;
  
  // Get all scheduled automations related to auto-posting
  const automations = await db.automations.list({ automation_type: 'scheduled' });
  
  // Filter to only auto-posting automations (exclude checkScheduledPosts which is just monitoring)
  const autoPostFunctions = [
    'autoFillWeek',
    'weeklyJobPosts',
    'weeklyNewRolesPosts',
    'weeklyThoughtLeadershipPosts',
    'monthlyAllRolesPosts',
  ];
  
  const toToggle = automations.filter(a => autoPostFunctions.includes(a.function_name));
  
  const results = [];
  for (const automation of toToggle) {
    await db.automations.update(automation.id, { is_active: !pause });
    results.push({ id: automation.id, name: automation.name, is_active: !pause });
  }

  return Response.json({ 
    message: pause ? 'Auto-posting paused' : 'Auto-posting resumed',
    isPaused: pause,
    toggledCount: toToggle.length,
    automations: results,
  });
});