# Signwise

Browser-based ASL alphabet practice with experimental camera feedback.

[Live demo](https://signwise-first-signs.julienleh.chatgpt.site/)

## Features

- Learn A–Z and ILY with illustrated handshapes and step-by-step instructions.
- Track 21 hand landmarks with MediaPipe to measure finger bends, thumb placement, spacing, and hand orientation.
- Normalize distances by palm size, measure finger curls from their own joints and lengths, and locate the thumb relative to the hand’s axes.
- Apply letter-specific rules for fingertip contact, finger crossing, rounded shapes, and thumb positioning.
- Combine overall rule fit with the weakest match, capping scores when critical shape checks fail.
- Highlight the fingers associated with a failing rule and show a matching written correction.
- Complete static letters after an 88+ score on the requested letter’s shape checks and a continuous 1.1-second hold.
- Recognize J and Z through ordered fingertip strokes, turn direction, and path checks adjusted for hand size and handedness.
- Reset motion tracking after sudden position jumps, stale frames, or changes in the detected hand.
- Practice names letter by letter, requiring a brief hand release so repeated letters cannot reuse the same match.
- Take randomized timed tests with hidden hints, automatic timeout scoring, and focused practice for missed letters.
- Pause tests when the camera stops or the tab is hidden, preserving the remaining attempt time.
- Check hand visibility, framing, size, and stability before camera scoring begins.
- Process video entirely in your browser and save progress locally without uploading camera frames.

## Run locally

Requires Python 3. Node.js 22+ is needed for tests. No build or dependency installation required.

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open [localhost:4173](http://127.0.0.1:4173). Camera access requires localhost or HTTPS.

```sh
npm test
```

## Technical overview

- **Stack:** HTML, CSS, JavaScript modules, MediaPipe Hand Landmarker 0.10.32.
- **Recognition:** Custom geometric rules applied to hand landmarks; no server inference or API key.
- **Completion:** Static shapes require a score of 88+ on the requested letter’s rules and a 1.1-second hold. J/Z require a matching trajectory.
- **Storage:** Progress and test results use browser localStorage. Typed names stay in tab memory.
- **Privacy:** Camera frames are processed locally, never recorded or uploaded. Models and fonts load from external providers.

| File | Purpose |
| --- | --- |
| `dist/app.js` | Interface and camera integration |
| `dist/coach.js` | Handshape scoring and motion tracking |
| `dist/session.js` | Hold detection and timed tests |
| `dist/practice.js` | Name sequences, retries, and framing checks |
| `dist/lessons.js` | Lesson content |
| `tests/` | Scoring and practice logic checks |

## Limitations

- Experimental heuristics; scores are not validated ASL accuracy measurements.
- Lighting, camera angle, and hidden fingers can cause incorrect results.
- Covers alphabet practice, not continuous signing or ASL grammar. Real-signer evaluation is still needed.

## Resources

- [Image attribution](dist/images/ATTRIBUTION.md)
- [Hosting instructions](FREE-HOSTING.md)
- [Demo walkthrough and evaluation plan](DEMO.md)
