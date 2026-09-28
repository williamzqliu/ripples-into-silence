// js/config.js
//
// Every tunable number in the sequence. Getting the rhythm right meant
// changing a constant and reloading, over and over, so they all live here
// rather than in whichever module happens to use them.

// ---------------------------------------------------------------- geometry

export const FRAME_WIDTH = 650;
export const FRAME_HEIGHT = 650;

// The drawing is scaled down to fit smaller windows (see drawCanvas), and
// its labels with it. No label is allowed to come out smaller than this.
export const MIN_TEXT_PX = 14;

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
// The ring label's box, near enough, for keeping marks off it (see
// data/incidents.js), and the daylight a mark keeps from it.
export const RING_LABEL_W = 36;
export const RING_LABEL_H = 18;
export const RING_LABEL_CLEAR = 4;

// Angle carries nothing, so it is free to be chosen for legibility. Walking
// the golden angle down the radius order puts marks at a similar distance
// 137.5 degrees apart. See data/incidents.js.
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// ----------------------------------------------------------------- opening
//
// The island, its name, and the shrink that lands it on the cross. These
// used to be three setTimeouts spread across showIsland and the controller
// that disagreed with each other about when the opening was over.

export const ISLAND_WIDTH = 300;      // the outline, in frame units
export const NAME_OFFSET = 78;        // the name, below the middle
export const ISLAND_FADE_IN = 800;
export const ISLAND_HOLD = 1300;      // before the name goes
export const NAME_LINGER = 100;       // the name stays this much longer; the shrink does not wait
export const NAME_FADE_OUT = 600;
export const ISLAND_SHRINK = 900;     // onto the cross, which grows in step

// The fifty kilometre circle opens out of the cross rather than fading in
// at full size, so the reader sees where it came from. It used to wait two
// seconds after the island had gone, and the rings another two after that,
// because drawDistanceRings was passed the same delay a second time.
export const CIRCLE_OPEN = 1400;
export const RING_STAGGER = 220;

// How long the radius line's reading is left up before the counters arrive.
export const RADIUS_HOLD = 3200;

// ------------------------------------------------------------------ pacing
//
// The schedule itself, when each record goes out and how the opening eases
// in, is in scenes/record/drawPaths.js, with the reasons for it.

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
// Daylight between a label's near edge and whatever it is clearing: the
// mark it names, the line, or other text. See chooseSpot in renderPath.
export const LABEL_GAP = 8;

// The disc keeps growing and fading after the label appears, out to three
// times the mark. Asking the label to clear all of that throws it seventy
// pixels away from a mark it is supposed to be attached to, and by then the
// disc is a quarter opaque and blurred. This is the radius that still reads
// as solid while the label is up.
export const LABEL_MARK_CLEAR = 1.8;

// The original's timing: the distance comes up a beat after launch, and
// as the mark bursts it crossfades with the count in the same place. The
// count is held long enough to read.
export const LABEL_DELAY = 200;       // ms after launch before the distance shows
export const LABEL_FADE = 300;        // ms, every fade in and out
export const LABEL_HOLD = 1800;       // ms the death count stays up
// How far a label keeps from the mark it names, in the mark's radii.
export const LABEL_OWN_CLEAR = 1.15;

// ------------------------------------------------------- background field

// The ambient ripples behind the cover and the intro. A ceiling on how many
// can be alive at once, so a slow machine degrades by thinning the field
// rather than by falling over: the loop asks for up to nine at a time and
// each lives about two seconds, so twelve is the working number and this is
// the wall behind it.
export const BG_MAX_LIVE = 90;
export const BG_TICK_MIN = 300;   // ms between batches
export const BG_TICK_MAX = 800;
