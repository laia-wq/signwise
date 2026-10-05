# Recognition review — October 4, 2026

## Evidence and causes

The five supplied screenshots display A instructions and incorrect detached,
bent-out, or raised thumb configurations at 100. They contain no exported world
landmarks, so they cannot be replayed as measured recognition fixtures. There is
no separate S screenshot or Raja's J/Z tracking sequence in this feedback.

A previously checked only coarse lateral thumb position and average fingertip
distance, without contact, longitudinal orientation, or height. S already checked
thumb contact and front-of-fist depth, but both A/S inherited a base-fold rule
that could accept straight distal fingers folded at the knuckles.

J/Z used fixed palm-scaled path dimensions and a 450 ms minimum. J allowed a
brief shape mismatch, but Z reset immediately. The UI reset both paths on any
missing-hand frame, bypassing the tracker. These are identified failure modes,
not proof of which one affected Raja.

## Changes

- A: critical palm-local thumb-to-index-side distance, thumb direction, height
  relative to the index knuckle, and lateral placement checks.
- A/S only: require compact finger reach and bent PIP joints in addition to the
  existing fold checks. Other static letter rules remain unchanged.
- J/Z: uniformly normalize trajectory extent before shape comparison, retaining
  aspect ratio. Require 0.275–2 palm lengths of displacement before comparison.
  Minimum duration is 250 ms instead of 450 ms, still with at least five distinct
  points. Existing ordered segments, direction, reversal, straightness, jump,
  timeout and starting-shape checks remain.
- Both letters pause for at most 180 ms of unreliable/missing handshape, without
  adding points or completing. The UI now respects this in practice and tests.
  Resuming must pass the handshape and jump checks. Sustained loss resets.
- Cache/report revision 18. Only the motion guidance sentence changes visually.
  No global score threshold or browser-only storage/privacy changes.

## Verification

Full npm test suite passes, including all static-letter fixtures, persistence,
practice and final-test flows. New cases cover A/S synthetic world landmarks,
mirrored and rotated fists; detached, sideways, raised and tucked thumbs; flat
finger folds; J/Z both hands at 0.8/1/1.6 stroke amplitude, 45/100/250 ms sample
intervals and ±0.1 rad path tilt; a curved Z; shape/dropout pauses; and negative
wrong-shape, reversed, tiny, incomplete, straight and scribbled movements.

These are deterministic geometry tests, not a measured multi-signer benchmark.

## Manual retest

1. Reload the live site. With A, try a valid relaxed fist, then each detached,
   bent-out and thumbs-up position from the screenshots. Try S with the thumb
   across the fist, then alongside it, tucked inside, detached, and with fingers
   flat-folded rather than curled. Try both hands and modest camera angles.
2. Hold the J/Z starting shape until the pen arms. Try smaller/larger, quicker/
   slower and naturally curved paths. Try stationary poses, wrong-direction
   strokes, incomplete letters, and changing the handshape mid-stroke.
3. Repeat A/S/J/Z in the final test; check E, M/N/T, K/P/W and O for regressions.
4. For remaining errors, capture both a correct rejected attempt and an incorrect
   accepted attempt with the optional recognition report. Reports are shared
   manually and contain landmarks, not video.

## Limits deliberately retained

The pen still requires a 350 ms steady starting pose, resets after sustained
tracking/shape loss, hand-label changes, large projected-palm scale changes,
tracking jumps, or a 4.5 s attempt. J direction comes from the initial observed
thumb side (with handedness fallback); Z uses handedness. Severe side views,
label errors, and movement mainly toward/away from the camera remain uncertain:
this is a 2D trajectory check, not full 3D motion interpretation. World landmark
depth errors can still affect fist/thumb contact. Expert live retesting is needed
before claiming those reported recognition failures are resolved.
