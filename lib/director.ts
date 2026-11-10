import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';

import { writeFile } from 'node:fs/promises';

import path from 'node:path';

import { chromium, type Browser, type BrowserContext, type CDPSession, type Locator, type Page } from 'playwright';

import { APP_URL, HEIGHT, OUT, ROOT, SCALE, VIEW_H, VIEW_W, WIDTH, runFfmpeg, sleep } from './env.js';

import { speak } from './tts.js';



const OVERLAY = readFileSync(path.join(ROOT, 'lib', 'overlay.js'), 'utf8');



interface Cue {

  file: string;

  at: number; // seconds from the first video frame

}



const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);



/**

 * Drives one scene: a browser page, a frame-accurate screencast and the narration cues.

 * `say(text, actions)` starts a narration clip, runs the on-screen actions alongside it,

 * then holds until the clip has finished, so picture and voice stay in step.

 */

export class Director {

  browser!: Browser;

  context!: BrowserContext;

  page!: Page;

  private cdp?: CDPSession;

  private frameDir = '';

  private frames: Array<{ file: string; t: number }> = [];

  private pending: Promise<unknown>[] = [];

  private t0 = 0;

  private cues: Cue[] = [];

  private mouse = { x: VIEW_W / 2, y: VIEW_H / 2 };

  private recording = false;



  constructor(readonly sceneId: string) {}



  async open(): Promise<Page> {

    this.browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });

    this.context = await this.browser.newContext({

      viewport: { width: VIEW_W, height: VIEW_H },

      deviceScaleFactor: SCALE,

      locale: 'en-US',

      timezoneId: 'UTC',

      colorScheme: 'light',

    });

    await this.context.addInitScript(OVERLAY);

    this.page = await this.context.newPage();

    this.page.setDefaultTimeout(20_000);

    return this.page;

  }



  async goto(route: string): Promise<void> {

    await this.page.goto(route.startsWith('http') || route.startsWith('file:') ? route : `${APP_URL}${route}`, {

      waitUntil: 'networkidle',

    });

  }



  /** Client-side navigation (no reload), the way a sidebar click moves around the SPA. */

  async spaNav(route: string): Promise<void> {

    await this.page.evaluate((r) => {

      window.history.pushState({}, '', r);

      window.dispatchEvent(new PopStateEvent('popstate'));

    }, route);

    await this.page.waitForLoadState('networkidle');

    await this.page.waitForFunction(() => !document.body.innerText.includes('Loading…') && !document.body.innerText.includes('Loading...'), null, { timeout: 15_000 }).catch(() => undefined);

  }



  /** Visit routes off camera so their lazy chunks are loaded, then settle on `end`. */

  async warm(routes: string[], end: string): Promise<void> {

    for (const r of routes) await this.spaNav(r);

    await this.spaNav(end);

    await sleep(600);

  }



  /** Log in through the real login form (off camera unless recording has started). */

  async login(workspace: string, email: string, password: string, opts: { slow?: boolean } = {}): Promise<void> {

    await this.goto('/login');

    const fields = this.page.locator('input');

    const ws = this.page.getByLabel(/workspace/i).or(fields.nth(0)).first();

    const em = this.page.getByLabel(/email/i).or(fields.nth(1)).first();

    const pw = this.page.getByLabel(/password/i).or(this.page.locator('input[type=password]')).first();

    if (opts.slow) {

      await this.type(ws, workspace);

      await this.type(em, email);

      await this.type(pw, password);

      await this.click(this.page.getByRole('button', { name: /sign in|log in/i }));

    } else {

      await ws.fill(workspace);

      await em.fill(email);

      await pw.fill(password);

      await this.page.getByRole('button', { name: /sign in|log in/i }).click();

    }

    await this.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });

    await this.page.waitForLoadState('networkidle');

  }



  // ---------- recording ----------



  readonly rehearse = Boolean(process.env.REHEARSE);

  private snapN = 0;



  /** Rehearsal checkpoint: screenshot + aria tree under out/rehearse/<scene>/. No-op when recording. */

  async snap(label: string): Promise<void> {

    if (!this.rehearse) return;

    const dir = path.join(OUT, 'rehearse', this.sceneId);

    mkdirSync(dir, { recursive: true });

    const name = `${String(++this.snapN).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '_')}`;

    await this.page.screenshot({ path: path.join(dir, `${name}.png`), scale: 'css' });

    writeFileSync(path.join(dir, `${name}.aria.txt`), await this.page.locator('body').ariaSnapshot().catch(() => ''));

    console.log(`  snap ${name}`);

  }



  async startRecording(): Promise<void> {

    if (this.rehearse) {

      rmSync(path.join(OUT, 'rehearse', this.sceneId), { recursive: true, force: true });

      return;

    }

    this.frameDir = path.join(OUT, 'frames', this.sceneId);

    rmSync(this.frameDir, { recursive: true, force: true });

    mkdirSync(this.frameDir, { recursive: true });

    this.frames = [];

    this.cues = [];

    this.cdp = await this.context.newCDPSession(this.page);

    let n = 0;

    this.cdp.on('Page.screencastFrame', (ev: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {

      const file = path.join(this.frameDir, `f${String(++n).padStart(6, '0')}.jpg`);

      const t = ev.metadata.timestamp ?? Date.now() / 1000;

      this.frames.push({ file, t });

      this.pending.push(writeFile(file, Buffer.from(ev.data, 'base64')));

      void this.cdp?.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => undefined);

    });

    await this.cdp.send('Page.startScreencast', {

      format: 'jpeg',

      quality: 94,

      maxWidth: WIDTH,

      maxHeight: HEIGHT,

      everyNthFrame: 1,

    });

    // Nudge a repaint so the first frame arrives immediately.

    await this.page.mouse.move(this.mouse.x, this.mouse.y);

    for (let i = 0; i < 50 && this.frames.length === 0; i++) await sleep(50);

    this.t0 = this.frames[0]?.t ?? Date.now() / 1000;

    this.recording = true;

  }



  /** Stop, encode frames + narration into out/scenes/<id>.mp4, close the browser. */

  async finish(tailMs = 600): Promise<string> {

    if (this.rehearse) {

      await this.snap('end');

      await this.browser.close();

      return `rehearsed ${this.sceneId}`;

    }

    await sleep(tailMs);

    const end = Date.now() / 1000;

    this.recording = false;

    await this.cdp?.send('Page.stopScreencast').catch(() => undefined);

    await Promise.all(this.pending);

    await this.browser.close();



    const frames = this.frames.filter((f) => f.t >= this.t0);

    const list: string[] = [];

    frames.forEach((f, i) => {

      const next = frames[i + 1]?.t ?? end;

      list.push(`file '${f.file.replace(/\\/g, '/')}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);

    });

    list.push(`file '${frames[frames.length - 1]!.file.replace(/\\/g, '/')}'`);

    const listFile = path.join(this.frameDir, 'frames.txt');

    writeFileSync(listFile, list.join('\n'));



    const scenesDir = path.join(OUT, 'scenes');

    mkdirSync(scenesDir, { recursive: true });

    const silent = path.join(scenesDir, `${this.sceneId}.video.mp4`);

    runFfmpeg([

      '-f', 'concat', '-safe', '0', '-i', listFile,

      '-vf', `fps=30,scale=${WIDTH}:${HEIGHT}:flags=lanczos:out_range=tv,format=yuv420p`,

      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', silent,

    ]);

    const duration = end - this.t0;

    const outFile = path.join(scenesDir, `${this.sceneId}.mp4`);

    if (this.cues.length === 0) {

      runFfmpeg(['-i', silent, '-f', 'lavfi', '-t', duration.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo',

        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', outFile]);

    } else {

      const inputs = this.cues.flatMap((c) => ['-i', c.file]);

      const delays = this.cues

        .map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`)

        .join(';');

      const mix = `${delays};${this.cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${this.cues.length}:normalize=0:dropout_transition=0,apad[aout]`;

      runFfmpeg(['-i', silent, ...inputs, '-filter_complex', mix, '-map', '0:v', '-map', '[aout]',

        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', duration.toFixed(3), outFile]);

    }

    writeFileSync(path.join(scenesDir, `${this.sceneId}.cues.json`), JSON.stringify({ duration, cues: this.cues }, null, 2));

    return outFile;

  }



  // ---------- narration ----------



  /** Speak `text` while running `actions`; returns once both the clip and the actions are done. */

  async say(text: string, actions?: () => Promise<void>, opts: { after?: number } = {}): Promise<void> {

    if (this.rehearse) {

      console.log(`  say: ${text.slice(0, 60)}…`);

      if (actions) await actions();

      return;

    }

    const clip = await speak(text);

    const start = Date.now() / 1000;

    if (this.recording) this.cues.push({ file: clip.file, at: start - this.t0 });

    if (actions) await actions();

    const remaining = start + clip.seconds - Date.now() / 1000;

    if (remaining > 0) await sleep(remaining * 1000);

    await sleep(opts.after ?? 350);

  }



  // ---------- on-screen helpers ----------



  async moveTo(x: number, y: number, ms = 650): Promise<void> {

    if (this.rehearse) ms = 30;

    const from = { ...this.mouse };

    const steps = Math.max(8, Math.round(ms / 16));

    for (let i = 1; i <= steps; i++) {

      const k = ease(i / steps);

      await this.page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);

      await sleep(ms / steps);

    }

    this.mouse = { x, y };

  }



  private async center(target: Locator): Promise<{ x: number; y: number }> {

    await target.waitFor({ state: 'visible' });

    await target.scrollIntoViewIfNeeded();

    const box = await target.boundingBox();

    if (!box) throw new Error(`No bounding box for ${target.toString()}`);

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  }



  async hover(target: Locator, ms = 650): Promise<void> {

    const c = await this.center(target);

    await this.moveTo(c.x, c.y, ms);

  }



  /** Wait until nothing (a toast, a closing drawer) sits on top of the target's centre. */

  private async waitUnobstructed(target: Locator): Promise<void> {

    for (let i = 0; i < 40; i++) {

      const c = await this.center(target);

      const clear = await target.evaluate((el, pt) => {

        const top = document.elementFromPoint(pt.x, pt.y);

        return !!top && (el === top || el.contains(top) || top.contains(el) || top.closest('#__demo-root') !== null);

      }, c);

      if (clear) return;

      await sleep(200);

    }

  }



  async click(target: Locator, opts: { ms?: number; settle?: number } = {}): Promise<void> {

    await this.waitUnobstructed(target);

    await this.hover(target, opts.ms);

    await sleep(140);

    await this.page.mouse.down();

    await sleep(70);

    await this.page.mouse.up();

    await sleep(opts.settle ?? 450);

  }



  async type(target: Locator, text: string, opts: { delay?: number; clear?: boolean } = {}): Promise<void> {

    await this.click(target, { settle: 150 });

    if (opts.clear !== false) {

      await this.page.keyboard.press('Control+A');

      await this.page.keyboard.press('Delete');

    }

    await this.page.keyboard.type(text, { delay: opts.delay ?? 45 });

    await sleep(200);

  }



  async select(target: Locator, value: string | { label: string }): Promise<void> {

    await this.hover(target);

    await sleep(150);

    await target.selectOption(value);

    await sleep(400);

  }



  /** Open a custom combobox and pick the option whose text matches. */

  async choose(combobox: Locator, option: string | RegExp, opts: { dwell?: number } = {}): Promise<void> {

    await this.click(combobox, { settle: opts.dwell ?? 500 });

    const opt = this.page.getByRole('option', { name: option }).first();

    await this.click(opt, { ms: 450, settle: 400 });

  }



  /** Smooth wheel scroll at the current mouse position. */

  async scroll(dy: number, ms = 900): Promise<void> {

    const steps = Math.max(6, Math.round(ms / 30));

    for (let i = 0; i < steps; i++) {

      await this.page.mouse.wheel(0, dy / steps);

      await sleep(ms / steps);

    }

    await sleep(250);

  }



  async callout(text: string, kicker?: string): Promise<void> {

    await this.page.evaluate(([t, k]) => window.__demo?.callout(t!, k), [text, kicker] as const);

  }



  async hideCallout(): Promise<void> {

    await this.page.evaluate(() => window.__demo?.hideCallout());

  }



  async badge(num: string, label: string): Promise<void> {

    await this.page.evaluate(([n, l]) => window.__demo?.badge(n!, l!), [num, label] as const);

  }



  async spotlight(target: Locator | null): Promise<void> {

    const rect = target ? await target.boundingBox() : null;

    await this.page.evaluate((r) => window.__demo?.spotlight(r), rect);

  }



  /** Close any app toasts (they stack bottom-right and can cover what the scene shows next). */
  async clearToasts(): Promise<void> {
    await this.page.evaluate(() => document.querySelectorAll<HTMLButtonElement>('.toast button').forEach((b) => b.click()));
    await sleep(250);
  }

  async pause(ms: number): Promise<void> {

    await sleep(this.rehearse ? Math.min(ms, 300) : ms);

  }

}



declare global {

  interface Window {

    __demo?: {

      callout(text: string, kicker?: string): void;

      hideCallout(): void;

      badge(num: string, label: string): void;

      spotlight(rect: { x: number; y: number; width: number; height: number } | null): void;

    };

  }

}



export { APP_URL };

