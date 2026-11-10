import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AUDIO, elevenLabsKey, mediaDuration } from './env.js';

/** ElevenLabs premade voices. Brian = deep American narrator, Jessica = warm American female. */
export const VOICES = {
  brian: 'nPczCjzI2devNBz1zQrb',
  jessica: 'cgSgspJ2msm6clMCkdW9',
} as const;

export const VOICE = VOICES[(process.env.VOICE as keyof typeof VOICES) ?? 'brian'] ?? VOICES.brian;
const MODEL = 'eleven_multilingual_v2';

export interface Clip {
  file: string;
  seconds: number;
}

/** Synthesise `text` once; later calls with the same text and voice reuse the cached mp3. */
export async function speak(text: string): Promise<Clip> {
  const hash = createHash('sha1').update(`${VOICE}|${MODEL}|${text}`).digest('hex').slice(0, 16);
  const dir = path.join(AUDIO, 'cache');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${hash}.mp3`);
  if (!existsSync(file)) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenLabsKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return { file, seconds: mediaDuration(file) };
}
