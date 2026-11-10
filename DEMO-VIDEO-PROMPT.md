# Prompt: generate a narrated product demo video

Copy everything below the line into Claude Code, run from the root of the app you want to demo.
Fill in the `<…>` placeholders first.

---

Make me a finished, narrated demo video of this app for <audience, e.g. investors / customers>.
I don't want to record anything myself: you drive the app, record it, voice it and edit it into one MP4.

**About the video**
- Length: about <8–12> minutes, 1080p MP4.
- Goal: show what the app does, page by page, and why it is different from <competitors>.
- Tone: lead each scene with the business problem it solves, then show the feature.
- Voice: ElevenLabs, <voice name or "a deep American narrator">. My API key is `ELEVENLABS_API_KEY` in <path to .env>.

**Reuse the toolkit I already have**
`C:\dev\freelance\wfm-demo-video` holds a working pipeline from a previous video. Copy it into a new
sibling folder (`<app>-demo-video`, outside this repo) and adapt it rather than starting over:
- `lib/director.ts`: Playwright + Chrome screencast recorder, scene director, `say(text, actions)`
  narration sync, `REHEARSE=1` mode with screenshots, warm-up of lazy routes, toast handling.
- `lib/overlay.js`: visible cursor, click ripples, callout lower-thirds, auto-hiding scene badge.
- `lib/tts.ts`: ElevenLabs with a per-line cache. `assemble.ts`: fades + loudness normalisation.
- `slides/`: animated HTML slides for the intro, comparison and close. Restyle them to this app's brand.
Do not copy its `setup/`, `scenes/` or `narration.ts`; those are specific to the old app.

**How to work**
1. Map the app first (use a subagent): every route and page, what each one does, which roles see what,
   how to seed demo data, and which features are stubbed, disabled or empty. Stubbed features stay out
   of the video, or appear only as roadmap. Never show something as working when it isn't.
2. Create a separate demo workspace/tenant with realistic, fictional data. Never modify or delete my
   existing data. Never show real client names, files or emails. Use the app's own APIs to seed and
   reset it, not direct database deletes.
3. Write the narration as short beats per scene, built around one story that runs through the app
   rather than a tour of menus. Show me the script and the character count before generating audio.
   Check my ElevenLabs plan's limits (output format, monthly characters) and keep re-voicing to a minimum.
4. Script each scene against the real UI. Rehearse it with `REHEARSE=1` and look at the screenshots
   before recording. Pages must load before the camera rolls, and nothing may cover a click target.
   Rehearsals must skip one-shot actions (claiming, accepting, publishing), or reset them afterwards.
5. Check that the data looks believable on camera: numbers that look wrong (e.g. everything
   over- or under-staffed, empty charts, error banners) undermine the demo. Fix the data, not the app.
6. If a feature depends on the real clock (live dashboards, "today" views), record it at a time of day
   when it looks busy, and tell me when that is.
7. After recording, build a contact sheet of every scene and review it frame by frame. Re-take
   anything with a glitch, a flash of a loading or error state, or an unfinished feature in view.
8. Competitor comparisons: only claims you can source; no prices unless they are confirmed.
9. Assemble the final MP4 (fades between scenes, -16 LUFS narration) and give me its path.

**Report back with**
- The video path, its length and what each scene shows.
- What you left out and why.
- Bugs you found in my app along the way, with file:line where you can, but don't fix them
  unless I ask.
- Anything still pending (e.g. a scene that must be recorded at a certain time) and how to re-run any
  single scene.
