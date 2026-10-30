# Re:ZONBI development checklist

> Submission update, 30 October 2026: see [current readiness](submission/READINESS.md), [user guide](submission/USER-GUIDE.md), [pitch script](submission/PITCH-SCRIPT.md), and [credits register](submission/CREDITS.md). The older status below is historical: menus, settings, audio, local saves, localization, and personal bests now exist. HMS is out of scope by entrant decision. The fresh RPK is 72,860,624 bytes; the old size figures below do not describe the current package. Physical-device verification remains pending.

## Current playable — roguelite vertical slice, 2026-10-19

The user's roguelite direction supersedes the five-enemy M2 encounter and planned five-wave upgrade loop. The existing Main.scene now launches endless Horde Survival: active combat, pooled EXP drops, leveling, three-choice upgrades, six functioning skills, increasing spawn pressure, local hearing/global noise, and a two-phase Signal Tyrant after 120 active seconds. Defeating the boss does not end the run; only Rin's death ends it, and replay resets all run state.

A complete browser-input playthrough reached level 7, chose six upgrades, defeated the Signal Tyrant, and continued surviving the horde afterward. No health/EXP/timer/damage overrides were used in that playthrough. Separate deterministic runtime fixtures cover edge cases. Art remains procedural blockout; physical Huawei/Android testing is pending.

Current rebuilt RPK after the visual pass: **2,541,705 bytes**, `build/huawei-quick-game/dist/ReZONBI.rpk`. Archived manifest verified: display name **Re:ZONBI**, landscape, unchanged **com.huawei.demo** identifier; launch scene **db://assets/Main.scene**. SHA-256: `8E1A0DD5E78657CE9D3CAD8CF3321720CF068AAC413FAC95E30D652FB867163C`.

Visual pass: circular icon HUD, dimmed skill cards, closer camera, silver-pink twin-tail Rin silhouette and ground ring, differentiated enemies, crystalline boss plates/core, crosswalks/storefront details and camera-aware building cutaways are connected to the existing scene. Faceted EXP and pink knife effects retain the gameplay pools. All five newly supplied visual references are now copied into docs/reference and inspected. The original vector portrait and procedural models are interim art; the full visual overhaul, production character assets, main menu/settings and physical-device verification remain unfinished. See [VISUAL-HANDOFF.md](VISUAL-HANDOFF.md) for changed files, actual rendered screenshots, tests, artist prefab contract and remaining work.

See [ROGUELITE-HANDOFF.md](ROGUELITE-HANDOFF.md) for current systems, six skill effects, executed tests, source build hook, limitations and next tasks. The M1/M2 sections below are historical records.

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
- [x] M2: Pistol/knife, collision-aware dodge, player health/death, Walker/Runner AI, safe five-enemy spawning, combat HUD, hit/death effects, victory/defeat and replay implemented. Verified in Creator Preview and the web build; landscape RPK rebuilt at 2,527,328 bytes. Physical Huawei testing remains pending.
- [x] M3: Local hearing, decaying noise pressure, capped reinforcement cadence and HUD implemented; quiet/loud runtime behavior checked. Physical-device validation pending.
- [ ] M4: Continuous roguelite Horde loop, EXP, six skills, results and replay implemented and tested, replacing the earlier five-wave plan. Mode menu and validated persistent saves remain unimplemented.
- [x] M5: Two-phase Signal Tyrant, locked telegraphs, charge, slam, summons, recovery vulnerability and boss HUD implemented; tested through actual boss victory. Physical-device validation pending.
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
- M1 functionality remains intact under the M2 runtime regression checks below.

See [M1-HANDOFF.md](M1-HANDOFF.md) for file roles, runtime hierarchy, exact build commands, controls and remaining manual checks.

## M2 verification and handoff

- Existing movement, camera, arena collision, safe-area Canvas and joystick are retained. The joystick source was not changed for M2.
- Added shared damage/health, line-of-sight targeting, pistol/knife, dodge, two enemy variants, navigation, effects, combat UI and complete encounter restart.
- Three Walkers and two Runners spawn safely. A full input-driven run defeated all five; a separate full-health run reached defeat through actual enemy attacks. Both result-screen restarts passed.
- TypeScript passed; 8 M1 logic checks and 8 M2 logic checks passed.
- M2 runtime tests: 31 passed in the fullscreen web build and 29 in Creator Preview. Six additional mouse/keyboard/touch checks passed. The original M1 runtime regression also passed in Preview.
- Tested simultaneous movement/fire, independent finger releases, cancellation, LMB hold-fire, UI click isolation, keyboard K/Space, Escape repeat protection, attack range/wind-ups, wall blocking, damage/death, dodge protection and collision, enemy navigation, pause and reset.
- No console errors or uncaught exceptions appeared in the final test runs. Initial invalid dynamic Scene-root component attachment was fixed by creating the Combat Encounter child node.
- The RPK archive itself was checked: landscape, existing com.huawei.demo identity, db://assets/Main.scene entry, and registered combat/player-health/enemy components. Size is below the strict 20,000,000-byte limit.
- No suitable local firing audio asset was available; M2 is silent. Art remains procedural blockout. Physical Huawei runtime and Android device testing are still pending.
- Next milestone: M3 local hearing, noise pressure and capped reinforcements. `ZombieBase.investigate(position)` and `stun(duration)` are available; no full noise system is implemented yet.

See [M2-HANDOFF.md](M2-HANDOFF.md) for controls, tunable values, file changes, executed tests, build hash and M3 integration points.

## Build-size log

| Date | Artifact | Bytes | Status |
| --- | --- | ---: | --- |
| 2026-10-18 | Existing empty-project ReZONBI.rpk | 2,403,557 | Measured on disk; not rebuilt or runtime-tested |
| 2026-10-18 | Initial M1 build | 2,411,548 | Superseded: runtime test exposed a missing shader dependency |
| 2026-10-18 | Corrected M1 ReZONBI.rpk | 2,516,740 | Creator build/make succeeded; archived manifest says landscape; Huawei runtime test pending |
| 2026-10-18 | M2 ReZONBI.rpk | 2,527,328 | Creator build/make succeeded; archive launch scene, landscape and combat scripts checked; Huawei runtime test pending |
| 2026-10-19 | Roguelite ReZONBI.rpk | 2,536,482 | Creator build/make succeeded; archived display name, landscape, entry scene and gameplay scripts checked; Huawei runtime test pending |
| 2026-10-19 | Visual pass ReZONBI.rpk | 2,541,705 | Creator build/make succeeded; archived name, landscape, entry scene and visual/gameplay scripts checked; Huawei runtime test pending |

Historical M2 artifact measurement: 2,527,328 bytes. SHA-256: `A3CD6537074F8AEC673992D93B4FC003F4030934FB06333287467B4F947DAC90`. It is superseded on disk by the current roguelite artifact above.

Measured M2 archive-entry totals, grouped by actual paths:

| Category | Uncompressed bytes | Compressed bytes |
| --- | ---: | ---: |
| Engine (`cocos-js/`) | 4,319,533 | 1,306,346 |
| Game scripts (`assets/main/index.js`) | 51,947 | 19,041 |
| Textures and icon (PNG entries) | 893,455 | 890,029 |
| Scene and internal resources (remaining `assets/`) | 1,253,966 | 217,721 |
| Runtime and other | 275,882 | 83,457 |
| Archive/signing overhead | — | 10,734 |

Procedural models/UI are included in scripts and generated at runtime; no separate model/audio assets were added. The concept board is outside `assets/` and is not packaged. Generated build files were produced only by Cocos, not manually edited.
