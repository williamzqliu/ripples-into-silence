# Ripples into Silence

An interactive scrollytelling piece about migrant deaths and disappearances recorded
within 50 kilometres of Lampedusa between 2014 and 2024.

As the reader scrolls, each recorded incident travels toward the island and ends as a
ripple. Ripple size carries the number of people dead or missing; radial position
carries the incident's recorded distance from the island. The sequence opens slowly,
then accelerates, so the density of the later years is something the reader watches
accumulate rather than reads off a chart.

Built for *Mapping Movement: Exploring Migration through Data*.

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

The script that produced this extract is not in this repository.

## Running it

No build step, no bundler, no framework. The page uses ES modules, so it has to be
served over HTTP rather than opened from the filesystem:

```bash
python -m http.server 8099
```

Then open <http://localhost:8099>. D3 is loaded from a CDN; the fonts are self-hosted.

## Layout

```
index.html                  markup for every scene
style.css                   all styling
js/config.js                every tunable constant: geometry, pacing, ripple timing
js/main.js                  scroll handling, scene entry, the eleven-year chart section
js/scene-intro/             the animated sequence, one module per job
  controller.js               runs the opening in order: island, radius, UI, paths
  dataProcessing.js           loads the CSV, scales, angular buckets
  drawPaths.js                release schedule: slow first, then accelerating
  renderPath.js               one incident: travel, ripple, tooltip
  updateStats.js              running incident and death counts
  deathSurvivalChart.js       the eleven-year chart
  ...                         background, cross marker, radius line, island reveal
assets/                     SVG scrollytelling frames and the favicon
data/                       the filtered incident extract
fonts/                      EB Garamond and Staatliches
```

### Pacing

All of it lives in `js/config.js`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `FIRST_DELAY` | 3000 ms | before the first incident |
| `INITIAL_INCIDENTS` | 3 | how many are released slowly |
| `INITIAL_DELAY` | 6000 ms | gap between those first few |
| `MIN_GAP` | 400 ms | floor on the gap once it has accelerated |
| `MAX_CURRENT` | 5 | paths allowed in flight at once |
| `LAUNCHING_SPEED` | 0.04 | path progress per frame at 60Hz |

### Path animation and refresh rate

`renderPath.js` advances a path by elapsed milliseconds. It previously advanced by a
fixed step on every `requestAnimationFrame` callback, which tied the speed to the
display: the travel phase took about 417 ms on a 60Hz screen and about 208 ms on a
120Hz one. `LAUNCHING_SPEED` is still the per-frame figure the piece was tuned with,
now read against the 60Hz it was tuned on, so the tuning is unchanged and the result no
longer depends on the monitor. Steps are capped at 50 ms so a backgrounded tab does not
jump a path forward when it returns.

## Credits

Design and development by Zhuoqi Liu. Faculty guidance from Todd Linkner.
Data from the Missing Migrants Project, International Organization for Migration:
<https://missingmigrants.iom.int/downloads>
