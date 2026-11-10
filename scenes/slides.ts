import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Director } from '../lib/director.js';
import { ROOT } from '../lib/env.js';
import { N } from '../narration.js';

type Step = (id: string, rows?: [number, number]) => void;

async function slideScene(id: string, file: string, run: (d: Director, step: (s: string, rows?: [number, number]) => Promise<void>) => Promise<void>) {
  const d = new Director(id);
  await d.open();
  await d.goto(pathToFileURL(path.join(ROOT, 'slides', file)).href);
  await d.page.addStyleTag({ content: '#__demo-cursor{display:none!important}' });
  await d.page.evaluate(() => document.fonts.ready);
  await d.startRecording();
  const step = (s: string, rows?: [number, number]) =>
    d.page.evaluate(([a, r]) => (window as unknown as { step: Step }).step(a as string, r as [number, number] | undefined), [s, rows] as const);
  await run(d, step);
  return d.finish(900);
}

export const s00 = () => slideScene('s00', 'intro.html', async (d, step) => {
  await d.pause(500);
  await d.say(N.s00.b1, () => step('s1'), { after: 700 });
  await d.say(N.s00.b2, () => step('s2'), { after: 600 });
  await d.say(N.s00.b3, () => step('s3'), { after: 600 });
  await d.say(N.s00.b4, () => step('s4'), { after: 900 });
});

export const s13 = () => slideScene('s13', 'compare.html', async (d, step) => {
  await d.say(N.s13.b1, () => step('s1', [0, 2]), { after: 500 });
  await d.say(N.s13.b2, () => step('s1', [2, 4]), { after: 500 });
  await d.say(N.s13.b3, () => step('s1', [4, 6]), { after: 1200 });
});

export const s14 = () => slideScene('s14', 'close.html', async (d, step) => {
  await d.say(N.s14.b1, () => step('s1'), { after: 600 });
  await d.say(N.s14.b2, () => step('s2'), { after: 2500 });
});

const which = process.argv.slice(2);
const all = { s00, s13, s14 } as const;
for (const k of which.length ? which : Object.keys(all)) console.log(await all[k as keyof typeof all]());
