import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Director } from '../lib/director.js';

import { N } from '../narration.js';

import { findNorthwind, resetNorthwind } from '../lib/northwind.js';

const GRID = 'C:/dev/freelance/wfm-demo-video/setup/northwind-staffing-grid.xlsx';

/** Import profile ids can't be reused or deleted, so each take gets the next version suffix. */
function nextProfileId(): string {
  const f = 'out/profile-take.txt';
  const n = (existsSync(f) ? Number(readFileSync(f, 'utf8')) : 1) + 1;
  writeFileSync(f, String(n));
  return `northwind-weekly-v${n}`;
}



const WS = 'meridian';

const ADMIN = 'admin@meridian.test';

const PW = 'SecurePass123!';



export async function s01() {

  const d = new Director('s01');

  const p = await d.open();

  await d.goto('/login');

  await p.evaluate(() => document.fonts.ready);

  await d.startRecording();

  await d.badge('01', 'Sign in');

  await d.say(N.s01.b1, async () => {

    await d.pause(600);

    await d.type(p.locator('input').nth(0), WS, { delay: 70 });

    await d.type(p.locator('input').nth(1), ADMIN, { delay: 40 });

  });

  await d.say(N.s01.b2, async () => {

    await d.callout('Every workspace isolated at the database level', 'Multi-tenant');

    await d.type(p.locator('input[type=password]'), PW, { delay: 50 });

    await d.click(p.getByRole('button', { name: 'Sign in' }));

    await p.waitForURL((u) => !u.pathname.startsWith('/login'));

    await p.waitForLoadState('networkidle');

  });

  await d.hideCallout();

  return d.finish();

}



const BRIGHTLINE_CAMPAIGN = '/clients/7c455bb6-6460-4c9e-8c4a-54c37c8f2aa3/campaigns/a26bab5f-d42b-4772-a95a-07608df2a6bf';



export async function s02() {

  await resetNorthwind();

  const d = new Director('s02');

  const p = await d.open();

  await d.login(WS, ADMIN, PW);

  await d.warm([BRIGHTLINE_CAMPAIGN, '/clients/7c455bb6-6460-4c9e-8c4a-54c37c8f2aa3'], '/clients');

  await d.startRecording();

  await d.badge('02', 'Clients & contracts');

  await d.say(N.s02.b1, async () => {

    await d.pause(400);

    await d.hover(p.getByText('Brightline Telecom'), 900);

    await d.pause(1100);

    await d.hover(p.getByText('Harbor Health'), 700);

    await d.pause(1000);

    await d.hover(p.getByText('Cobalt Retail'), 700);

  });

  await d.say(N.s02.b2, async () => {

    await d.click(p.getByRole('button', { name: 'Create client' }));

    const dlg = p.getByRole('dialog', { name: 'New client' });

    await d.type(dlg.getByRole('textbox').nth(0), 'Northwind Delivery', { delay: 35 });

    await d.type(dlg.getByRole('textbox').nth(1), 'NWD');

    await d.click(dlg.getByRole('button', { name: 'Create client' }));

    await p.waitForLoadState('networkidle');

    await d.click(p.getByRole('button', { name: 'New campaign' }));

    const cdlg = p.getByRole('dialog', { name: 'New campaign' });

    await d.type(cdlg.getByRole('textbox').nth(0), 'Voice Support', { delay: 35 });

    await d.click(cdlg.getByRole('button', { name: 'Create campaign' }));

    await p.waitForLoadState('networkidle');

    await d.click(p.getByText('Voice Support', { exact: true }));

    await p.waitForLoadState('networkidle');

  });

  const k = p.getByRole('dialog');

  const combos = k.getByRole('combobox');

  await d.say(N.s02.b3, async () => {

    await d.click(p.getByRole('tab', { name: 'Contract' }).or(p.getByText('Contract', { exact: true })).first());

    await d.click(p.getByRole('button', { name: 'New contract' }));

    const from = k.locator('input[type=date]').first();

    await d.click(from);

    await from.fill('2026-10-19');

    await d.choose(combos.nth(0), /15/);

    await d.choose(combos.nth(1), /UTC/);

    await d.hover(combos.nth(3));

    await d.pause(500);

    await d.type(k.locator('input[type=number]'), '30');

  });

  await d.say(N.s02.b4, async () => {

    await d.click(combos.nth(4), { settle: 700 });

    for (const name of [/Service level|SLA/i, /Headcount/i, /Interval compliance/i, /Ticket workload/i]) {

      await d.hover(p.getByRole('option', { name }).first(), 500);

      await d.pause(900);

    }

  });

  await d.say(N.s02.b5, async () => {

    await d.click(p.getByRole('option', { name: /Interval compliance/i }).first());

    await d.pause(600);

    await d.click(k.getByRole('button', { name: /Create contract/ }));

    await p.waitForLoadState('networkidle');

    await d.pause(800);

    const sp = p.getByText('Sources & policies').locator('xpath=ancestor::section[1]');

    await sp.scrollIntoViewIfNeeded();

    await d.hover(sp, 800);

    await d.spotlight(sp);

    await d.callout('Requirement source + compliance policies, set by the contract', 'Interval compliance');

  });

  await d.say(N.s02.b6, async () => {

    await d.spotlight(null);

    await d.hideCallout();

    await d.click(p.getByRole('tab', { name: 'Overview' }).or(p.getByText('Overview', { exact: true })).first());

    await p.waitForLoadState('networkidle');

    await d.pause(500);

    await d.callout('4 operating models · one scheduling engine', 'The contract drives everything');

    await d.snap('overview');

  }, { after: 900 });

  await d.hideCallout();

  return d.finish();

}



export async function s03() {
  const nw = await findNorthwind();
  if (!nw?.campaignId) throw new Error('record s02 first');
  const route = `/clients/${nw.clientId}/campaigns/${nw.campaignId}`;
  const d = new Director('s03');
  const p = await d.open();
  await d.login(WS, ADMIN, PW);
  await d.warm(['/clients', route], route);
  await d.startRecording();
  await d.badge('03', 'Client demand');
  await d.say(N.s03.b1, async () => {
    await d.click(p.getByRole('tab', { name: 'Queues' }).or(p.getByText('Queues', { exact: true })).first());
    await d.choose(p.getByRole('combobox').filter({ hasText: 'Select queue' }), /Northwind/);
    await d.click(p.getByRole('button', { name: /Link queue/ }).first());
    await p.waitForLoadState('networkidle');
  });
  await d.say(N.s03.b2, async () => {
    await d.click(p.getByRole('tab', { name: 'Demand' }).or(p.getByText('Demand', { exact: true })).first());
    await p.waitForLoadState('networkidle');
    await d.type(p.getByPlaceholder('e.g. Voice W35 requirements'), 'Northwind weekly staffing grid', { delay: 30 });
    const [chooser] = await Promise.all([p.waitForEvent('filechooser'), d.click(p.getByText('Choose an .xlsx file'))]);
    await chooser.setFiles(GRID);
    await d.pause(600);
    await d.click(p.getByRole('button', { name: 'Continue' }));
    await p.waitForLoadState('networkidle');
    const author = p.getByRole('button', { name: 'Author new mapping' });
    if (await author.isVisible().catch(() => false)) await d.click(author);
  });
  await d.say(N.s03.b3, async () => {
    await d.type(p.getByPlaceholder('e.g. client-rq-long-v1'), nextProfileId(), { delay: 25 });
    await d.type(p.getByPlaceholder('Human-readable label'), 'Northwind weekly grid', { delay: 25 });
    await d.hover(p.getByRole('combobox').filter({ hasText: 'Long / tidy' }));
    await d.pause(400);
    await d.scroll(320, 700);
    await d.hover(p.getByRole('combobox').filter({ hasText: 'ISO' }).first());
    await d.pause(300);
    await d.hover(p.getByRole('combobox').filter({ hasText: 'As supplied' }));
    await d.pause(400);
    await d.click(p.getByRole('combobox').filter({ hasText: 'Select queues' }));
    await d.click(p.getByRole('option', { name: /Northwind/ }).first());
    await p.keyboard.press('Escape');
    await d.click(p.getByRole('button', { name: 'Save profile and stage import' }));
    await p.waitForLoadState('networkidle');
    await p.getByRole('button', { name: 'Commit grid' }).waitFor();
    await p.getByRole('heading', { name: 'Review before committing' }).evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await d.pause(700);
  });
  await d.say(N.s03.b4, async () => {
    const review = p.getByRole('complementary').filter({ has: p.getByRole('heading', { name: 'Import review' }) });
    await d.hover(review, 700);
    await d.spotlight(review);
    await d.callout('1,260 intervals staged · 0 rejected · diffed against the last version', 'Import review');
    await d.pause(2600);
    await d.spotlight(null);
    await d.hover(p.getByText('Peak', { exact: false }).first(), 700);
    await d.callout('Plan between 5 and 11 agents for this demand', 'Staffing estimate');
    await d.pause(1500);
    await d.hover(p.getByRole('table').first(), 600);
  });
  await d.say(N.s03.b5, async () => {
    await d.hideCallout();
    await d.click(p.getByRole('button', { name: 'Commit grid' }));
    await p.waitForLoadState('networkidle');
    await p.getByText('Version committed').first().scrollIntoViewIfNeeded().catch(() => undefined);
    await d.callout('Every client grid is versioned and traceable', 'Committed');
    await d.snap('committed');
  }, { after: 800 });
  await d.hideCallout();
  return d.finish();
}

const all = { s01, s02, s03 } as const;

for (const k of process.argv.slice(2)) console.log(await all[k as keyof typeof all]());

