import { N } from './narration.js';
import { speak } from './lib/tts.js';
const all = Object.entries(N).flatMap(([s, beats]) => Object.entries(beats).map(([b, t]) => ({ s, b, t: t as string })));
const chars = all.reduce((n, x) => n + x.t.length, 0);
console.log(`${all.length} beats, ${chars} characters`);
if (process.argv.includes('--count')) process.exit(0);
let total = 0; const per: Record<string, number> = {};
for (const x of all) { const c = await speak(x.t); total += c.seconds; per[x.s] = (per[x.s] ?? 0) + c.seconds; }
for (const [s, v] of Object.entries(per)) console.log(s, v.toFixed(1) + 's');
console.log('total narration', (total / 60).toFixed(2), 'min');
