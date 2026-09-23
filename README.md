# Signwise

A browser-only ASL alphabet learning prototype with 26 illustrated letters, bonus ILY, experimental camera match scores, automatic completion, name spelling practice, targeted retries, and timed camera tests. No server inference or API key is used.

[Try Signwise](https://signwise-first-signs.julienleh.chatgpt.site/) · [Demo walkthrough and evaluation plan](DEMO.md)

## Run locally

`python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`

Open http://127.0.0.1:4173. Camera access needs localhost or HTTPS. No build required. Run all logic checks with `npm test` (Node.js 22+). No npm dependencies need installing.

## Camera matching

`dist/coach.js` calculates four finger-extension measures, whole-finger curvature, thumb joint angles and abduction, thumb-to-finger segment contact, relative thumb depth, finger separation/crossing, and screen orientation from MediaPipe landmarks. Each static letter has its own combination of rules. Critical thumb/shape rule failures cap the score below the passing threshold, so other matching fingers cannot compensate. C/O use curvature and fingertip grouping; Q checks both index and thumb direction; S/T compare thumb placement relative to the curled fingers. Depth is an estimate from predicted landmarks, not verified visibility of an occluded thumb. Every target is compared with competing static letters; a result needs a score >= 88 and >= 4 points above its closest competing shape. The score is a geometric fit, not a probability or calibrated ASL accuracy percentage.

`MotionTracker` tracks pinky motion for J and index motion for Z over up to 4.5 seconds. It requires the starting handshape plus the ordered strokes, and rejects stationary hands, missing hands, switches of handedness, and stale tracks. Paths are normalized by initial screen palm length, reflected for reported handedness, and checked for ordered, reasonably straight Z strokes or a smooth J hook. Tracking jumps and large changes in apparent palm size reset the attempt. Motion completion does not require the static hold delay.

`HoldGate` requires a continuous static match for 1.1 seconds, resetting on misses, target changes, camera stops, or stale frames. Camera completions use `signwise-camera-completed-v1`, separately from the old self-reported practice key; old manual marks are not silently treated as recognized completions.

## Guided practice

“Spell your name” normalizes accented Latin letters to A–Z and accepts spaces, apostrophes, and hyphens, with a limit of 24 letters. The name remains in tab memory and is never persisted or transmitted. Each static letter needs a sustained camera match; J/Z need motion. Between letters the hand must leave view for 400 ms, preventing an unchanged pose from completing repeated letters. This is deliberate alphabet practice, not continuous fingerspelling assessment.

Amber finger segments and outlined fingertips identify the lowest-fitting handshape rule, with the same correction written below the camera. Highlights are suggestions based on estimated landmarks, not verified diagnoses. Hints stay hidden during test attempts.

Every camera start requires one whole hand to remain within frame, large enough to track, and steady for 700 ms before scoring. Test countdowns wait for this check. Framing checks do not measure lighting quality or validate hidden fingers. Once a timed attempt starts, missing or clipped hands still consume time; stopped or stale camera feeds pause it.

## Timed tests

`dist/session.js` contains the test state machine. Tests use 5, 10, or all 26 shuffled letters with 15, 20, 30, or 45 seconds per letter. Each attempt begins after camera setup and a three-second countdown. References, instructions, lesson navigation, and coaching hints are hidden while answering. Recognized letters are correct; timeouts are incorrect. Each outcome requires an explicit Next before the next attempt. The final total is correct letters / attempted letters and a percentage. Results are saved on the device. Missed letters can be practiced with guides and then retested as a focused set. The last completed test’s missed letters remain available after reload.

Camera failure, hidden tab, stopped stream, or stale frames pause an active timer. No hand in an otherwise working camera does not pause the timer. Early cancellation does not save a final test grade; already matched lessons stay completed. Test grading is detector-based, not an assessment by an ASL instructor.

## Privacy and dependencies

Camera starts only after a camera/test action; no audio is requested. Video is neither recorded nor uploaded. MediaPipe 0.10.32 JS/WASM loads from jsDelivr and the hand model loads from Google Cloud Storage. Fonts use Google Fonts. Those providers receive normal web request metadata but no camera frames. Instructor resources open on their original websites. The page releases the camera when hidden or left.

## Validation and limitations

Automated tests cover the reported wrong-thumb cases (R/U/V/W/X/Y/ILY), Q thumb direction, S/T placement, C/O closure and curvature, feature invariance under scale/rotation/reflection, representative lookalike scores, sustained-match continuity, reset on dropped frames, wrong/duplicate answers, deadline expiration, pause/resume, total scoring, and synthetic right/left J/Z trajectories. Browser inspection checks the loaded controls. These are implementation tests, not real-world recognition accuracy measurements.

The matcher is heuristic, not a trained ASL classifier. Occluded thumb/fingers (especially M/N/T/E/S), hand proportions, mobility, lighting, palm direction, and camera perspective can cause false positives or false negatives. The motion thresholds need real-signer evaluation. Do not present a 100/100 score as proof of language correctness. Face, body location, grammar, and continuous signing are not assessed. A validated diverse signing dataset and Deaf educator review remain necessary before using grades for anything consequential.

## Sources and images

Alphabet SVGs are extracted from the public-domain Commons Gallaudet alphabet; complete provenance is in `dist/image-credits.html` and `dist/images/ATTRIBUTION.md`. Original hand artwork and movement arrows are retained. Lifeprint resources are linked, not embedded, per its reuse policy.

- https://commons.wikimedia.org/wiki/File:Asl_alphabet_gallaudet.svg
- https://www.handspeak.com/topic/408/
- https://www.lifeprint.com/asl101/topics/ily.htm
- https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js

## Free public hosting

See FREE-HOSTING.md. This remains a static site suitable for the free Cloudflare Pages plan. The portable ZIP contains only the static website. The GitHub source export excludes hosting credentials and private hosting configuration.

## Demo and evaluation

See [DEMO.md](DEMO.md) for a recording walkthrough and a real-signer evaluation protocol. No real-signer accuracy study has been completed.
