// Joins out/scenes/sNN.mp4 in order into out/Kasuwa-investor-demo.mp4 with short fades
// between scenes and loudness-normalised narration (-16 LUFS, the usual target for online video).
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { OUT, mediaDuration, runFfmpeg } from './lib/env.js';

const ORDER = ['s00', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14'];
const FADE = 0.35;

const scenes = ORDER.map((id) => path.join(OUT, 'scenes', `${id}.mp4`)).filter((f) => {
  if (!existsSync(f)) console.warn(`missing ${path.basename(f)} — skipped`);
  return existsSync(f);
});

// Fade each scene in and out, so the concat reads as dissolves through the background.
const faded = scenes.map((src) => {
  const d = mediaDuration(src);
  const out = src.replace(/\.mp4$/, '.faded.mp4');
  runFfmpeg([
    '-i', src,
    '-vf', `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(d - FADE).toFixed(3)}:d=${FADE}`,
    '-af', `afade=t=in:st=0:d=0.15,afade=t=out:st=${(d - 0.2).toFixed(3)}:d=0.2`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out,
  ]);
  return out;
});

const list = path.join(OUT, 'scenes', 'concat.txt');
writeFileSync(list, faded.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
const joined = path.join(OUT, 'joined.mp4');
runFfmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

const final = path.join(OUT, 'Kasuwa-investor-demo.mp4');
runFfmpeg([
  '-i', joined, '-c:v', 'copy',
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-movflags', '+faststart', final,
]);
console.log(final, `${(mediaDuration(final) / 60).toFixed(2)} min`);
