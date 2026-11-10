// Scene 08 — Real-Time. Adherence is judged against the real clock, so this scene must be
// recorded while UTC time is inside shift hours (07:00–22:00); statuses are pushed right before.
import { Director } from '../lib/director.js';
import { N } from '../narration.js';
import { pushLiveStatuses } from '../setup/setup-demo.js';

const WS = 'meridian';
const ADMIN = 'admin@meridian.test';
const PW = 'SecurePass123!';

export async function s08() {
  const hour = new Date().getUTCHours();
  if (hour < 7 || hour >= 22) throw new Error(`UTC hour ${hour}: record s08 between 07:00 and 22:00 UTC`);
  await pushLiveStatuses();
  const d = new Director('s08');
  const p = await d.open();
  await d.login(WS, ADMIN, PW);
  await d.warm(['/realtime'], '/realtime');
  await p.getByText('Agent Status Board', { exact: false }).first().waitFor();
  await d.moveTo(1000, 60, 300); // park the cursor on the top bar, away from agent-card hover menus
  await d.pause(1500);
  await d.startRecording();
  await d.badge('08', 'Real-time');
  await d.say(N.s08.b1, async () => {
    await d.hover(p.getByText('Agents On Queue', { exact: false }).first(), 800);
    await d.pause(400);
    await d.hover(p.getByText('Schedule Adherence', { exact: false }).first(), 700);
    await d.callout('Scheduled vs actual, agent by agent, live', 'Adherence');
    await d.snap('kpis');
  });
  await d.say(N.s08.b2, async () => {
    await d.hideCallout();
    const qm = p.getByText('Queue Metrics', { exact: false }).first();
    await d.hover(qm, 700);
    await d.moveTo(700, 330, 1200);
    await d.moveTo(1150, 330, 1000);
    await d.snap('queues');
  });
  await d.say(N.s08.b3, async () => {
    const out = p.getByRole('button', { name: /Out of Adh/ }).or(p.getByText(/Out of Adh/)).first();
    await out.scrollIntoViewIfNeeded().catch(() => undefined);
    await d.click(out);
    await d.pause(700);
    await d.moveTo(600, 600, 1000);
    await d.callout('Breaches raised after a grace period, the right people alerted', 'Out of adherence');
    await d.moveTo(1000, 60, 600);
    await d.click(p.getByRole('button', { name: /Intraday Tools/ }));
    await d.pause(500);
    await d.click(p.getByRole('tab', { name: /Record Exception/ }).or(p.getByRole('button', { name: /Record Exception/ })).or(p.getByText('Record Exception', { exact: true })).last());
    await d.pause(600);
    await d.moveTo(800, 470, 900);
    await d.snap('intraday');
  }, { after: 900 });
  await p.keyboard.press('Escape');
  await d.hideCallout();
  return d.finish();
}

const all = { s08 } as const;
for (const k of process.argv.slice(2)) console.log(await all[k as keyof typeof all]());
