"""Make 8-frame horizontal run atlases from Rin's 32 transparent PNGs.
Run: py make_run_atlases.py
Requires Pillow: py -m pip install pillow
"""
from pathlib import Path
from PIL import Image

run_dir = Path(__file__).resolve().parent / 'assets' / 'art' / 'characters' / 'rin' / 'run'
if not run_dir.is_dir():
    raise SystemExit(f'Run folder not found: {run_dir}. Place this script in the ReZONBI project root.')
for direction in ('front', 'back', 'left', 'right'):
    paths = [run_dir / f'run_{direction}_{i:02d}.png' for i in range(8)]
    missing = [str(p) for p in paths if not p.is_file()]
    if missing:
        raise SystemExit('Missing frames:\n' + '\n'.join(missing))
    frames = [Image.open(p).convert('RGBA') for p in paths]
    # Equal-size cells are essential for Cocos tilingOffset 1/8.
    cell_w = max(im.width for im in frames)
    cell_h = max(im.height for im in frames)
    # Keep each frame centered horizontally and grounded at the bottom.
    atlas = Image.new('RGBA', (cell_w * 8, cell_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        x = i * cell_w + (cell_w - frame.width) // 2
        y = cell_h - frame.height
        atlas.alpha_composite(frame, (x, y))
    output = run_dir.parent / f'rin-run-{direction}-atlas.png'
    atlas.save(output, optimize=True)
    print(f'Created {output.name}: {atlas.width}x{atlas.height}')
print('Done. Return to Cocos Creator and assign the 4 atlases to GameBootstrap.')
