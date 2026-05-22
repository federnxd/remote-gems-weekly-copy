import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { pause } = body;

  let settings = await base44.asServiceRole.entities.PlannerSettings.filter({});
  if (!settings || settings.length === 0) {
    settings = [await base44.asServiceRole.entities.PlannerSettings.create({ is_paused: false })];
  }
  const settingsRecord = settings[0];

  if (pause === undefined || pause === null) {
    return Response.json({ isRunning: !settingsRecord.is_paused });
  }

  await base44.asServiceRole.entities.PlannerSettings.update(settingsRecord.id, { is_paused: pause });

  return Response.json({
    message: pause ? 'DataAnalystPlanner paused' : 'DataAnalystPlanner resumed',
    isRunning: !pause,
  });
});