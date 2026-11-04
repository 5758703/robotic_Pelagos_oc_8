# Current control and scored tour

The web simulator now accepts `stateAt(phase, current)` and `armPoints(index, phase, current)`; current is clamped to 0–3 m/s and defaults to zero. Drag area 0.008 m² and drag coefficient 0.5 are design estimates, not measured values.

The model uses D = ½ρCdAu². Cycle-average jet thrust increases by D above the original demonstration's baseline. The displaced volume rises smoothly to 1.6× baseline and the period shortens to supply the required momentum flux. At 3 m/s, estimated drag is 18 N, peak jet thrust is 81.696 N, and pulse frequency is 0.756 Hz. At 0.3 m/s, peak thrust is 10.416 N, close to the original 9.696 N. This is ideal feed-forward station holding, without body-inertia or CFD simulation.

Sway bends the distal arm headings downstream and varies smoothly with phase. Roots and segment lengths stay fixed. Telemetry, 3D geometry, arm curl bars, pressure history and 2D schematic consume the same state. Changing the current slider takes control and resumes live simulation, even after phase scrubbing paused it. The existing Blender file remains the zero-current study source.

## Audio and video

- `src/score.js`: original procedural ambient chord, low filtered-noise jet envelope, short button clicks and a soft separation pop. Shared palette and jet-gain function for live preview and offline synthesis.
- `src/film.js`: export-only current demonstration, gentle 0.3 m/s → strong 3 m/s → calm.
- Live sound is opt-in with **Enable sound**, respecting browser audio-activation rules.
- `scripts/render-film.mjs`: deterministically renders the full 40-second console tour at 1600×900, 30 FPS. Actual button/separation event timestamps and physical state samples are saved in `artifacts/film/timeline.json`.
- `scripts/render-score.mjs`: synthesizes a stereo, 48 kHz floating-point premaster from that exact trace. No third-party audio samples.
- `scripts/master-film.py`: measures and applies two-pass normalization, writes a 24-bit WAV master, muxes 320 kbps AAC into the MP4, then measures the decoded MP4 again.

Rebuild with the local Vite server running:

```powershell
node scripts/render-film.mjs
node scripts/render-score.mjs
python scripts/master-film.py
```

The mastering target is −14 LUFS integrated. The limiter ceiling is −1.5 dBTP to leave encoding headroom; acceptance requires the final AAC decoded from MP4 to remain below −1 dBTP, with loudness within 0.2 LU of −14. The measured result, rather than the filter settings alone, is recorded in `artifacts/film/loudness-report.json`. Method: [FFmpeg loudnorm documentation](https://ffmpeg.org/ffmpeg-filters.html#loudnorm).

## Verification

- `tests/current.test.mjs`: gentle/strong response, phase continuity, finite input, range clamping, fixed arm lengths and integrated flow conservation.
- Collision sweep covers 40 phases at 0, 0.3, 1.5 and 3 m/s. Minimum sampled nonadjacent capsule clearance is 3.07 mm.
- `scripts/current-audio-qa.mjs`: tests visible thrust against the model, slider-driven live restart, sound toggles, separation action and deterministic capture.
- Live preview level is intentionally conservative. The −14 LUFS mastering claim applies to the exported soundtrack/video, not arbitrary-length interactive listening.

The final review also found and fixed a vertical-crossing orientation flip: link frames now use the model's continuous azimuth rather than recovering an azimuth from the tangent. A regression test checks the former 180° roll at phases 0.712–0.713 under 3 m/s current. The full suite now contains 15 passing tests.

## Final measured delivery
Final MP4: 40.000 seconds, 1600×900, 30 FPS, 1,200 decoded frames. Decoded AAC measures **-14.01 LUFS integrated** and **-1.30 dBTP true peak**. The stereo PCM master measures -13.98 LUFS / -1.34 dBTP. The film contains 24 button clicks, one separation pop at 12.1 s, and phase-driven whooshes across 26 new jet onsets plus the initial in-progress pulse. See loudness-report.json, sync-report.json and video-validation.json in artifacts/film/.
