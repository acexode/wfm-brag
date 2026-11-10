// Remove artifacts that earlier takes of a scene left behind (demo tenant only, via the app API).
import { SVC, adminClient, loadState } from '../setup/setup-demo.js';

const list = (x: unknown): any[] => (Array.isArray(x) ? x : ((x as any)?.items ?? (x as any)?.data ?? []));

/** Special events named "Holiday promotion" are created on camera in scene 04. */
export async function removeRehearsalEvents(): Promise<number> {
  const s = loadState();
  const admin = await adminClient(s);
  let n = 0;
  for (const qid of [s.queues['Voice – Brightline'], s.queues['Chat – Brightline']]) {
    const events = list(await admin.get(SVC.forecasting, `/api/v1/forecast/special-events?queueId=${qid}`));
    for (const e of events.filter((x) => x.name === 'Holiday promotion')) {
      await admin.del(SVC.forecasting, `/api/v1/forecast/special-events/${e.id}`);
      n++;
    }
  }
  console.log(`removed ${n} rehearsal special event(s)`);
  return n;
}

if (process.argv[2] === 'events') await removeRehearsalEvents();

import { SVC as S2, agentByName, client, login, phasePortal } from '../setup/setup-demo.js';

/**
 * Scene 10 claims a VTO offer and accepts a swap on camera — both one-shot. Before a take:
 * open a fresh VTO on Amara's next shift day that has no offer yet, then let the setup's
 * portal step create a new pending swap from Chinedu (it is idempotent for everything else).
 */
export async function resetPortal(): Promise<void> {
  const s = loadState();
  const admin = await adminClient(s);
  const amara = agentByName(s, 'Amara');
  const amaraClient = client(await login(amara.email), s.tenant.id);
  const claimable = list(await amaraClient.get(S2.portal, '/api/v1/portal/vto-offers'));
  if (claimable.length === 0) {
    const sup = client(await login('supervisor@meridian.test'), s.tenant.id);
    const offers = list(await admin.get(S2.scheduling, '/api/v1/vto-offers'));
    const offered = new Set(offers.map((o) => String(o.date).slice(0, 10)));
    const sched = list(await admin.get(S2.scheduling, '/api/v1/schedules')).filter((x) => x.status === 'PUBLISHED');
    let slot: any;
    for (const sc of sched) {
      const slots = list(await admin.get(S2.scheduling, `/api/v1/schedules/${sc.id}/shift-slots`));
      slot = slots
        .filter((x) => x.agentId === amara.id && x.slotType === 'WORK' && String(x.date).slice(0, 10) > '2026-10-26' && !offered.has(String(x.date).slice(0, 10)))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
      if (slot) break;
    }
    if (!slot) throw new Error('no future shift without a VTO offer for Amara');
    const date = String(slot.date).slice(0, 10);
    const endH = Number(String(slot.endTime).slice(0, 2));
    await sup.post(S2.scheduling, '/api/v1/vto-offers', {
      offerType: 'VTO', queueId: slot.queueId, date: `${date}T00:00:00.000Z`,
      startTime: `${String(endH - 2).padStart(2, '0')}:00`, endTime: `${String(endH).padStart(2, '0')}:00`,
      maxSlots: 3, expiresAt: `${date}T${String(endH - 3).padStart(2, '0')}:00:00.000Z`,
    });
    console.log(`new VTO offer for Amara on ${date}`);
  }
  await phasePortal(s);
}

if (process.argv[2] === 'portal') await resetPortal();
