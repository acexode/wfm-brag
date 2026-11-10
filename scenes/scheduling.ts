import { Director } from '../lib/director.js';
import { N } from '../narration.js';
import { clearNorthwindSchedules, findNorthwind, prepareForGenerate } from '../lib/northwind.js';

const WS = 'meridian';
const ADMIN = 'admin@meridian.test';
const PW = 'SecurePass123!';

export async function s05() {
  const nw = await findNorthwind();
  if (!nw?.campaignId) throw new Error('record s02–s03 first');
  await prepareForGenerate();
  await clearNorthwindSchedules();
  const d = new Director('s05');
  const p = await d.open();
  await d.login(WS, ADMIN, PW);
  await d.warm(['/scheduling'], '/scheduling');
  await d.choose(p.getByRole('combobox').first(), /Voice Support/);
  await p.waitForLoadState('networkidle');
  await d.pause(800);
  await d.startRecording();
  await d.badge('05', 'Scheduling');
  await d.say(N.s05.b1, async () => {
    await d.hover(p.getByRole('combobox').first(), 700);
    await d.click(p.locator('button:has(svg.lucide-chevron-right)').first());
    await p.waitForLoadState('networkidle');
    await d.click(p.getByRole('button', { name: 'Create schedule' }));
    await p.waitForLoadState('networkidle');
    await d.clearToasts();
    await d.hover(p.getByRole('button', { name: 'Generate' }), 700);
  });
  await d.say(N.s05.b2, async () => {
    await d.click(p.getByRole('button', { name: 'Generate' }));
    await p.getByText('07:00–15:30').first().waitFor();
    await d.callout('A full week, generated in seconds', 'Generate');
    await d.pause(2500);
    await d.clearToasts();
    await d.hover(p.getByText('Tyler Johnson').first(), 700);
    await d.moveTo(1000, 420, 1600);
    await d.hover(p.getByText('42.5 / 45h').first(), 900);
  });
  await d.say(N.s05.b3, async () => {
    await d.hideCallout();
    const heat = p.getByText('Coverage heatmap', { exact: false }).first().locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"panel")][1]');
    await heat.scrollIntoViewIfNeeded().catch(() => undefined);
    await d.hover(p.getByText('Coverage heatmap', { exact: false }).first(), 700);
    await d.moveTo(700, 820, 1400);
    await d.hover(p.getByText('Queue coverage', { exact: false }).first(), 900);
  });
  await d.say(N.s05.b4, async () => {
    await d.click(p.getByRole('button', { name: 'Day', exact: true }));
    await p.waitForLoadState('networkidle');
    await d.pause(600);
    await d.hover(p.getByText('Coverage', { exact: true }).first(), 600);
    await d.moveTo(900, 230, 1500);
    await d.moveTo(1000, 460, 900);
  });
  await d.say(N.s05.b5, async () => {
    await d.click(p.getByRole('button', { name: 'Week', exact: true }));
    await p.waitForLoadState('networkidle');
    await d.click(p.getByText('07:00–15:30').nth(5));
    await d.click(p.getByRole('button', { name: 'Move' }).nth(1));
    const t = p.locator('input[type=time]').first();
    await d.click(t);
    await p.keyboard.type('0800', { delay: 120 });
    await d.click(p.getByRole('button', { name: 'Move', exact: true }).last());
    await d.pause(300);
    await d.callout('Labor rules and coverage checked on every edit', 'Live validation');
    await d.hover(p.getByText('Moving it here means', { exact: false }), 800);
    await d.pause(2200);
  });
  await d.say(N.s05.b6, async () => {
    await d.hideCallout();
    await p.keyboard.press('Escape');
    await d.pause(300);
    if (await p.getByText('Moving it here means', { exact: false }).isVisible().catch(() => false)) {
      await d.click(p.getByRole('button', { name: 'Cancel' }).last());
    }
    await d.click(p.getByRole('button', { name: 'Publish', exact: true }));
    const modal = p.getByRole('dialog');
    await modal.getByText('Failing intervals', { exact: false }).waitFor();
    await d.hover(modal.getByText('interval_match').first(), 800);
    await d.callout('Checked against the client contract before anything goes out', 'Compliance check');
    await d.pause(1500);
    await d.scroll(900, 1400);
    await d.click(modal.getByRole('checkbox'));
    await d.click(modal.getByRole('button', { name: 'Publish to Agents' }));
    await p.waitForLoadState('networkidle');
    await d.pause(600);
    await d.hideCallout();
    await d.snap('published');
  }, { after: 900 });
  return d.finish();
}

const all = { s05 } as const;
for (const k of process.argv.slice(2)) console.log(await all[k as keyof typeof all]());
