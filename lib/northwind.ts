// Off-camera helpers around the live Northwind onboarding (scenes 02, 03, 05).
import {
  SVC, HttpError, adminClient, loadState, saveState, prepareNorthwindForGenerate, relaxNorthwindCompliance,
} from '../setup/setup-demo.js';

const list = (x: unknown): any[] =>
  Array.isArray(x) ? x : ((x as any)?.items ?? (x as any)?.rows ?? (x as any)?.data ?? []);

async function attempt<T>(f: () => Promise<T>): Promise<T | undefined> {
  try {
    return await f();
  } catch (err) {
    if (err instanceof HttpError) console.log(`  (ignored) ${err.message.slice(0, 140)}`);
    else throw err;
    return undefined;
  }
}

export async function findNorthwind(): Promise<{ clientId: string; campaignId?: string } | undefined> {
  const s = loadState();
  const admin = await adminClient(s);
  const clients = list(await admin.get(SVC.forecasting, '/api/v1/clients?status=all'));
  const c = clients.find((x) => x.name === 'Northwind Delivery');
  if (!c) return undefined;
  const campaigns = list(await admin.get(SVC.forecasting, `/api/v1/campaigns?clientId=${c.id}&status=all`));
  return { clientId: c.id, campaignId: campaigns[0]?.id };
}

/** Remove everything a take of scenes 02–05 created, so the next take starts from a clean client list. */
export async function resetNorthwind(): Promise<void> {
  const s = loadState();
  const admin = await adminClient(s);
  const queueId = s.queues['Voice – Northwind'];
  const clients = list(await admin.get(SVC.forecasting, '/api/v1/clients?status=all'))
    .filter((x) => x.name === 'Northwind Delivery' || String(x.name).startsWith('zz take'));
  for (const c of clients) {
    const campaigns = list(await attempt(() => admin.get(SVC.forecasting, `/api/v1/campaigns?clientId=${c.id}&status=all`)));
    for (const camp of campaigns) {
      for (const sch of list(await admin.get(SVC.scheduling, '/api/v1/schedules')).filter((x) => x.campaignId === camp.id)) {
        if (sch.status === 'PUBLISHED') await attempt(() => admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/unpublish`, { reason: 'demo retake' }));
        await attempt(() => admin.del(SVC.scheduling, `/api/v1/schedules/${sch.id}`));
      }
      for (const t of list(await admin.get(SVC.scheduling, `/api/v1/shift-templates?campaignId=${camp.id}`)).filter((x) => x.campaignId === camp.id)) {
        await attempt(() => admin.del(SVC.scheduling, `/api/v1/shift-templates/${t.id}`));
      }
      const teams = list(await admin.get(SVC.workforce, '/api/v1/teams')).filter((t) => t.campaignId === camp.id);
      for (const t of teams) {
        await attempt(() => admin.post(SVC.workforce, '/api/v1/agents/bulk', { agentIds: s.northwindAgentIds, removeTeamIds: [t.id] }));
        await attempt(() => admin.del(SVC.workforce, `/api/v1/teams/${t.id}`));
      }
      if (queueId) await attempt(() => admin.del(SVC.forecasting, `/api/v1/campaigns/${camp.id}/queues/${queueId}`));
      await attempt(() => admin.del(SVC.forecasting, `/api/v1/campaigns/${camp.id}`));
    }
    const gone = await attempt(() => admin.del(SVC.forecasting, `/api/v1/clients/${c.id}`));
    // If the API only archives, rename so the on-camera name is free and the old row stays out of sight.
    if (gone === undefined || c.name === 'Northwind Delivery') {
      await attempt(() => admin.patch(SVC.forecasting, `/api/v1/clients/${c.id}`, { name: `zz take ${Date.now()}`, code: null, isActive: false }));
    }
  }
  console.log(`reset: ${clients.length} Northwind client(s) cleared`);
  if (clients.length > 0) await rotateNorthwindQueue();
}

export async function prepareForGenerate(): Promise<string> {
  const nw = await findNorthwind();
  if (!nw?.campaignId) throw new Error('Northwind campaign not found — record scenes 02–03 first');
  await prepareNorthwindForGenerate(nw.campaignId);
  await relaxNorthwindCompliance(nw.campaignId);
  return nw.campaignId;
}

/**
 * Give each take its own "Voice – Northwind" queue. Publish's compliance check resolves
 * requirements by queue without the campaign, so an earlier take's grid on a shared queue
 * would be evaluated instead of the live one. The old queue is archived (isActive=false).
 */
export async function rotateNorthwindQueue(): Promise<string> {
  const s = loadState();
  const admin = await adminClient(s);
  const oldId = s.queues['Voice – Northwind']!;
  const old = (list(await admin.get(SVC.forecasting, '/api/v1/queues')).find((q) => q.id === oldId) ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (old[k] === null || old[k] === undefined ? {} : { [k]: Number(old[k]) });
  const fresh = await admin.post(SVC.forecasting, '/api/v1/queues', {
    name: 'Voice – Northwind', channel: 'VOICE',
    ...pick('slaTargetSeconds'), ...pick('slaTargetPercent'), ...pick('ahtSeconds'), ...pick('shrinkagePercent'), timezone: 'UTC',
  }) as { id: string };
  await admin.post(SVC.workforce, '/api/v1/agents/bulk', { agentIds: s.northwindAgentIds, addQueueIds: [fresh.id], removeQueueIds: [oldId] });
  await attempt(() => admin.del(SVC.forecasting, `/api/v1/queues/${oldId}`));
  s.queues['Voice – Northwind'] = fresh.id;
  saveState(s);
  console.log(`rotated Voice – Northwind queue ${oldId} → ${fresh.id}`);
  return fresh.id;
}

/** Drop Northwind schedules so scene 05 can Create + Generate again. */
export async function clearNorthwindSchedules(): Promise<void> {
  const nw = await findNorthwind();
  if (!nw?.campaignId) return;
  const admin = await adminClient(loadState());
  for (const sch of list(await admin.get(SVC.scheduling, '/api/v1/schedules')).filter((x) => x.campaignId === nw.campaignId)) {
    if (sch.status === 'PUBLISHED') await attempt(() => admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/unpublish`, { reason: 'demo retake' }));
    await attempt(() => admin.del(SVC.scheduling, `/api/v1/schedules/${sch.id}`));
  }
}

if (process.argv[2] === 'rotate-queue') await rotateNorthwindQueue();
if (process.argv[2] === 'clear-schedules') await clearNorthwindSchedules();
if (process.argv[2] === 'reset') await resetNorthwind();
if (process.argv[2] === 'prepare') console.log(await prepareForGenerate());
if (process.argv[2] === 'find') console.log(await findNorthwind());
