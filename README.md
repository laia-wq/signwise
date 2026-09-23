# Signwise

Browser-based ASL alphabet practice with experimental camera feedback.

[Live demo](https://signwise-first-signs.julienleh.chatgpt.site/)

## Features

- Learn A–Z and ILY with illustrated handshapes and step-by-step instructions.
- Track 21 hand landmarks with MediaPipe to measure finger bends, thumb placement, spacing, and hand orientation.
- Get a live match score with highlighted fingers and written suggestions for adjusting your handshape.
- Complete letters automatically by holding a shape that scores above competing letters.
- Recognize J and Z by checking fingertip movement paths adjusted for hand size and handedness.
- Practice spelling your name with separate camera matches for each letter, including repeated letters.
- Take timed camera tests and practice or retest the letters you missed.
- Check hand visibility, framing, and stability before camera scoring begins.
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
- **Completion:** Static shapes require a score of 88+, a 4-point lead over other shapes, and a 1.1-second hold. J/Z require a matching trajectory.
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
