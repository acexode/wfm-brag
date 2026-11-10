// Usage: tsx explore.ts <workspace> <email> <route> [route...]  → out/explore/<name>.png + .aria.txt
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { APP_URL, VIEW_W, VIEW_H, SCALE } from './lib/env.js';
const [ws, email, ...routes] = process.argv.slice(2);
mkdirSync('out/explore', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, deviceScaleFactor: SCALE / 2 });
const p = await ctx.newPage();
await p.goto(`${APP_URL}/login`);
const inputs = p.locator('input');
await inputs.nth(0).fill(ws!); await inputs.nth(1).fill(email!); await p.locator('input[type=password]').fill(process.env.PW ?? 'SecurePass123!');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForURL((u) => !u.pathname.startsWith('/login'));
for (const r of routes) {
  const [route, ...clicks] = r.split('>>');
  await p.goto(`${APP_URL}${route}`, { waitUntil: 'networkidle' });
  for (const c of clicks) { await p.getByText(c, { exact: false }).first().click(); await p.waitForTimeout(1200); }
  await p.waitForTimeout(800);
  const name = r.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
  await p.screenshot({ path: `out/explore/${name}.png` });
  writeFileSync(`out/explore/${name}.aria.txt`, await p.locator('body').ariaSnapshot());
  console.log(name);
}
await b.close();
