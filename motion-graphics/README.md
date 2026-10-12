# MoneyMngmt — Motion Graphics

Animated videos for the MoneyMngmt website, rendered fully offline on macOS
(Swift + CoreGraphics + AVFoundation — no After Effects, no ffmpeg).

| File | What it is |
|---|---|
| `MoneyMngmt_Explainer.mp4` | **Explainer video** — 1920×1080, 30 fps, **70.5 s**. Voiceover narration + background music + sound effects, area-zoom punch-ins, lower-thirds, a features list and animated wipes. Built from real screenshots of the running site. |
| `MoneyMngmt_Website_Tour.mp4` | Silent website tour — 1920×1080, 30 fps, 24.0 s. Same real screenshots, plain scrolling tour (no audio). |
| `MoneyMngmt_Promo.mp4` | Stylised promo — 1920×1080, 30 fps, 20.0 s. Hand-drawn recreation of the dashboard in code. |

Branding comes from the site (`tailwind.config.ts`): navy palette, income green
`#16a34a`, expense red `#dc2626`, amber `#f59e0b`, white cards on slate. Amounts
use `₹` (INR).

---

## 1. Explainer video (`MoneyMngmt_Explainer.mp4`)

An ~70 s product explainer that narrates the project over the real UI.

**What's in it**
- **Voiceover** — 9 narration lines (macOS TTS "Rishi", en_IN), one per scene.
- **Background music** — a mellow 88 BPM synth bed (pad + bass + kick + hats),
  auto-ducked under the voice.
- **Sound effects** — whoosh on every transition, pops on feature reveals, a
  riser into the outro and a chime on the end card.
- **Area zoom** — the camera pushes into the KPIs, charts, table, averages,
  budget meter and connection card (with a soft vignette).
- **B-roll punch-ins** — quick zooms on the live charts.
- **Lower-thirds** — a caption bar on every page scene.
- **Features list** — six animated feature rows with coloured icons.
- **Wipes** — diagonal navy transitions between scenes.
- Progress bar along the bottom.

| Time | Scene | Narration |
|---|---|---|
| 0–6 s | Intro (logo, title) | "Meet MoneyMngmt…" |
| 6–17 s | Overview (KPI zoom) | "…everything at a glance." |
| 17–25 s | Live charts (punch-ins) | "Interactive charts show…" |
| 25–34 s | Transactions (table) | "…searchable, filterable, editable." |
| 34–42 s | Reports | "Reports break your money down…" |
| 42–48 s | Budgets | "Set monthly budgets…" |
| 48–56 s | Settings | "…stays in sync with Google Sheets." |
| 56–64 s | Features list | "A full finance toolkit…" |
| 64–70.5 s | Outro | "Track, budget, and save." |

**Assets:** `poster-explainer/` (stills), `narration/` (the 9 voice clips +
`script.txt`), `website-shots/` (the source page screenshots).

### Re-rendering (3 steps)

```bash
cd motion-graphics
# 1. video (silent)   -> video_only.mp4
swiftc -O advanced.swift -o advanced && ./advanced video_only.mp4
# 2. audio mix        -> master.caf  (narration + music + sfx)
swiftc -O audio.swift -o audio && ./audio master.caf
# 3. mux              -> MoneyMngmt_Explainer.mp4
swiftc -O mux.swift -o mux && ./mux video_only.mp4 master.caf MoneyMngmt_Explainer.mp4
```

Edit the **narration** in `narration/script.txt`, regenerate a clip with
`say -v Rishi -r 172 -o narration/2_overview.aiff "…"`, re-run steps 1–3.
Change the **music / SFX** gains and the **ducking** in `audio.swift`
(music `0.16`, narration `0.95`); change **scene timings, zooms and captions**
in the `S` array at the top of `advanced.swift`.

### Capturing fresh screenshots

The page images in `website-shots/` came from the real app:

```bash
npm run dev            # http://localhost:3000
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-first-run \
  --user-data-dir=/tmp/mm-chrome --remote-debugging-port=9222 about:blank &
node capture-website.js \
  "overview:/|transactions:/transactions|reports:/reports|budgets:/budgets|settings:/settings" \
  ./shots 7000
```

> The screenshots contain **live data from your Google Spreadsheet**. Re-run the
> capture (with a valid `.env.local`) to refresh them.

---

## 2. Website tour (`MoneyMngmt_Website_Tour.mp4`)

A silent 24 s tour of the real UI: intro → Overview → Transactions → Reports →
Budgets → Settings → outro, in a browser frame. The renderer keeps the app's
`fixed` sidebar and `sticky` top bar still while the content scrolls, so it
looks like a screen recording.

Re-render: `swiftc -O tour.swift -o tour && ./tour MoneyMngmt_Website_Tour.mp4`.
Stills in `poster-tour/`.

---

## 3. Stylised promo (`MoneyMngmt_Promo.mp4`)

A 20 s hand-built motion graphic (cards counting up, income-vs-expense bars,
category donut, savings trend, budget meter). Re-render:
`swiftc -O promo.swift -o promo && ./promo MoneyMngmt_Promo.mp4`. Stills in `poster/`.

`MoneyMngmt_AE_Build.jsx` rebuilds this promo as an editable After Effects comp
(File ▸ Scripts ▸ Run Script File…).

> ⚠️ **After Effects on this machine** can't write files — scripts run but every
> file comes out **empty** (even deferred writes via `app.scheduleTask`), so no
> `.aep` was generated. The install also looks unusual:
> `/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app` (a bundle
> nested in a plain folder). The `.jsx` lets you rebuild it elsewhere.
