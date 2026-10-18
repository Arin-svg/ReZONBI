# Re:ZONBI development checklist

## Verified baseline — 2026-10-18

- Project: existing Cocos Creator project, version 3.8.8 in package.json.
- Main scene: assets/Main.scene; scene UUID bc8d6866-974f-49c3-a0ce-0380d5971153.
- Local generated TypeScript declarations reference the installed Creator 3.8.8 engine.
- package.json declares no additional dependencies.
- Existing artifact: build/huawei-quick-game/dist/ReZONBI.rpk.
- Existing artifact size: 2,403,557 bytes (2.403557 MB / approximately 2.29 MiB).
- The original empty artifact was found on disk; a new M1 RPK has now been generated with Cocos Creator (see build log below).
- Landscape is now set in the source Huawei build profile and portable build configuration. Both the generated manifest and the manifest inside the final RPK were checked: landscape.
- Existing generated manifest uses com.huawei.demo. Publication identity needs review before release.
- Existing work and repository history were preserved. No agent commits or pushes were made.
- The supplied concept board is now present at docs/reference/Re_ZONBI_Mobile_Game_Concept_Board.png and was inspected. The M1 blockout follows its isometric streets, dark palette, Rin silhouette and left joystick; it is not finished anime artwork.

## Implementation plan and gates

- [x] M0: Reference inspected, project/engine/entry-scene/dependencies verified, existing Huawei settings preserved, landscape changed in source, and an actual updated RPK generated and measured. The earlier empty-project artifact remains the historical size baseline.
- [x] M1: Residential arena, replaceable procedural Rin, keyboard/joystick movement, static collision, smooth orthographic camera, and responsive exploration HUD connected through Main.scene. Runtime interactions passed in Cocos Creator Preview and the generated web build. Physical Android/Huawei verification remains outstanding; this checkmark does not certify device readiness.
- [ ] M2: Add pistol targeting and line of sight, knife, health, Walker/Runner AI, and hit feedback. Verify damage, death, and attack cooldowns.
- [ ] M3: Add local hearing, investigation, decaying global noise, capped reinforcements, and noise HUD. Compare quiet and loud encounters.
- [ ] M4: Complete five-wave Horde flow, upgrades, results, and validated local saves. Play from menu through victory and defeat.
- [ ] M5: Add the Signal Tyrant with two phases, fair telegraphs, recovery, and boss HUD. Verify both phases and defeat.
- [ ] M6: Connect four reusable city areas through the transmitter, ambush, tower, and story completion objectives.
- [ ] M7: Verify actual Huawei Quick Game API support before implementing a service. Record credential/runtime prerequisites and actual integration results.
- [ ] M8: Refine art against the concept board, procedural animations, audio, UI, effects, and performance.
- [ ] M9: Rebuild RPK, measure actual package contents and total size, and test in a compatible Huawei runtime. Require less than 20,000,000 bytes; target at most 18,000,000 bytes.

## M1 verification and handoff

- TypeScript checking passed against the installed Cocos Creator 3.8.8 declarations.
- Eight automated checks passed: joystick math, normalized camera-relative movement, thin-wall tunnelling prevention, wall sliding, arena bounds, frame-rate consistency, serialized scene references and Huawei source settings.
- Cocos Creator Preview at localhost:7456 passed actual browser keyboard events, camera tracking, car collision, two-finger joystick ownership, release/recenter, drag beyond the joystick base, touch cancellation and pause/resume. No uncaught exceptions or console errors occurred in the final run.
- The generated fullscreen web build additionally passed HUD-bound checks at 1280x720, 1560x720 and 960x720. Creator Preview's toolbar can lock Design Resolution, so aspect-ratio checks use the web build.
- Runtime testing found and fixed two issues: a stripped standard shader (fixed with a serialized effect reference), and joystick moves being swallowed before global input listeners (fixed with node-captured touch listeners).
- Shared mesh/material instancing reduced the observed desktop draw count from about 154 to 35 in the starting view. This is not a mobile performance measurement.
- Physical Android multitouch, notches, interruption handling, Huawei runtime installation and device performance still need testing. No Huawei service integration or publication-readiness claim is made.
- M2 has not started. Next: pistol/knife combat, health and one Walker encounter, then Runner AI.

See [M1-HANDOFF.md](M1-HANDOFF.md) for file roles, runtime hierarchy, exact build commands, controls and remaining manual checks.

## Build-size log

| Date | Artifact | Bytes | Status |
| --- | --- | ---: | --- |
| 2026-10-18 | Existing empty-project ReZONBI.rpk | 2,403,557 | Measured on disk; not rebuilt or runtime-tested |
| 2026-10-18 | Initial M1 build | 2,411,548 | Superseded: runtime test exposed a missing shader dependency |
| 2026-10-18 | Corrected M1 ReZONBI.rpk | 2,516,740 | Creator build/make succeeded; archived manifest says landscape; Huawei runtime test pending |

Final M1 artifact: `build/huawei-quick-game/dist/ReZONBI.rpk` (2.52 MB decimal; below 20,000,000 bytes).

Measured archive-entry totals, grouped by actual paths:

| Category | Uncompressed bytes | Compressed bytes |
| --- | ---: | ---: |
| Engine (`cocos-js/`) | 4,319,533 | 1,306,346 |
| Game scripts (`assets/main/index.js`) | 20,298 | 8,453 |
| Textures and icon (PNG entries) | 893,455 | 890,029 |
| Scene and internal resources (remaining `assets/`) | 1,253,966 | 217,721 |
| Runtime and other | 275,882 | 83,457 |
| Archive/signing overhead | — | 10,734 |

Procedural models/UI are included in scripts and generated at runtime; no separate model/audio assets were added. The concept board is outside `assets/` and is not packaged. Generated build files were produced only by Cocos, not manually edited.
