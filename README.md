# Ripples into Silence

An interactive scrollytelling piece about migrant deaths and disappearances recorded
within 50 kilometres of Lampedusa between 2014 and 2025.

Each record travels toward the island and ends as a ripple. Ripple size carries the
number of people dead or missing; radial position carries the record's distance from a
reference point on the island. The records go out one after another in date order, a
slot each on a year bar that fills at a steady rate, so the crowded years take longest
to pass. Twelve annual discs then compare the years, and their marks come apart into
the 833 people behind them, grouped by the cause reported for each record.

Built for *Mapping Movement: Exploring Migration through Data*.

## Running it

No build step, no bundler, no framework. The page uses ES modules, so it has to be
served over HTTP rather than opened from the filesystem:

```bash
python -m http.server 8099
```

Then open <http://localhost:8099>. D3 v7 is loaded from a CDN and Bebas Neue from
Google Fonts; everything else is in the repository.

What is on `main` is what is published, at
<https://williamzqliu.com/ripples-into-silence/>, exactly as it is in the repository.
That is why every path in the page is relative, and why nothing that the page does not
load should be committed: it would be published too.

The piece is made for a desktop browser. Under 1024 by 640 a notice covers the page
(`.minsize`, in `css/base.css`), so nothing needs to lay out below that size.

## The scenes

The page is five scenes, one on screen at a time, crossfading as the reader scrolls.
Each has one section in `index.html`, one stylesheet and one script:

| Nav | Section | Style | Script |
| --- | --- | --- | --- |
| Intro | `#ripple-bg-wrapper` (`#cover`, `#intro`) | `css/opening.css` | `js/scenes/opening/` |
| The Record | `#sequence` | `css/record.css` | `js/scenes/record/` |
| Why Lampedusa | `#context` | `css/context.css` | `js/scenes/context.js` |
| 12 Years | `#eleven-years` | `css/eleven-years.css`, `css/in-2024.css` | `js/scenes/elevenYears.js`, `js/scenes/in2024.js` |
| Epilogue | `#epilogue` | `css/epilogue.css` | `js/scenes/epilogue.js` |

What the scenes share lives in `css/base.css`, `css/nav.css` and `js/core/`:

- **The crossfade** (`js/core/scenes.js`). A scene fades in as its top rises from 65%
  to 25% of the screen, scrubbed by the scroll, while the one before fades out. The
  scene that leads has no class; the others carry `.scene--away`, and a `scenechange`
  event goes out on `window` when the lead changes. Anything that plays once should
  wait for its scene to lead.
- **The float-in** (`js/core/reveal.js`). Give an element `.fade-step` and it rises
  into place as it comes up the screen, once its scene leads.
- **The nav** (`js/core/nav.js`). It shows itself, lights the section being read, and
  jumps: a glide to a near section, a quick cut to a far one, landing where each is
  read from.
- **Reduced motion** (`js/core/motion.js`), read once at load.

`js/main.js` only starts all of this, in page order. The stylesheets are linked in
cascade order: base, nav, then the scenes as they come.

## Layout

```
index.html                  markup for every scene
css/
  base.css                    tokens, font, reset, shared pieces, the small-window notice
  nav.css
  opening.css … epilogue.css  one per scene
js/
  main.js                     entry point
  config.js                   the record's tunables: geometry, pacing, ripples, labels
  core/                       scenes.js, reveal.js, nav.js, motion.js
  data/
    incidents.js              loads and scales the CSV, shared by the record and 12 Years
    people.js                 one entry per person, and the cause groups
    tooltip.js                the hover panel shared by every mark
  scenes/
    opening/                  the intro reveal and the ripple field behind it
    record/                   the animated sequence, one module per job
      index.js                  when it starts
      controller.js             runs it in order: island, circle, radius, UI, paths
      drawPaths.js              the schedule: the eased-in legend, then a slot per record
      renderPath.js             one record: travel, ripple, label, tooltip
      onScene.js                holds it while under half of it is on screen
      …                         the frame, circle, cross, radius line, year bar, counts
    context.js                the three pinned steps and their diagrams
    elevenYears.js            a disc a year (twelve), and any year opened large
    in2024.js                 the discs' marks become 833 people, by way of the island,
                              grouped by cause
    epilogue.js               the last screen's lines and the island
assets/
  fonts/                      EB Garamond, variable woff2, with its licence
  diagrams/                   the three Why Lampedusa diagrams, from Figma
  images/                     the epilogue's relief of the island
  favicon.ico
data/                         the source snapshot, the sample, its summary and METHOD.md
scripts/build_data.py         rebuilds the sample and summary from the snapshot
tests/data.cjs                checks totals, order, groups and record identity
```

Timings and sizes that belong to one scene are constants at the top of that scene's
script, with what they do and why they are what they are. The record's are all in
`js/config.js`.

## Data

`data/source_snapshot.csv` is the Missing Migrants Project record
(International Organization for Migration) as supplied in September 2026.
`python scripts/build_data.py` rebuilds `data/lampedusa_nearby_incidents.csv` and
`data/summary.json` from it; `node tests/data.cjs` checks the result. `data/METHOD.md`
has the selection rule, what the fields can and cannot say, and the known conflicts
between coordinates and location descriptions.

| | |
| --- | --- |
| Records (Main IDs) | 95 |
| Dead and missing | 833 (199 dead, 634 missing) |
| Years | 2014 – 2025, no 2026 events |
| Selection | supplied coordinates within 50 km of 35.5086, 12.5929 |

The heaviest years are 2024 (211 dead and missing, 17 records) and 2023 (188, 35
records). A Main ID is a record, not a boat: 19 of the 95 combine two or three
incident IDs.

## Pacing the record

The schedule is in `js/scenes/record/drawPaths.js`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `PLAY_MS` | 76000 ms | the whole bar, 2014 to the end of 2025 |
| `OPENING` | 5 | records that go out slowly, one at a time |
| `LEGEND` | 5 | of those, the ones that carry their distance and count |
| `OPENING_PX_PER_MS` | 0.06 to 0.22 | their speed on screen, easing in |
| `OPENING_GAPS` | 4400 to 1600 ms | the least time between their bursts |

Each opening record waits for everything the one before it did, its ripple and its
count, to finish. After them every record takes one even slot, and a year never gets
less of the bar than its label needs. Each path is sent early by its own travel time,
so it bursts as the fill reaches its slot, and a year's label lights as its first
record bursts. The clock counts time with the record on screen, not wall time:
scroll away and the sequence holds where it is.

`renderPath.js` advances a path by elapsed milliseconds, not by frames, so the speed
does not depend on the display. `LAUNCHING_SPEED` in `js/config.js` is the per-frame
figure the piece was tuned with, read against the 60Hz it was tuned on. Steps are
capped so a backgrounded tab does not jump a path forward when it returns.

## Credits

Design and development by Zhuoqi Liu. Faculty guidance from Todd Linkner.
Data from the Missing Migrants Project, International Organization for Migration:
<https://missingmigrants.iom.int/downloads>
