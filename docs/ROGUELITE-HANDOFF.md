# Re:ZONBI roguelite handoff — 2026-10-19

## Play the existing project

Open `assets/Main.scene` in Cocos Creator 3.8.8 and launch Preview. The existing serialized `GameBootstrap` creates the residential arena, Rin, camera, safe-area Canvas and `CombatEncounter`. No replacement project or scene is required.

The active encounter now runs Horde Survival: fight, collect cyan EXP crystals, choose upgrades, survive 120 simulation seconds, then defeat Signal Tyrant. Timer advancement stops during pause and skill selection. Killing ordinary enemies no longer ends the run. Boss death gives victory; Rin's death gives defeat. The result button resets the complete run.

Controls: WASD/arrows or the existing joystick to move; hold J, left mouse over the world, or PISTOL to shoot; K/KNIFE to slash; Space/DODGE to dodge; Escape/PAUSE to pause. Touch a skill card to apply it. Movement and fire retain separate finger ownership. Automatic skills need no extra combat buttons.

## Implemented systems

- Existing M1 movement/collision/camera/joystick and M2 active combat retained.
- A 64-node crystal pool. Death drops EXP once. Collection removes the value before awarding it; a full pool aggregates into its nearest crystal without losing EXP. Attraction respects obstacle line of sight. No physics pickup bodies.
- Level 1 start; thresholds `20 + 12*(level-1) + 4*(level-1)^2`; excess EXP carries over. Multiple pending upgrades are chosen in sequence. Invalid and maxed choices are excluded; when all six skills are maxed, selection is skipped without freezing the run.
- Three randomized skill cards with category, current/next rank, and actual next-rank effect. Full-screen input blocking and cleared held inputs keep combat frozen until selection completes.
- Capped, pooled continuous Walkers/Runners. Spawn candidates clear obstacles, are 7–15m from Rin, avoid occupied positions and require a navigation route. At most 24 ordinary infected nodes, plus one boss. Dead nodes finish their animation before recycling.
- Pressure phases every 30 seconds: intervals 4/3/2/1.4/1.2 seconds, increasing Runner probability and HP/damage. Ordinary spawning stops at the boss unless noise is high; phase-two summons use the same cap.
- Noise pressure: pistol +8, knife +1, dodge +0.5, pulse +12; decay 5/sec. Local sounds send nearby idle/investigating enemies toward their origin. Runners hear farther. Pressure >=60 reduces spawn interval to 65%; noise cannot bypass the population cap.
- Signal Tyrant: arrival grace, large original procedural silhouette, pulsing red core, health bar, two phases, locked slam/charge warnings, obstacle-aware movement, once-per-charge damage, capped summons, and 1.5x received damage during recovery. Below half HP, warning/recovery timing accelerates. Boss stun immunity preserves predictable telegraphs.
- Pooled floating damage/healing/EXP text, crystal attraction/rotation, upgrade-panel entrance animation, recoil/slash/trail/hit/death feedback, and restrained neon building trim.

## Six skills

All have five ranks. Skill definitions and prerequisite support live in `Progression.ts`; no evolution is advertised or implemented.

| Skill | Actual effect |
| --- | --- |
| Bullet Storm | Rank 1 adds one assisted hitscan projectile; rank 2 gives volley damage +25%; rank 3 adds two projectiles; rank 4 reduces fire interval 20%; rank 5 extends extra-target range 4m. Each projectile checks live targets and LOS, prefers distinct targets, and can focus a remaining target. |
| Blade Cyclone | 1/2/2/3/3 orbiting blades; damage `12+6*rank`; per-target 0.5s hit cooldown and LOS. |
| Shadow Dash | Cooldown `3-0.3*rank`, distance `3.5+0.2*rank`, protection `0.25+0.02*rank` seconds. At rank 3+, delayed afterimage deals `20+8*rank` damage in 1.8m, with LOS. |
| Electric Pulse | Every `6-0.5*rank` seconds: `20+10*rank` damage, radius `2.5+0.35*rank`, 0.25s ordinary-enemy stun, LOS and visible ring. |
| Bloodlust | Heals `3*rank` HP per Rin-attributed ordinary enemy kill, capped at max HP. Dead players cannot be healed. |
| Zombie Magnet | Attraction radius `3+1.2*rank`; pickup radius `0.7+0.15*rank`. |

Tuning: `GameConfig.ts` retains `CombatConfig` and adds `SurvivalConfig`. Boss health is 1800 in `SignalTyrant.ts`; slam/charge damage is 50/40. The run is a short vertical slice, not final difficulty balancing.

## Files

Added: `systems/Progression.ts`, `ExperiencePickups.ts`, `SkillEffects.ts`, `NoiseSystem.ts`; `enemies/SignalTyrant.ts`; `ui/SkillSelectionUI.ts`, `DamageNumbers.ts`, with Creator metadata. Extended `CombatEncounter`, `GameConfig`, `PlayerCombat`, `DamageSystem`, `ZombieBase`, `ZombieSpawner`, `CombatHUD`, and `ResidentialArena`. Main.scene's existing connection remains intact. The reference is saved outside packaged assets as `docs/reference/ReZONBI_Roguelite_Concept.png`.

Added development tests: `tools/test-roguelite.cjs`, `browser-roguelite.cjs`, `browser-survival.cjs`, `browser-boss.cjs`, `browser-playthrough.cjs`, and `browser-roguelite-layout.cjs`.

`extensions/rezonbi-build` is an editor-only TypeScript build extension, compiled by `node tools/compile-build-extension.cjs` with Creator's bundled compiler. Its before-make hook sets the manifest's display name to **Re:ZONBI**, preserving the **ReZONBI.rpk** filesystem basename and **com.huawei.demo** package identity. It uses the [documented Creator build-extension lifecycle](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/custom-build-plugin.html). No engine installation files or generated outputs are manually patched.

## Verification record

Browser tests use an isolated Chrome CDP instance, actual Cocos components, and emulated touch. Deterministic edge tests intentionally position actors and step simulation; the separate playthrough uses real browser input without changing health, EXP, timer, or damage.

Executed successfully:

- TypeScript check against installed Creator 3.8.8 declarations: passed.
- `test-m1.cjs`: 8 passed; `test-m2.cjs`: 8 passed; `test-roguelite.cjs`: 6 passed (thresholds/excess EXP, invalid inputs, valid unique cards, maxed catalogue, reset and rank descriptions).
- `browser-roguelite.cjs`: 10 passed in the generated web build and Creator Preview (death drops, aggregation/collection, multi-level pause/resume, six skill effects and actual card touch).
- `browser-survival.cjs`: 5 passed in web and Preview (safe/capped spawning, recycling, escalation, paused clock, defeat/reset).
- `browser-boss.cjs`: 8 passed in web and Preview (quiet/loud hearing, pressure cadence/cap, timed boss arrival, slam escape/hit, recovery vulnerability, charge warning/one hit, phase-two summons, pause/death/victory/reset).
- Original `browser-m1.cjs http://localhost:7456`: passed keyboard movement, camera tracking, runtime car collision, two-finger ownership, release/cancel, pause/resume, HUD bounds and error check.
- `browser-m2-input.cjs http://localhost:7456`: 6 passed, including mouse UI isolation, K/Space/Escape, independent movement/fire release and cancellation. The harness now loads a fresh viewport before testing and waits for simulation frames instead of assuming a fixed rendering speed.
- `browser-roguelite-layout.cjs`: fresh landscape launches at 1280x720, 1560x720 and 960x720 passed HUD bounds and visual overlay inspection; actual defeat replay touch passed. The test waits for Cocos loading and uses projected UI bounds.
- `browser-playthrough.cjs`: complete input-driven victory at **155.8 simulation seconds**, **level 7**, **six chosen upgrades**, **87 kills including Signal Tyrant**. Rin took damage and finished at 400 HP with Bloodlust. All EXP/upgrades came from gameplay. Screenshot: `temp/roguelite-playthrough.png`.
- Final successful runtime suites reported no uncaught exceptions or browser console errors. Asset metadata check and `git diff --check` passed.

The test harness initially failed when loading during an in-progress web build, before Cocos scene readiness, and after changing emulated viewport dimensions without reloading. Those failures are not counted as passing runs. Final layout/input checks use fresh launches at each size. Live viewport-change behavior still needs an independent device/runtime check.

## Rebuilt Huawei artifact

- `build/huawei-quick-game/dist/ReZONBI.rpk`: **2,536,482 bytes**, below 20,000,000 bytes; 9,154 bytes above M2.
- SHA-256: `5525DC637843FF0C2A656E91B8F8DAFCA71FD7A69D9EAA038753EC1673413380`.
- Creator build and make succeeded (`temp/rogue-rpk.log`); the source extension's before-make hook executed successfully.
- Manifest read inside the archive: display name **Re:ZONBI**, orientation **landscape**, identifier **com.huawei.demo** unchanged.
- Packaged settings: Creator **3.8.8**, launch scene **db://assets/Main.scene**. Main script is 77,871 uncompressed bytes and contains the encounter, boss, progression/skill definitions and selection UI. Required new TypeScript metadata is present.
- Reproduce with the existing `build-config/huawei-quick-game.json` command in M1-HANDOFF. Compile the small source extension first if editing it: `node tools/compile-build-extension.cjs`.
- This verifies packaging, not installation or execution on a physical Huawei device.

## Limits and next work

Physical Android/Huawei Quick Game execution, notches, OS interruptions, device frame rate, thermals, and sustained memory use remain unverified. The procedural art is a blockout, not equivalent to the supplied anime illustration. Audio remains absent. No Brute, evolutions, additional skills, persistent progression, mode menu, four-area Story Mode, Mutation Hunt, Infection Arena, or Huawei services are claimed.

The navigation grid assumes the existing static axis-aligned arena. Dynamic or rotated obstacles require navigation/collision changes. The pool can reuse an available enemy of the other kind when full, preserving the hard node cap; late-run proportions are therefore approximate.

Next: physical Huawei installation/performance pass, run-balance playtesting, audio, original character replacements, and saved progression/menu flow. Review the existing demo identifier and debug signing before publication.
