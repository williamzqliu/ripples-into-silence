// js/config.js
//
// Every tunable number in the sequence. Getting the rhythm right meant
// changing a constant and reloading, over and over, so they all live here
// rather than in whichever module happens to use them.

// ---------------------------------------------------------------- geometry

export const FRAME_WIDTH = 650;
export const FRAME_HEIGHT = 650;

export const cx = FRAME_WIDTH / 2;
export const cy = FRAME_HEIGHT / 2;

// The circle paths launch from, and the distance it stands for. Every
// incident in the data falls inside this radius.
export const LAUNCH_RADIUS = 300;
export const RADIUS_KM = 50;
export const RANGE_CIRCLE_STROKE = 2;

// The cross marking Lampedusa itself.
export const CROSS_LINE_STROKE = 1.5;
export const CROSS_LINE_OPACITY = 0.75;
export const CROSS_LINE_LENGTH = 5;
export const CROSS_COLOUR = "#FBC900";

// ---------------------------------------------------------------- encoding

// Ripple radius carries the number of people dead or missing. Seventy of
// the ninety-four incidents killed five people or fewer, so the floor is
// what most of the marks are drawn at.
export const SCALE_DEAD_MIN = 6;
export const SCALE_DEAD_MAX = 25;

// Radial position carries the incident's recorded distance from the island.
// The far end is the whole radius, so an incident recorded at fifty
// kilometres lands on the dashed circle the radius line calls fifty
// kilometres; it used to stop at nine tenths of it. The near end keeps a
// little clearance so the closest incident does not land on the cross.
export const SCALE_DISTANCE_MIN = 0.08;
export const SCALE_DISTANCE_MAX = 1;

/** Where a distance in kilometres sits, as a fraction of LAUNCH_RADIUS. The
    scale is fixed to the frame rather than to the extent of the data, so the
    rings below and the incidents are read off the same ruler. */
export function radiusFractionFor(km) {
  const t = Math.min(Math.max(km / RADIUS_KM, 0), 1);
  return SCALE_DISTANCE_MIN + t * (SCALE_DISTANCE_MAX - SCALE_DISTANCE_MIN);
}

// Drawn inside the fifty kilometre circle, so the empty outer water reads as
// a measured distance rather than as space nothing was plotted in. In draw
// order, which is outside in: the ruler is laid down from the edge the
// fifty kilometre circle has already established, rather than from the
// middle outwards to a boundary the reader has not been given yet.
export const DISTANCE_RINGS_KM = [25, 10];

// At 1px on a 3-on-5-off dash these were a suggestion of a ring rather than
// a ring. The fifty kilometre circle is 2px, and these stay under it.
export const DISTANCE_RING_STROKE = 1.5;

// Daylight between a ring label and the ring it names. Five is what the
// outer one can afford: the fifty kilometre circle leaves twenty-five
// pixels of frame above it and the label is eighteen tall.
export const RING_LABEL_GAP = 5;

// Paths are released in a shuffled round robin over this many angular
// sectors, so consecutive incidents arrive from different directions.
export const ANGLE_BUCKETS = 20;

// Angle carries nothing, so it is free to be chosen for legibility. Walking
// the golden angle down the radius order puts marks at a similar distance
// 137.5 degrees apart. See dataProcessing.
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// The first few paths are picked to be legible rather than representative:
// small enough to read, near enough to arrive quickly, and launched from the
// lower half of the circle where the label has room.
export const FEATURED_DEAD = 8;
export const FEATURED_DISTANCE = 0.4;
export const FEATURED_ANGLE_MIN_DEG = 100;
export const FEATURED_ANGLE_MAX_DEG = 260;

// ------------------------------------------------------------------ pacing

export const INITIAL_INCIDENTS = 3;   // released slowly, one at a time
export const FIRST_DELAY = 3000;      // ms before the first one
export const INITIAL_DELAY = 6000;    // ms between those first few
export const INITIAL_SPEED = 0.25;    // and they travel slowly as well

export const MAX_CURRENT = 5;         // paths allowed in flight at once
export const MIN_GAP = 400;           // floor on the gap once accelerated
export const LAUNCH_INTERVAL = 50;    // how often the scheduler looks

// Path progress per frame at 60Hz. renderPath turns this into progress per
// millisecond, so the tuning survives on a display of any refresh rate.
export const LAUNCHING_SPEED = 0.04;

// ------------------------------------------------------------------ ripple

export const RIPPLE_TRANS_DURATION = 200;         // scale-in
export const RIPPLE_SHOWING = 200;                // hold before fading
export const RIPPLE_OUTER_FADING_DURATION = 1400;
export const RIPPLE_OUTER_OPA_ORG = 0.9;
export const RIPPLE_OUTER_ENLARGE = 3.0;
export const RIPPLE_INNER_STROKE = 2;
export const RIPPLE_BLUR_MAX = 4;                 // px, by the end of the fade

// How visible the ring left behind is, by the size of the loss, so a larger
// incident stays readable for longer. The bottom rung was 0.1, which is
// where seventy of the ninety-four incidents sit: three quarters of the
// record was drawn at the edge of visibility. The ordering is unchanged.
export const RIPPLE_INNER_OPACITY_STEPS = [
  { upTo: 5, opacity: 0.18 },
  { upTo: 10, opacity: 0.22 },
  { upTo: 20, opacity: 0.26 },
  { upTo: 50, opacity: 0.31 },
  { upTo: 100, opacity: 0.37 },
  { upTo: Infinity, opacity: 0.45 },
];

// -------------------------------------------------------- travelling label

export const LABEL_FONT = "'EB Garamond', Georgia, serif";
export const LABEL_SIZE = 15;         // the km readout and the death count
// How far the near edge of the label sits from the thing it is clearing:
// the path it belongs to, the mark it names, or another label. Measured to
// the edge of the text, not to its centre. See placeLabel in renderPath.
export const LABEL_OFFSET = 14;
export const LABEL_GAP = 8;

// The disc keeps growing and fading after the label appears, out to three
// times the mark. Asking the label to clear all of that throws it seventy
// pixels away from a mark it is supposed to be attached to, and by then the
// disc is a quarter opaque and blurred. This is the radius that still reads
// as solid while the label is up.
export const LABEL_MARK_CLEAR = 1.8;

export const LABEL_FADE = 300;        // ms, in and out
export const LABEL_HOLD = 800;        // ms the death count stays up

// ------------------------------------------------------- background field

// The ambient ripples behind the cover and the intro. A ceiling on how many
// can be alive at once, so a slow machine degrades by thinning the field
// rather than by falling over: the loop asks for up to nine at a time and
// each lives about two seconds, so twelve is the working number and this is
// the wall behind it.
export const BG_MAX_LIVE = 90;
export const BG_TICK_MIN = 300;   // ms between batches
export const BG_TICK_MAX = 800;

// --------------------------------------------------------------- arrivals

// The only figure on this page that is not in the incident record. The
// Missing Migrants extract counts boats where somebody died; it has no way
// of counting the boats that arrived. 45,997 people landed at Lampedusa in
// 2024, on 1,095 boats, per the Italian Red Cross, which runs the reception
// centre there. For scale, UNHCR puts sea arrivals for the whole of Italy
// that year at 66,617.
export const ARRIVALS_2024 = 45997;
export const ARRIVALS_SOURCE =
  "Arrivals: Italian Red Cross via InfoMigrants, 13 January 2025";

// ------------------------------------------------------------------- stats

export const UPDATE_RATE = 850;
export const UPDATE_SPEED_YEAR = 675;
export const UPDATE_SPEED = 500;
export const START_YEAR = 2014;

// The year advances when its last incident lands, which is not the same
// moment as the year reading well on screen. These shift individual years so
// the progress bar and the paths stay in step.
export const YEAR_ADVANCE_DELAY = 1200;
export const YEAR_DELAY_OVERRIDES = {
  2017: -2000,
  2018: 0,
  2019: 1000,
  2020: 1500,
  2021: 1000,
  2022: 1000,
};
