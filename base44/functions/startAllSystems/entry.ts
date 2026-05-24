import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    await Promise.all([
      base44.asServiceRole.entities.AutoPostSettings.list().then(async (records) => {
        if (records.length > 0) {
          await base44.asServiceRole.entities.AutoPostSettings.update(records[0].id, { is_paused: false });
        } else {
          await base44.asServiceRole.entities.AutoPostSettings.create({ is_paused: false });
        }
      }),
      base44.asServiceRole.entities.CommunityManagingSettings.list().then(async (records) => {
        if (records.length > 0) {
          await base44.asServiceRole.entities.CommunityManagingSettings.update(records[0].id, { is_paused: false });
        } else {
          await base44.asServiceRole.entities.CommunityManagingSettings.create({ is_paused: false });
        }
      }),
      base44.asServiceRole.entities.PlannerSettings.list().then(async (records) => {
        if (records.length > 0) {
          await base44.asServiceRole.entities.PlannerSettings.update(records[0].id, { is_paused: false });
        } else {
          await base44.asServiceRole.entities.PlannerSettings.create({ is_paused: false });
        }
      }),
    ]);

    return Response.json({ message: 'All systems started', isRunning: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});