# Verification record

Environment: Windows, Chrome, ANGLE D3D11, **Intel HD Graphics 530** integrated GPU.

## Passed

- Production Vite build.
- Eight model/geometry tests: independently calculated thrust and pressure, cycle volume conservation, zero refill thrust, periodic seam, fixed arm lengths, shell surface normals, joint continuity, solo/isolate semantics.
- Capsule sweep across 40 phases, all eight arms and nonadjacent link pairs: minimum sampled clearance **3.08 mm**. Capsule axes reflect the specified 10 mm joint gap; adjacent articulating joints are excluded.
- 62 browser assertions and sampled checks, plus four independent-review regression checks.
- Browser exercises phase scrub, subsystem selection, isolation, solo view, camera controls, orbit, wheel, H shortcut, quality selection, tour takeover, 25-second resume and 390 px layout.
- Eight tour-node stills and 56 transition stills, sampled every 0.2 s through each 1.1 s camera transition. The final sample is at 1.2 s. Strips were visually inspected for pose discontinuity, clipped endpoints and label obstruction.
- Blender reopened independently: no invalid drivers, five cycle phases checked; maximum arm position discrepancy 0.000000134 m and maximum joint gap error 0.000000069 m.

## Measured performance

Integrated GPU tier at 1600×900: 0.75 pixel ratio, 512 px shadow map, no AO, telemetry updated every other frame.
An automated 120-frame sample measured **33.4 ms median / 66.8 ms p95**, approximately 30 FPS median. The final instantaneous snapshot was 22 FPS; the 120-frame median remained approximately 30 FPS. The full assembly uses about 192 render calls (including shadow/refraction passes), reduced from 2,868 before batching. These figures describe this machine and this run, not a universal FPS guarantee.

## Corrected during inspection

- Reversed mantle profile ordering to correct surface normals; enabled double-sided shell visibility for open-petal inspection.
- Fixed arm local frames so suction discs consistently face the inner side of the bend.
- Consolidated immutable link geometry and instanced repeated assemblies on the GPU.
- Compressed desktop telemetry spacing to avoid bottom panels overflowing at 1600×900.
- Replaced a single-arm callout target as camera focus with bounds-based framing; the arm root now stays in frame.
- Fixed takeover-button event ordering, full-assembly restoration from solo mode, and idle resumption during an active drag.
- Converted Blender long expressions into native property dependency chains to avoid expression truncation; kept the animated phase as float to avoid integer stepping.

## Scope and honest limits

No inter-arm collision was observed in the sampled conservative envelopes. No collision was concealed by a camera adjustment. Bounds-based camera changes fixed framing only. Open-shell pump/core separation is an explicitly labelled maintenance/exploded display.
Isolation and subsystem visibility changes are discrete UI filters; physical joint positions and camera interpolation remain continuous. The model uses design estimates; it is not sensor-connected or fluid/structurally validated.

Artifacts: `beat-00.png` through `beat-07.png`, `tour-contact-sheet.jpg`, `transitions/*.png`, `transitions/strip-*.jpg`, `mobile.png`, `qa-results.json`, `review-regressions.json`, `blender-validation.json`.

