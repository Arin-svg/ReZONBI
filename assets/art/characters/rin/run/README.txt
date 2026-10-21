Rin running artwork -- FRONT / BACK / LEFT / RIGHT (updated 2026-10-22)

All four directions now contain newly generated leg poses, replacing
provisional copies derived from the original two-pose atlas. They are AI-generated
animation artwork, not hand-authored production animation. Review the loop in-game.
The right-facing cycle was also replaced to match the new artwork.

Each direction has eight 384x384 transparent PNGs. Their atlas is 3072x384,
with eight cells in one row. All four directions have a foot baseline at
pixel 360 and a maximum visible height of 336 pixels. WorldSpriteVisual uses
these measurements to keep size and feet consistent. Existing .meta UUIDs and
GameBootstrap Inspector texture references are retained.

Source sheets: output/rin-animation/source/
Previous PNGs: output/rin-animation/legacy/
Packing script: tools/pack-rin-run.ps1
Measurements: output/rin-animation/measurements.json

Repack from project root:
  powershell -NoProfile -ExecutionPolicy Bypass -File tools/pack-rin-run.ps1

The archived run.zip is an OLD source package. Do not extract it over these files.

Rendering: one persistent billboard mesh, builtin-unlit tilingOffset per frame.
Moving while shooting keeps the run cycle; shots/damage/tracers still occur.
Stationary shooting, melee, dodge, hurt and death retain their action sprites.
