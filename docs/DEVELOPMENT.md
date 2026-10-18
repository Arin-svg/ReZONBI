# Re:ZONBI development checklist

## Verified baseline — 2026-10-18

- Project: existing Cocos Creator project, version 3.8.8 in package.json.
- Main scene: assets/Main.scene; scene UUID bc8d6866-974f-49c3-a0ce-0380d5971153.
- Local generated TypeScript declarations reference the installed Creator 3.8.8 engine.
- package.json declares no additional dependencies.
- Existing artifact: build/huawei-quick-game/dist/ReZONBI.rpk.
- Existing artifact size: 2,403,557 bytes (2.403557 MB / approximately 2.29 MiB).
- This artifact was found on disk, not rebuilt or runtime-tested during this inspection.
- Existing generated Huawei manifest specifies portrait orientation. Landscape must be set in the source build configuration and verified on the next build; do not patch generated output.
- Existing generated manifest uses com.huawei.demo. Publication identity needs review before release.
- Existing files are untracked in Git; preserve them without resets or cleanup.
- Required docs/reference/Re_ZONBI_Mobile_Game_Concept_Board.png is missing. No concept-named file was found under C:/GameProjects/RE_ZONBI.

## Implementation plan and gates

- [ ] M0: Inspect the supplied concept board; verify source Huawei build settings and reproduce a baseline build. Project and existing artifact inspection are complete, but M0 is not fully verified.
- [ ] M1: Implement a real XZ-plane 3D residential arena, replaceable procedural Rin representation, orthographic tracking camera, collision, keyboard movement, and multitouch joystick. Connect the bootstrap component to Main.scene. Verify movement, obstacle collision, camera-relative directions, and landscape layouts before progressing.
- [ ] M2: Add pistol targeting and line of sight, knife, health, Walker/Runner AI, and hit feedback. Verify damage, death, and attack cooldowns.
- [ ] M3: Add local hearing, investigation, decaying global noise, capped reinforcements, and noise HUD. Compare quiet and loud encounters.
- [ ] M4: Complete five-wave Horde flow, upgrades, results, and validated local saves. Play from menu through victory and defeat.
- [ ] M5: Add the Signal Tyrant with two phases, fair telegraphs, recovery, and boss HUD. Verify both phases and defeat.
- [ ] M6: Connect four reusable city areas through the transmitter, ambush, tower, and story completion objectives.
- [ ] M7: Verify actual Huawei Quick Game API support before implementing a service. Record credential/runtime prerequisites and actual integration results.
- [ ] M8: Refine art against the concept board, procedural animations, audio, UI, effects, and performance.
- [ ] M9: Rebuild RPK, measure actual package contents and total size, and test in a compatible Huawei runtime. Require less than 20,000,000 bytes; target at most 18,000,000 bytes.

## Current blocker

The specification requires inspecting the concept board before implementation. Supply that image at its specified path or attach it in chat. No gameplay implementation or preview is claimed yet.

## Build-size log

| Date | Artifact | Bytes | Status |
| --- | --- | ---: | --- |
| 2026-10-18 | Existing empty-project ReZONBI.rpk | 2,403,557 | Measured on disk; not rebuilt or runtime-tested |

Per-category packaged sizes remain unmeasured. No publication-readiness claim is made.
