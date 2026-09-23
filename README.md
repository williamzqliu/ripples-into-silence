# Ripples into Silence

An interactive scrollytelling piece about migrant deaths and disappearances recorded
within 50 kilometres of Lampedusa between 2014 and 2024.

As the reader scrolls, each recorded incident travels toward the island and ends as a
ripple. Ripple size carries the number of people dead or missing; radial position
carries the incident's recorded distance from the island. The sequence opens slowly,
then accelerates, so the density of the later years is something the reader watches
accumulate rather than reads off a chart.

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

The page is six scenes, one on screen at a time, crossfading as the reader scrolls.
Each has one section in `index.html`, one stylesheet and one script:

| Nav | Section | Style | Script |
| --- | --- | --- | --- |
| Intro | `#ripple-bg-wrapper` (`#cover`, `#intro`) | `css/opening.css` | `js/scenes/opening/` |
| The Record | `#sequence` | `css/record.css` | `js/scenes/record/` |
| Why Lampedusa | `#context` | `css/context.css` | `js/scenes/context.js` |
| 11 Years | `#eleven-years` | `css/eleven-years.css` | `js/scenes/elevenYears.js` |
| In 2024 | `#year-2024` | `css/in-2024.css` | `js/scenes/in2024.js` |
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
  data/incidents.js           loads and scales the CSV, shared by the record and 11 Years
  scenes/
    opening/                  the intro reveal and the ripple field behind it
    record/                   the animated sequence, one module per job
      index.js                  when it starts
      controller.js             runs it in order: island, circle, radius, UI, paths
      drawPaths.js              release schedule: slow first, then accelerating
      renderPath.js             one incident: travel, ripple, label, tooltip
      onScene.js                holds it while under half of it is on screen
      …                         the frame, circle, cross, radius line, year bar, counts
    context.js                the three pinned steps and their diagrams
    elevenYears.js            a disc a year, and any year opened large
    in2024.js                 one dot per person, and the 206
    epilogue.js               the last screen's lines and the island
assets/
  fonts/                      EB Garamond, variable woff2, with its licence
  diagrams/                   the three Why Lampedusa diagrams, from Figma
  images/                     the epilogue's relief of the island
  favicon.ico
data/                         the filtered incident extract
```

Timings and sizes that belong to one scene are constants at the top of that scene's
script, with what they do and why they are what they are. The record's are all in
`js/config.js`.

## Data

`data/lampedusa_nearby_incidents.csv` is a filtered extract of the
[Missing Migrants Project](https://missingmigrants.iom.int/downloads) record published by the
International Organization for Migration, cut to incidents within 50 km of Lampedusa.

| | |
| --- | --- |
| Incidents | 94 |
| Dead and missing | 703 |
| Years | 2014 – 2024 |
| Distance range | 0.0 – 50.0 km |

The heaviest years are 2023 (39 incidents) and 2024 (19 incidents, 206 dead and
missing). `Distance_to_Lampedusa_km` was computed from each incident's coordinates and
kept as a column, because it ended up driving the layout rather than only the filter.

The one figure not from that record is the 45,997 people who reached Lampedusa in 2024,
from the Italian Red Cross as reported by InfoMigrants on 13 January 2025
(`ARRIVALS_2024` in `js/config.js`). Both sources are credited at the foot of the page.

The script that produced the extract is not in this repository.

## Pacing the record

In `js/config.js`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `FIRST_DELAY` | 3000 ms | before the first incident |
| `INITIAL_INCIDENTS` | 3 | how many are released slowly |
| `INITIAL_DELAY` | 6000 ms | gap between those first few |
| `MIN_GAP` | 400 ms | floor on the gap once it has accelerated |
| `MAX_CURRENT` | 5 | paths allowed in flight at once |
| `LAUNCHING_SPEED` | 0.04 | path progress per frame at 60Hz |

The delays count time with the record on screen, not wall time: scroll away and the
sequence holds where it is.

`renderPath.js` advances a path by elapsed milliseconds, not by frames, so the speed
does not depend on the display: a fixed step per `requestAnimationFrame` took about
417 ms on a 60Hz screen and 208 ms on a 120Hz one. `LAUNCHING_SPEED` is still the
per-frame figure the piece was tuned with, read against the 60Hz it was tuned on.
Steps are capped at 50 ms so a backgrounded tab does not jump a path forward when it
returns.

## Credits

Design and development by Zhuoqi Liu. Faculty guidance from Todd Linkner.
Data from the Missing Migrants Project, International Organization for Migration:
<https://missingmigrants.iom.int/downloads>
