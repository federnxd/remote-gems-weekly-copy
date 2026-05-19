import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Toggles auto-posting on/off by storing state in AutoPostSettings entity.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { pause } = body;

  // Get or create settings record
  let settings = await base44.asServiceRole.entities.AutoPostSettings.filter({});
  if (!settings || settings.length === 0) {
    settings = [await base44.asServiceRole.entities.AutoPostSettings.create({ is_paused: false })];
  }
  const settingsRecord = settings[0];

  // If pause is undefined/null, just return current state
  if (pause === undefined || pause === null) {
    return Response.json({ isRunning: !settingsRecord.is_paused });
  }

  // Update the setting
  await base44.asServiceRole.entities.AutoPostSettings.update(settingsRecord.id, { is_paused: pause });

  return Response.json({ 
    message: pause ? 'Auto-posting paused' : 'Auto-posting resumed',
    isRunning: !pause,
  });
});