import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'out');
export const AUDIO = path.join(ROOT, 'audio');
export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
export const WIDTH = 1920; // output video
export const HEIGHT = 1080;
export const VIEW_W = 1600; // CSS viewport, rendered at 1.2x so UI text reads on video
export const VIEW_H = 900;
export const SCALE = WIDTH / VIEW_W;

let ffmpegPath: string | undefined;
export function ffmpeg(): string {
  if (ffmpegPath) return ffmpegPath;
  ffmpegPath = execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'])
    .toString()
    .trim();
  return ffmpegPath;
}

export function runFfmpeg(args: string[]): void {
  execFileSync(ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

/** Media duration in seconds, parsed from ffmpeg's banner (no ffprobe in the bundled build). */
export function mediaDuration(file: string): number {
  let text = '';
  try {
    execFileSync(ffmpeg(), ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (err) {
    text = String((err as { stderr?: Buffer }).stderr ?? '');
  }
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(text);
  if (!m) throw new Error(`No duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** ELEVENLABS_API_KEY from the environment, else from the WFM repo's root .env. */
export function elevenLabsKey(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const envFile = 'C:/dev/freelance/WFM/.env';
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = /^\s*ELEVENLABS_API_KEY\s*[=:]\s*"?([^"\s]+)"?\s*$/.exec(line);
      if (m) return m[1]!;
    }
  }
  throw new Error('ELEVENLABS_API_KEY not found');
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
