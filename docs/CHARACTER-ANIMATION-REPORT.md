# Right run replacement � 2026-10-22

The right-facing artwork has now also been replaced using built-in image_gen, matching the new left-facing style. Updated eight run_right_00..07.png frames, rin-run-right-atlas.png, right-direction height/feet constants in WorldSpriteVisual.ts, packing script, run README, generation prompts and measurements. Prior right assets are backed up in output/rin-animation/legacy; source is output/rin-animation/source/right.png. All .meta files and texture references remain unchanged.

All four directions now use 3072x384 atlases, 384x384 cells, a 336-pixel reference height and 360-pixel foot baseline. The packer supports selecting directions and excludes adjacent-cell hair where the generated first pose extends its boot beyond the nominal cell. Measurements contain all 32 frames.

Verified through normal Creator preview (no source injection): tools/browser-animation.cjs animation-all-four-new http://127.0.0.1:7456 passed all 32 frame selections, 20 action poses, moving-fire continuity, transitions and stable mesh/material identities. Visually inspected temp/animation-all-four-new.png and confirmed runtime texture dimensions for all four directions. TypeScript --skipLibCheck passed. AI-art edge fringing/style variations and lack of physical-device validation remain as noted below.

---

# Latest result -- replacement artwork and moving fire, 2026-10-22

This section supersedes the earlier statement that the original repeated artwork is still installed.

- Replaced front/back/left run artwork with eight newly generated poses per direction (24 PNGs), and repacked the three existing atlas PNGs. Right run, idle, and action artwork are unchanged. All .meta files/UUIDs and Inspector references remain intact.
- Saved source sheets to output/rin-animation/source and original assets to output/rin-animation/legacy. Built-in image_gen was used; production briefs are in output/rin-animation/PROMPTS.md. Packing and measured alpha bounds are reproducible with tools/pack-rin-run.ps1 and output/rin-animation/measurements.json.
- WorldSpriteVisual now lets locomotion continue during moving fire instead of replacing it with a static full-body shoot pose. Stationary fire uses the existing shoot sprite. Combat simulation/tracers/damage are unchanged; slash, dodge, hurt, death retain priority. This is a deliberate visual tradeoff: moving fire has no separate gun-aiming body pose until dedicated run-and-fire art is available.
- Updated RUN_HEIGHT/feet for the replacement assets (336-pixel max visible height, 360-pixel foot baseline on 384-pixel cells). Updated run/README.txt so it no longer describes the installed frames as old two-pose copies. The old run.zip is explicitly marked obsolete in the README.
- Updated tools/browser-animation.cjs to check stationary action poses and uninterrupted eight-frame locomotion under repeated shooting requests.

Validation: activated Creator so its asset database reimported the changed PNGs/scripts, then ran the NORMAL browser preview, without injected source. All 32 run selections and 20 action poses passed; inspected temp/animation-new-art.png. Moving-fire input samples changed from 22 shoot/18 run to 0 shoot/40 run, visiting all eight frames. W/A/S/D movement-to-run-to-idle, J shooting, K melee, Space dodge, pause/restart passed with no runtime errors. Stable mesh/material identities passed over 1,200 updates with repeated shoot requests. TypeScript --skipLibCheck, 8 combat/navigation checks, 6 progression checks, and diff whitespace checks passed.

Limitations: artwork is AI-generated, not hand-authored; edge fringing and some pose/style variation remain. No claim is made of a polished hand-animated loop or device verification. Packaged mobile/Huawei builds and a full boss playthrough remain unverified.

Files changed in this follow-up: WorldSpriteVisual.ts; the 24 run_front/back/left_00..07.png files; rin-run-front/back/left-atlas.png; run/README.txt; tools/browser-animation.cjs; new tools/pack-rin-run.ps1; this report; output/rin-animation/{source,legacy,measurements.json,PROMPTS.md}. Other gameplay source was not changed.

---

# Character animation investigation � 2026-10-20

## Findings

The current player/WorldSpriteVisual.ts was instantiated by GameBootstrap and passed directly to PlayerController.visual. ZombieVisual also imports that implementation. The core copy had no runtime consumers. The live preview had one visible Rin world sprite, the correct four textures (3072x384 front/back/left, 3968x397 right), builtin-unlit, and the same material on the renderer as on the animation object.

Before changing the renderer, actual WebGL screenshots showed changing poses in ALL four directions. A frozen GPU frame was not reproduced. See ../temp/animation-before.png. Therefore the current evidence does not support claiming that a shader/UV failure caused the observed sliding. The older implementation's repeated mesh construction/destruction was unnecessary, not demonstrated to be the cause of frozen frames.

The front/back/left artwork repeats poses: frames 0/4 and 2/6 match visually, with small variations in other repeated frames. assets/art/characters/rin/run/README.txt identifies these as provisional derivatives of two original poses, not eight independently drawn poses. The front/back/left content occupies roughly 282�320 of 384 vertical pixels; right occupies 368�381 of 397. Drawing all of these on the same square quad changed apparent height and distorted the non-square right cells. Foot margins also varied considerably. Some source poses reach cell edges and contain red/magenta edge artifacts.

Additional hazards: GameBootstrap_old.ts registered the same ccclass name with only the right-run property; Main.scene serialized two enabled bootstrap components, one on the scene and one on GameManager. The current bootstrap's node-name guard prevented double initialization in the observed preview. The existing port 7457 build was stale, and even port 7456 continued serving the old compiled source after disk edits. This was detected explicitly; screenshots from that reload were NOT treated as verification of the fix.

## Implementation

One immutable unit quad and one material are created per visual. The installed Cocos 3.8.8 builtin-unlit.effect (UUID a3cd009f-0ab0-420d-9278-b9fdab939bbc) computes `a_texCoord * tilingOffset.xy + tilingOffset.zw`. Frame selection writes this uniform only when the selected frame/texture changes, and binds mainTexture only when the texture changes. There are no per-frame meshes, materials, or textures. Timing remains delta-time based, with run FPS in SpriteConfig. Combat/idle/zombie atlas layouts and terminal death/reset behavior remain supported.

Per-direction reference heights and per-frame foot baselines were measured from alpha >= 0.45 pixels. Scale preserves source pixel aspect ratio and visible reference height; billboard-up positioning removes transparent foot padding. A constant reference height within each clip preserves actual pose compression. Synthetic running bob was removed. Rin/walker reference height is 2.15, runner 1.95; sprite boss tuning remains 4.2. The actual SignalTyrant's custom geometry was untouched.

## Files changed by this task

- assets/scripts/player/WorldSpriteVisual.ts � persistent quad/uniform animation, source-aspect scaling and measured foot baselines, no synthetic bob.
- assets/scripts/core/GameConfig.ts � SpriteConfig FPS and visible height tuning.
- assets/scripts/core/WorldSpriteVisual.ts � compatibility re-export of the player implementation; metadata retained.
- assets/scripts/core/GameBootstrap_old.ts � compatibility re-export instead of a second decorated bootstrap; metadata retained.
- assets/Main.scene � disabled only the redundant scene-level bootstrap; all Inspector references retained.
- tools/test-m1.cjs � check the GameManager bootstrap and exactly one enabled serialized instance.
- tools/audit-sprite-art.cjs � repeatable alpha-bound audit using browser canvas, output temp/art-audit.json.
- tools/browser-animation.cjs � actual WebGL frame/action captures, state transitions, stale-build rejection and mesh/material identity checks; optional --inject-source engine integration mode.
- docs/CHARACTER-ANIMATION-REPORT.md � this report.

Existing user changes to artwork, PlayerController, GameBootstrap, CombatEncounter and their metadata were not reverted. This task did not modify CombatEncounter, PlayerController or the PNG artwork. No .meta files were deleted or modified.

## Verification

- Project TypeScript: PASS using installed TypeScript with `--noEmit --skipLibCheck`. Full `--noEmit` reports pre-existing Cocos declaration errors (WebGPU types, internal animation imports, etc.); it is not a clean full declaration check.
- Existing regression suites: 8 movement/scene checks, 8 combat/navigation checks, 6 progression checks passed.
- Current-source engine integration: PASS in live Cocos WebGL via `node tools/browser-animation.cjs animation-source http://127.0.0.1:7456 --inject-source`. This transpiles current source and instantiates it in the existing engine with existing scene textures. It is NOT a fresh asset-import/build test.
- Observed all 32 run frame selections; adjacent frame screenshot pixel hashes differ in every direction. Inspected temp/animation-source.png visually. This proves rendered changes, not eight unique authored poses.
- Observed all 20 directional action poses; inspected temp/animation-source-actions.png. Shoot/slash/dodge/hurt/death selection passed.
- Idle/run transitions, timed action return, terminal death, and reset passed. Mesh/material identity stayed fixed for 1,200 updates. No engine errors were captured in this integration test.
- Instantiated current-source walker and runner beside Rin, inspected temp/animation-sizes.png: comparable standing Rin/walker proportions and a smaller crouched runner. Actual boss geometry unchanged.
- Fresh Creator CLI build could not be completed: sandbox attempt failed on engine cache permissions/GPU process startup; elevated attempts exited -1 without a completed build. Editor preview continued using stale source. Fresh import/build, packaged mobile/Huawei behavior, and a complete input-driven combat playthrough remain unverified.

## Remaining work

A genuinely smooth eight-pose front/back/left run needs improved authored source frames. No UV or timing change can provide missing limb poses. Existing red/magenta edge artifacts and any cell-edge clipping are artwork issues. If artwork changes, rerun the alpha audit and update reference heights/foot baselines. Verify a fresh Creator import/build before release; do not mistake the existing cached preview/build for the changed source.

## Follow-up verification � 2026-10-22

Creator has now recompiled and loaded the edited source through its NORMAL preview pipeline. No source injection was used for this run:

`node tools/browser-animation.cjs animation-preview-current http://127.0.0.1:7456`

PASS: current implementation detected, one enabled bootstrap, one Rin visual, four correct atlas textures, all 32 run selections with changing adjacent rendered pixels, all 20 directional action poses, idle/run/action/death/reset transitions, stable mesh/material identities over 1,200 updates, and no runtime errors. The generated contact sheet temp/animation-preview-current.png was visually inspected. This supersedes the earlier limitation about unverified normal preview importing. The artwork still repeats poses; it does not provide eight unique poses in front/back/left.

Actual browser keyboard input also passed: W/A/S/D each moved Rin, selected the expected directional run, and returned to idle on release; J fired, K triggered melee, Space triggered dodge; pause/restart worked. The first input probe lacked canvas focus; focusing the canvas and repeating passed. These checks used CDP input events, not direct animation calls. TypeScript with --skipLibCheck and the eight movement/scene checks passed again; git diff --check passed.

Packaged web/mobile/Huawei builds remain unverified: another Creator CLI build attempt exited -1. A full boss/skill playthrough and physical-device touch test were not performed in this follow-up. No additional gameplay source changes were necessary.
