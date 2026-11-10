import { Director } from '../lib/director.js';
import { N } from '../narration.js';
import { removeRehearsalEvents, resetPortal } from '../lib/cleanup.js';

const WS = 'meridian';
const ADMIN = 'admin@meridian.test';
const PW = 'SecurePass123!';

async function adminScene(id: string, start: string, warm: string[] = []): Promise<Director> {
  const d = new Director(id);
  await d.open();
  await d.login(WS, ADMIN, PW);
  await d.warm([...warm, start], start);
  return d;
}

export async function s04() {
  await removeRehearsalEvents();
  const d = await adminScene('s04', '/forecasting');
  const p = d.page;
  const forecastDone = async () => {
    await p.getByText('Running forecast').waitFor({ state: 'detached', timeout: 120_000 }).catch(() => undefined);
    await p.waitForLoadState('networkidle');
  };
  await d.choose(p.getByRole('combobox').nth(1), /Voice – Brightline/);
  await p.waitForLoadState('networkidle');
  await d.startRecording();
  await d.badge('04', 'Forecasting');
  await d.say(N.s04.b1, async () => {
    await d.hover(p.getByText('Customer Care').first(), 700);
    await d.pause(500);
    await d.hover(p.getByText('Authoritative requirement source', { exact: false }), 800);
    await d.callout('SLA contract → Kasuwa forecasts the demand', 'Requirement source');
  });
  await d.say(N.s04.b2, async () => {
    await d.hideCallout();
    await d.click(p.getByRole('button', { name: 'Run Forecast' }));
    await forecastDone();
    await d.clearToasts();
    await d.moveTo(420, 330, 900);
    await d.moveTo(900, 300, 1500);
  });
  await d.say(N.s04.b3, async () => {
    await d.hover(p.getByText('Total Required', { exact: false }).first(), 700);
    await d.pause(500);
    await d.hover(p.getByText('Overall Gap', { exact: false }).first(), 600);
    await d.pause(500);
    await d.hover(p.getByText('Proj. SLA', { exact: false }).first(), 600);
    await d.callout('Erlang C for voice · concurrency for chat · workload model for email', 'Channel-aware staffing');
    await d.hover(p.getByText('07:00–08:00', { exact: false }).or(p.getByText('07:00-08:00')).first(), 600);
    await d.scroll(330, 1200);
  });
  await d.say(N.s04.b4, async () => {
    await d.hideCallout();
    await d.click(p.getByText('Add Event', { exact: false }).last());
    const ev = p.getByRole('dialog');
    await d.type(ev.getByRole('textbox').first(), 'Holiday promotion', { delay: 35 });
    await d.click(ev.getByText('Pick a date').first());
    await d.click(p.locator('.ui-calendar').getByRole('button', { name: /October 28/ }));
    await d.click(ev.getByRole('button', { name: 'End date' }));
    await d.click(p.locator('.ui-calendar').getByRole('button', { name: /October 30/ }));
    await d.type(ev.getByRole('spinbutton').or(ev.locator('input[type=number]')).first(), '1.5');
    await d.click(ev.getByRole('button', { name: /Add event/ }));
    await forecastDone();
    await d.clearToasts();
    await d.hover(p.getByText('Override interval volume'), 800);
    await d.callout('Overrides need a reason · every one is audited', 'Planner control');
  });
  await d.say(N.s04.b5, async () => {
    await d.hideCallout();
    await d.click(p.getByText('Model Accuracy').first());
    await p.waitForLoadState('networkidle');
    await d.hover(p.getByText('8.', { exact: false }).filter({ hasText: '%' }).first(), 700);
    await d.callout('Forecast error tracked on every run', 'Model accuracy');
    await d.snap('accuracy');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function s06() {
  const d = await adminScene('s06', '/compliance');
  const p = d.page;
  await d.choose(p.getByRole('combobox').first(), /Voice Support/);
  await p.locator('input[type=date]').nth(0).fill('2026-10-26');
  await p.locator('input[type=date]').nth(1).fill('2026-11-01');
  await p.waitForLoadState('networkidle');
  await d.pause(1200);
  await d.startRecording();
  await d.badge('06', 'Compliance');
  await d.say(N.s06.b1, async () => {
    await d.hover(p.getByRole('combobox').filter({ hasText: 'Northwind weekly staffing grid' }), 800);
    await d.pause(400);
    await d.hover(p.getByRole('combobox').filter({ hasText: /^v\d/ }), 700);
    await d.callout('Every client grid stored, versioned and viewable as of any date', 'Requirement grids');
    await d.hover(p.getByRole('grid').first(), 900);
    await d.scroll(500, 1600);
  });
  await d.say(N.s06.b2, async () => {
    await d.hideCallout();
    await p.getByText('Policy attainment').evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await d.pause(900);
    await d.hover(p.getByText('Policy attainment'), 800);
    await d.callout('Policies follow the contract, not a fixed layout', 'Policy attainment');
  });
  await d.say(N.s06.b3, async () => {
    const nm = p.getByText('Not measurable').first();
    await d.hover(nm, 800);
    await d.callout('Show the true number, or show nothing', 'Honest by design');
    await d.snap('end-state');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function s07() {
  const d = await adminScene('s07', '/people');
  const p = d.page;
  await d.startRecording();
  await d.badge('07', 'People');
  await d.say(N.s07.b1, async () => {
    await d.hover(p.getByText('Funmilayo Adeyemi').first(), 800);
    await d.moveTo(900, 330, 900);
    await d.click(p.getByRole('button', { name: 'Kanban' }));
    await d.pause(900);
    await d.click(p.getByRole('button', { name: 'Map' }));
    await d.pause(900);
    await d.click(p.getByRole('button', { name: 'Table' }));
  });
  await d.say(N.s07.b2, async () => {
    await d.click(p.getByRole('button', { name: /^Team/ }).first());
    await d.pause(500);
    await d.snap('team-filter');
    await d.click(p.getByRole('option', { name: /Brightline Care A/ }).or(p.getByText('Brightline Care A', { exact: true })).first());
    await p.keyboard.press('Escape');
    await p.waitForLoadState('networkidle');
    const boxes = p.locator('tbody input[type=checkbox]');
    for (let i = 0; i < 3; i++) await d.click(boxes.nth(i), { ms: 350, settle: 200 });
    await d.pause(600);
    await d.snap('bulk');
    await d.callout('Assign teams, queues, skills and sites in bulk', 'Bulk actions');
    await d.pause(1200);
    await d.click(p.getByRole('button', { name: /Import \/ export/ }));
    await d.pause(900);
    await d.snap('import-menu');
    await p.keyboard.press('Escape');
  });
  await d.say(N.s07.b3, async () => {
    await d.hideCallout();
    await d.click(p.getByText('Clear all').first());
    await p.waitForLoadState('networkidle');
    await d.hover(p.getByText('Funmilayo Adeyemi').first(), 700);
    await d.hover(p.getByRole('row').filter({ hasText: 'Funmilayo Adeyemi' }).getByText('Chat', { exact: false }).first(), 800);
    await d.callout('One agent, several campaigns, never double-booked', 'Cross-campaign');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function s09() {
  const d = await adminScene('s09', '/activity');
  const p = d.page;
  const day = p.locator('input[type=date]').first();
  await day.fill('2026-10-22');
  await p.waitForLoadState('networkidle');
  await d.pause(1200);
  await d.startRecording();
  await d.badge('09', 'Desktop activity');
  await d.say(N.s09.b1, async () => {
    await d.hover(p.getByText('Telemetry coverage', { exact: false }).first(), 800);
    await d.pause(400);
    await d.hover(p.getByText('How scheduled time is explained', { exact: false }).first(), 800);
    await d.callout('Desktop evidence, laid against the published schedule', 'Activity');
  });
  await d.say(N.s09.b2, async () => {
    await d.hideCallout();
    await d.click(p.getByText('Amara Nwosu').first());
    await p.waitForLoadState('networkidle');
    await d.pause(1200);
    await d.snap('drawer');
    await d.moveTo(900, 420, 1400);
    await d.moveTo(1200, 560, 1200);
  });
  await d.say(N.s09.b3, async () => {
    await p.keyboard.press('Escape');
    await d.pause(400);
    await d.click(p.getByText('Devices', { exact: true }).first());
    await p.waitForLoadState('networkidle');
    await d.pause(600);
    await d.snap('devices');
    await d.hover(p.getByText(/Enroll/).first(), 800);
    await d.moveTo(800, 520, 1200);
  });
  await d.say(N.s09.b4, async () => {
    await d.click(p.getByText('Settings', { exact: true }).first());
    await p.waitForLoadState('networkidle');
    await d.pause(500);
    const sens = p.getByText(/sensitive/i).first();
    await sens.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })).catch(() => undefined);
    await d.pause(900);
    await d.hover(sens, 800);
    await d.callout('No keystrokes · purpose-bound capture · every access logged', 'Privacy by design');
    await d.snap('settings');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function s10() {
  if (!process.env.REHEARSE) await resetPortal();
  const d = new Director('s10');
  const p = await d.open();
  await d.login(WS, 'amara.nwosu@meridian.test', PW);
  await d.warm(['/portal'], '/portal');
  await p.getByText('My Schedule').first().waitFor();
  await d.pause(800);
  await d.startRecording();
  await d.badge('10', 'Agent portal');
  await d.say(N.s10.b1, async () => {
    await d.moveTo(500, 260, 900);
    await d.moveTo(900, 420, 1200);
    await d.snap('schedule');
  });
  await d.say(N.s10.b2, async () => {
    const claim = p.getByRole('button', { name: /Claim VTO/ }).first();
    await claim.scrollIntoViewIfNeeded().catch(() => undefined);
    await d.hover(claim, 800);
    await d.callout('Voluntary time off, claimed in one click', 'VTO');
    if (!d.rehearse) await d.click(claim);
    await p.waitForLoadState('networkidle');
    await d.pause(600);
    await d.snap('claimed');
  });
  await d.say(N.s10.b3, async () => {
    await d.hideCallout();
    await d.click(p.getByText('Time Off', { exact: true }).first());
    await p.waitForLoadState('networkidle');
    await d.hover(p.getByText('Your Leave Balance').first(), 700);
    await d.moveTo(520, 190, 900);
    await d.hover(p.getByText('Recent Requests', { exact: false }).first(), 800);
  });
  await d.say(N.s10.b4, async () => {
    await d.click(p.getByText('Swaps', { exact: true }).first());
    await p.waitForLoadState('networkidle');
    await d.pause(500);
    await d.snap('swaps');
    const accept = p.getByRole('button', { name: /Accept/ }).first();
    if (await accept.isVisible().catch(() => false)) {
      if (d.rehearse) await d.hover(accept);
      else await d.click(accept);
    }
    await d.pause(700);
    await d.clearToasts();
    await d.click(p.getByText('My Schedule', { exact: true }).first());
    await p.waitForLoadState('networkidle');
    await d.pause(500);
    await d.hover(p.getByText('Upcoming', { exact: false }).first(), 900);
    await d.callout('Agents who control their schedule stay longer', 'Retention');
    await d.snap('back-to-schedule');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function s11() {
  const d = await adminScene('s11', '/vendors');
  const p = d.page;
  await d.startRecording();
  await d.badge('11', 'Vendors & BPO');
  await d.say(N.s11.b1, async () => {
    await d.hover(p.getByText('Atlas BPO').first(), 700);
    await d.hover(p.getByText('Headcount — weekly trend', { exact: false }).first(), 800);
    await d.moveTo(560, 470, 1400);
    await d.hover(p.getByText('below committed headcount', { exact: false }).first(), 700);
    await d.callout('Committed vs scheduled vs actual, per vendor, per week', 'BPO partners');
  });
  await d.say(N.s11.b2, async () => {
    await d.click(p.getByRole('tab', { name: 'Headcount' }).or(p.getByText('Headcount', { exact: true })).first());
    await p.waitForLoadState('networkidle');
    await d.callout('Vendor logins see only their own data', 'Scoped access');
    await d.snap('headcount');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function s12() {
  const d = await adminScene('s12', '/admin');
  const p = d.page;
  await d.startRecording();
  await d.badge('12', 'Administration');
  await d.say(N.s12.b1, async () => {
    await d.click(p.getByText('Users & Roles', { exact: true }));
    await p.waitForLoadState('networkidle');
    const matrix = p.getByText('Role Permissions Matrix', { exact: false }).first();
    await matrix.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' })).catch(() => undefined);
    await d.pause(800);
    await d.hover(matrix, 700);
    await d.snap('roles');
  });
  await d.say(N.s12.b2, async () => {
    await d.click(p.getByText('Business Rules', { exact: true }));
    await p.waitForLoadState('networkidle');
    await d.pause(500);
    await d.moveTo(800, 300, 1200);
    await d.moveTo(800, 520, 1000);
    await d.snap('rules');
  });
  await d.say(N.s12.b3, async () => {
    await d.click(p.getByText('Notifications', { exact: true }));
    await p.waitForLoadState('networkidle');
    await d.pause(900);
    await d.click(p.getByText('Audit Log', { exact: true }));
    await p.waitForLoadState('networkidle');
    await d.moveTo(900, 400, 1200);
    await d.callout('Every change, captured and exportable', 'Audit log');
    await d.snap('audit');
  }, { after: 900 });
  await d.hideCallout();
  return d.finish();
}

export async function explore() {
  const d = await adminScene('explore', '/compliance', ['/people', '/activity', '/vendors', '/admin']);
  const p = d.page;
  await d.startRecording();
  await d.choose(p.getByRole('combobox').first(), /Voice Support/);
  await p.waitForLoadState('networkidle');
  await d.pause(1500);
  await p.locator('input[type=date]').nth(0).fill('2026-10-26');
  await p.locator('input[type=date]').nth(1).fill('2026-11-01');
  await p.waitForLoadState('networkidle');
  await d.pause(1500);
  await d.snap('compliance');
  await p.getByText('Policy attainment').scrollIntoViewIfNeeded();
  await d.pause(800);
  await d.snap('compliance-2');
  await d.spaNav('/people');
  await d.click(p.getByRole('button', { name: 'Kanban' }));
  await d.snap('kanban');
  await d.click(p.getByRole('button', { name: 'Map' }));
  await d.snap('map');
  await d.click(p.getByRole('button', { name: 'Table' }));
  await d.click(p.getByRole('button', { name: /Import \/ export/ }));
  await d.snap('import-menu');
  await p.keyboard.press('Escape');
  await d.spaNav('/activity');
  await d.click(p.getByText('Amara Nwosu').first());
  await d.pause(1500);
  await d.snap('activity-drawer');
  await p.keyboard.press('Escape');
  await d.click(p.getByText('Devices', { exact: true }).first());
  await d.snap('devices');
  await d.click(p.getByText('Settings', { exact: true }).first());
  await d.snap('settings');
  await d.scroll(700);
  await d.snap('settings-2');
  await d.spaNav('/admin');
  await d.snap('admin');
  return d.finish();
}

export async function exploreAgent() {
  const d = new Director('explore-agent');
  const p = await d.open();
  await d.login(WS, 'amara.nwosu@meridian.test', PW);
  await d.startRecording();
  await d.snap('portal');
  for (const t of ['Time Off', 'Swaps', 'Performance', 'My activity']) {
    await d.click(p.getByText(t, { exact: true }).first());
    await p.waitForLoadState('networkidle');
    await d.pause(800);
    await d.snap(t);
  }
  return d.finish();
}

const all = { s04, s06, s07, s09, s10, s11, s12, explore, exploreAgent } as const;
for (const k of process.argv.slice(2)) console.log(await all[k as keyof typeof all]());
