# Re:ZONBI visual pass — 2026-10-19

This is an incremental visual pass on the existing playable roguelite, not finished anime artwork. Main.scene still launches the connected Horde encounter. No gameplay systems were removed, no dependencies downloaded, and no Git commits or pushes made.

## References

Inspected the two references already in docs/reference, then all five supplied images: Neon Horde, Cyberpunk City Design Board, Cyberpunk Survival Showcase, Enemy Design Codex and Rin Character Concept Sheet. Copied the five supplied PNGs into docs/reference under their original names. These are reference documents outside assets and are not packaged into the RPK. The supplied Showcase has no `(1)` suffix; it supplies the requested overall reference.

The new sheet guides silver-pink twin tails, crimson/black tactical clothing, pale protagonist contrast, pink attack effects, warm storefronts, dark streets and crystalline boss armor. Enemy references guide silhouette and mutation; regular enemies deliberately retain different hair/costume silhouettes from Rin.

## Implemented changes

- **V1:** Circular vector combat controls, pause/play icon, original vector portrait placeholder, compact health/noise/timer, bottom EXP bar, unlocked-skill badges, icon-based skill cards and dimmed selection background. Existing joystick and per-touch ownership remain. Camera orthographic height is 8 instead of 9; profiler is hidden by default.
- **V2 interim art:** Tapered body/limb meshes, silver-pink animated twin-tail strands, crimson jacket/ties/soles, utility details, bright ground ring, and victory pose. The existing action transforms still animate movement, recoil, slash, dodge, hurt and death. A CharacterVisual interface and optional GameBootstrap.rinModel prefab property prepare replacement by an authored rig.
- **V3 interim art:** Walker civilian tie/torn lapel, uneven posture and shamble; lean forward-tilted Runner with longer arms, talons and spines. Full-health enemy bars are hidden to reduce crowd clutter. Signal Tyrant has angular shoulder plates, emissive crystals/core, phase-dependent plates/core and a thin slam warning ring matching the damage radius. Brute remains unimplemented.
- **V4 partial environment:** Reduced road saturation, curbs/crosswalks, convenience-store awning/display windows, vending displays, facade columns, broken-window detail, roof ducts, car roofs/seams, barricade cones, inexpensive puddle/glint geometry and warm lamp/pavement accents. These are stylized geometry, not real reflective puddles or dynamic light pools. Existing navigation footprints are preserved. Four building groups smoothly flatten when they occlude the camera-to-Rin sightline, then restore; their solid collision remains unchanged.
- **V5 partial effects:** Faceted emissive cyan EXP, emissive moving bullet visuals/impacts, pink knife arcs distinct from cyan pulse effects, upgraded selection icons/entrance transition, boss recovery core highlight. Fixed detached icon children accumulating when refreshing skill offers.
- **V6 packaging:** Rebuilt and inspected RPK. A coherent main menu/settings flow, final environment detail and production art are still outstanding; the full visual overhaul is not complete.

Primary files: ui/VisualTheme.ts, CombatHUD.ts, SkillSelectionUI.ts; player/CharacterVisual.ts, RinVisual.ts, PlayerController.ts, PlayerCombat.ts; levels/GeometryFactory.ts, ResidentialArena.ts; camera/IsometricCamera.ts; enemies/ZombieVisual.ts, SignalTyrant.ts; systems/ExperiencePickups.ts, CombatEffects.ts; core/GameBootstrap.ts, GameConfig.ts, CombatEncounter.ts. All are under assets/scripts. Main.scene's existing bootstrap instantiates the changes; the scene UUID and shader dependency are preserved.

## Executed validation

- Creator 3.8.8 web builds completed after V1, V2, V3, V4 and V5.
- TypeScript project check passed with the installed compiler: `tsc --noEmit --skipLibCheck`. Without skipLibCheck, bundled engine declaration files report unresolved internal/WebGPU types; no engine installation files were changed to suppress those diagnostics.
- Pure checks: test-m1 8, test-m2 8, test-roguelite 6 passed.
- V1: roguelite runtime 10, input 6, three viewport layouts and actual defeat/replay passed.
- V2: movement/camera/collision/multitouch/pause Preview regression and 8 boss/noise checks passed; 15-enemy visual fixture and six action poses rendered without runtime errors.
- V3: 8 boss/noise and 5 survival checks passed after enemy/boss art changes. Inspected actual rendered boss and horde screenshots.
- V4: building cutaway/recovery and unchanged obstacle-count assertions passed; all 5 survival checks passed.
- V5: all 10 progression/skill runtime checks and 6 mouse/keyboard/multitouch checks passed. HUD and actual skill cards checked at 1280×720, 1560×720 and 960×720; defeat/replay touch passed. Latest horde screenshot inspected with 15 enemies and six action poses exercised. This is visual assessment, not a timed human recognition study.
- Final full run through actual browser keyboard/touch input won at 158.77 simulation seconds, level 3, two selected upgrades, 38 kills including Signal Tyrant, with no health/EXP/timer/damage overrides. The initial attempt loaded the wrong localhost server and failed scene readiness; the explicit IPv4 rerun passed. Screenshot: temp/roguelite-playthrough.png.
- Final browser-m1 rerun passed keyboard movement, camera tracking, car collision, two-finger ownership/release, outside-base drag/cancel, pause/resume and all three fresh landscape sizes, with no uncaught runtime exceptions. The legacy in-place resize assertion failed at 960×720; the layout portion now explicitly tests fresh launches, consistent with the progression layout harness. In-place viewport resize/device rotation remains unresolved and is not represented as passing.
- Actual captured renders: temp/visual-before.png, temp/visual-horde.png, temp/roguelite-boss.png, temp/roguelite-layout-960.png (and 1280/1560 variants). These depict the game, not concept art.
- Initial sandboxed V4 build could not write Creator's required cache and exited; rerunning the authorized Creator build with required filesystem access succeeded. Creator packaging also reports cache/project-log permission warnings and a current-scene Preview warning; the explicit Main.scene build/make completed. Final browser tests use the generated Cocos web build. Physical Huawei runtime, Android performance and live device rotation remain untested.

The dedicated test server binds 127.0.0.1:7457. Creator may bind the IPv6 localhost address on the same port; use the explicit IPv4 URL to avoid accidentally loading the editor's empty current-scene Preview. The CDP connector now accepts both addresses and the full-run test asserts scene readiness.

## Package

`build/huawei-quick-game/dist/ReZONBI.rpk`: **2,541,705 bytes**, strictly below 20,000,000 bytes (5,223 bytes above the preceding roguelite build).

SHA-256: `8E1A0DD5E78657CE9D3CAD8CF3321720CF068AAC413FAC95E30D652FB867163C`.

Creator build/make log: temp/visual-rpk.log. Archived manifest: name Re:ZONBI; landscape; unchanged com.huawei.demo identifier. Archived settings launch db://assets/Main.scene. Archived main script contains CombatEncounter, SignalTyrant, RinVisual, twin-tail geometry, building facades and skill selection. Concept PNGs remain outside the game asset bundle. No generated build output was manually patched. Demo publication identity still needs deliberate developer-console configuration before release.

## Artist asset contract and remaining work

No suitable authored character models, rigs, textures or animation clips were present. Procedural models remain visibly simple and do not match the concept-sheet fidelity. The vector portrait is a placeholder.

For Rin, import an original/licensed rigged FBX into this project and create a prefab with a Cocos Animation/SkeletalAnimation component. Use feet at local origin, Y up, forward -Z, approximately 2 world units tall, in-place animation, and clips named idle, run, shoot, slash, dodge, hurt, die and victory. Loop idle/run; preserve the final die/victory pose. Suggested starting art budget: 8–12k triangles, 1×1024 atlas, at most 2 materials, up to 48 bones, compressed animation. Assign the prefab to Main.scene GameBootstrap's Rin Model field. The adapter crossfades clips over .12 seconds and leaves movement/collision on the existing Rin node. This import/rig path is prepared but has not been tested with a real artist asset; validate every clip and add authored muzzle/hit feedback before treating it as production-ready.

Next: authored Rin/enemy meshes and reusable prefabs, sharper face/hair silhouette, real material lighting treatment, billboard/store lettering, electrical poles/fences/trash/debris, richer boss arrival/results, main menu and functional settings. Do not expose unimplemented Story/Brute/future modes as playable. Profile draw calls and frame time on a real Huawei device before adding more mesh parts or lights. The existing pool limits remain 24 ordinary enemies, 64 EXP nodes and 32 transient combat effects.
