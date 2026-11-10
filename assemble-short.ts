// A ~4-minute cut built from the recorded scenes: keeps chosen narration beats (from each scene's
// cues.json) and drops the rest, so no re-recording or new narration is needed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { OUT, mediaDuration, runFfmpeg } from './lib/env.js';

/** Scene → runs of consecutive beats to keep, as [firstBeat, lastBeat] (1-based). */
const CUT: Array<[string, Array<[number, number]>]> = [
  ['s00', [[1, 4]]],
  ['s02', [[4, 5]]],
  ['s03', [[4, 5]]],
  ['s04', [[1, 1], [3, 3]]],
  ['s05', [[1, 2], [5, 6]]],
  ['s09', [[1, 2]]],
  ['s10', [[1, 2]]],
  ['s13', [[1, 3]]],
  ['s14', [[2, 2]]],
];
const FADE = 0.25;

const dir = path.join(OUT, 'short');
mkdirSync(dir, { recursive: true });
const parts: string[] = [];

for (const [scene, runs] of CUT) {
  const src = path.join(OUT, 'scenes', `${scene}.mp4`);
  const { duration, cues } = JSON.parse(readFileSync(path.join(OUT, 'scenes', `${scene}.cues.json`), 'utf8')) as {
    duration: number; cues: Array<{ at: number }>;
  };
  const starts = [...cues.map((c) => c.at), duration];
  runs.forEach(([a, b], i) => {
    const from = Math.max(0, starts[a - 1]! - 0.1);
    const to = Math.min(duration, starts[b]!);
    const len = to - from;
    const out = path.join(dir, `${scene}-${i}.mp4`);
    runFfmpeg([
      '-ss', from.toFixed(3), '-i', src, '-t', len.toFixed(3),
      '-vf', `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(len - FADE).toFixed(3)}:d=${FADE}`,
      '-af', `afade=t=in:st=0:d=0.08,afade=t=out:st=${(len - 0.15).toFixed(3)}:d=0.15`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out,
    ]);
    parts.push(out);
  });
}

const list = path.join(dir, 'concat.txt');
writeFileSync(list, parts.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
const joined = path.join(dir, 'joined.mp4');
runFfmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
const final = path.join(OUT, 'Kasuwa-investor-demo-short.mp4');
runFfmpeg(['-i', joined, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k',
  '-ar', '48000', '-movflags', '+faststart', final]);
console.log(final, `${(mediaDuration(final) / 60).toFixed(2)} min`);
