# M2: playable residential combat encounter

## Status

Implemented and verified in Cocos Creator 3.8.8 browser Preview and a generated web build. M2 is a five-enemy combat encounter, not Horde Survival or Story Mode. Physical Android/Huawei Quick Game execution and device performance remain unverified.

The existing project, Main.scene UUID, M1 arena, camera, joystick, Huawei identity and signing settings are preserved. No Git commit, push, reset, clean or staging operation was performed by the agent. Existing staged user work remains staged; M2 changes remain in the working tree.

## Controls and flow

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows | Existing left joystick |
| Pistol | Hold J or left mouse button over the world | Hold PISTOL |
| Knife | K | Tap KNIFE |
| Dodge | Space | Tap DODGE |
| Pause / resume | Escape | PAUSE / RESUME |
| Restart after victory or death | Click RESTART ENCOUNTER | Tap RESTART ENCOUNTER |

Launch `assets/Main.scene`: Rin and three Walkers/two Runners spawn. Defeat all five to show **AREA CLEARED**, or lose all health to show **RIN HAS FALLEN**. Restart reuses the encounter and resets health, movement, AI, enemies, cooldowns, effects, held inputs and pause state. A short controls guide appears for the first 14 active seconds of the session.

Mouse clicks on UI controls do not also shoot into the world. Each combat button owns its initiating touch ID. Releasing either movement or pistol leaves the other finger's action intact. Touch cancellation clears the corresponding action. Application hide pauses the encounter and clears inputs.

## Implemented systems

- **Damage:** common `DamageHit`/`Damageable` interface and bounded `HealthState`, with duplicate-event rejection, hit protection, invulnerability and death rejection. Player health is clamped to 0–400.
- **Pistol:** nearest live/active target within range and unobstructed XZ line of sight, repeat-fire cooldown, hitscan damage, facing assistance, recoil, muzzle flash, moving bullet visuals and impact feedback.
- **Knife:** directional range/arc check, obstacle blocking, one hit per enemy per slash, cooldown, arm animation and an expanding double-crescent slash sweep.
- **Dodge:** current input direction or facing fallback, collision-aware 3.5m burst, bounded invulnerability, cooldown display and cyan trail feedback. Uses the existing movement solver.
- **Enemies:** reusable `ZombieBase` component configured as Walker or Runner; separate silhouettes, speed/health differences, procedural movement/attack/hit/death feedback, and overhead health bars.
- **AI:** Idle, Investigate, Chase, Attack, Stunned, Dead. Attacks visibly wind up and recheck distance/line of sight at impact. Dead enemies cannot attack. A static 35×35 A* grid routes around obstacles with body clearance; path shortcuts are also clearance-tested. Enemies separate from each other and Rin, and stay within arena bounds.
- **Spawning:** five validated spawn positions, at least 4m from Rin, outside solid footprints. No unlimited spawning. Existing enemy nodes are reset for replay; dead nodes deactivate after their death animation.
- **HUD:** health bar/numbers, live enemy count, pistol/knife/dodge buttons, cooldown text, pause and result/restart panels. The M1 Canvas, safe-area layout and joystick are reused.
- **Effects:** 32 reusable effect nodes and shared meshes/materials. No downloaded art packs or physics dependencies. Material colours are cached by the existing geometry factory.

There was no suitable local shooting-audio asset, so M2 remains silent. The request made shooting sound conditional on an available suitable asset. Audio remains later work. Characters are original procedural blockout art, not finished anime models.

## Configuration

All combat defaults are in `assets/scripts/core/GameConfig.ts` (`CombatConfig`).

| Parameter | Value |
| --- | --- |
| Rin HP / hit protection | 400 / 0.35s |
| Pistol damage / interval / range | 24 / 0.25s / 12m |
| Knife damage / cooldown / range / arc | 40 / 0.6s / 3.2m / 145° |
| Dodge distance / duration / cooldown / invulnerability | 3.5m / 0.25s / 3s / 0.25s |
| Walker HP / speed / damage | 80 / 2m/s / 15 |
| Walker range / recovery / detection / wind-up | 1.4m / 1.5s / 8m / 0.38s |
| Runner HP / speed / damage | 50 / 3.8m/s / 10 |
| Runner range / recovery / detection / wind-up | 1.3m / 0.9s / 11m / 0.25s |
| Enemy radius / repath interval / cap | 0.34m / 0.5s / 5 |

Enemy attack recovery begins after the impact attempt. A dodged or out-of-range attack still incurs recovery. Timers use simulation delta time and freeze on pause. Very long resume/frame gaps retain M1's 0.1-second cap.

## Scene connections and files

The existing serialized `GameBootstrap` and its standard-effect reference remain on `Main.scene`. Bootstrap now creates an active **Combat Encounter** child node and attaches/initializes `CombatEncounter` there. Cocos does not allow dynamically adding components directly to a Scene root. Rin receives `PlayerHealth` and `PlayerCombat`; **Infected** and **Combat Effects** are children of the encounter node. `CombatHUD` extends the existing Mobile Canvas. No additional manual scene wiring is required.

Added gameplay source, with imported `.meta` files:

- `core/CombatEncounter.ts`
- `player/PlayerHealth.ts`, `player/PlayerCombat.ts`
- `enemies/ZombieBase.ts`, `enemies/ZombieVisual.ts`, `enemies/ZombieSpawner.ts`
- `systems/DamageSystem.ts`, `systems/CombatMath.ts`, `systems/ArenaNavigation.ts`, `systems/CombatEffects.ts`
- `ui/CombatHUD.ts`

Modified M1 source:

- `core/GameBootstrap.ts`: instantiate and connect the encounter.
- `core/GameConfig.ts`: centralized combat tuning.
- `player/PlayerController.ts`: add dodge, facing lock, death and restart hooks while retaining M1 movement/collision.
- `player/RinVisual.ts`: recoil, slash, dodge, hurt and death transforms, flash materials and muzzle flash.
- `levels/GeometryFactory.ts`: expose cached materials for shared effects/flash feedback.
- `ui/ExplorationHUD.ts`: export existing UI helpers for reuse. Joystick implementation is unchanged.

Added developer tests: `tools/test-m2.cjs`, `tools/cdp-client.cjs`, `tools/browser-m2.cjs`, `tools/browser-m2-input.cjs`. These are outside `assets/` and are not packaged.

## Executed tests

| Check | Result |
| --- | --- |
| TypeScript against installed Cocos 3.8.8 declarations | Pass |
| Existing M1 logic checks | 8 passed |
| M2 health, targeting, LOS, knife arc, invulnerability, navigation, enemy health scaling and tuning checks | 10 passed |
| Full M2 browser tests in generated web build | 31 passed |
| Full M2 browser tests in Cocos Creator Preview (`localhost:7456`) | 29 passed |
| Original M1 runtime regression in Creator Preview | Passed: movement, camera, collision, multitouch, drag/cancel, pause and HUD |
| Additional mouse/keyboard/touch input checks in Preview | 6 passed |
| Final browser console errors / uncaught exceptions during test runs | None |

Component-level runtime checks use deterministic actor positions and simulation steps for edge cases: target priority, wall blocking, knife arc/range, dodge distance/protection/collision, attack wind-up misses, dead-enemy rejection, investigation/stun, routing around a house, pause and reset. They exercise the actual Cocos components, not mock gameplay code.

End-to-end runs use real browser input: hold J to defeat all five default enemies; replay; allow all five to attack a full-health 400 HP Rin until defeat; restart through the result UI. Touch tests cover movement plus hold-fire, releasing either finger independently, knife/dodge buttons and cancellation. Extra checks cover LMB hold/release, UI click isolation, K/Space, and Escape key-repeat handling.

The web build checks 1280×720, 1560×720 and 960×720 HUD bounds. Creator Preview checks its default canvas size because its toolbar can lock Design Resolution. Screenshots were inspected and saved under ignored `temp/`: `m2-combat.png`, `m2-victory.png`, `m2-defeat.png`.

Reproduce:

```powershell
node 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\app.asar.unpacked\node_modules\typescript\lib\tsc.js' --noEmit --skipLibCheck --pretty false
node tools/test-m1.cjs
node tools/test-m2.cjs
# Dedicated Chrome with remote debugging on 9333 and Preview running:
node tools/browser-m2.cjs http://localhost:7456
node tools/browser-m2-input.cjs
# Generated web build, served by tools/serve-check.cjs:
node tools/browser-m2.cjs
```

The initial runtime test found and fixed an invalid dynamic Scene-root component attachment. A CDP scenario also distinguishes the finger being lifted from the remaining touch; the final input tests pass with that distinction.

## Huawei build verification

- Artifact: `build/huawei-quick-game/dist/ReZONBI.rpk`.
- Actual size: **2,527,328 bytes** (under 20,000,000; 10,588 bytes above M1).
- SHA-256: `A3CD6537074F8AEC673992D93B4FC003F4030934FB06333287467B4F947DAC90`.
- Creator build and make succeeded; log: `temp/m2-rpk-stdout.log`.
- Manifest read from inside the RPK: **landscape**, identity **com.huawei.demo** unchanged.
- Packaged launch scene: **db://assets/Main.scene**, matching source UUID `bc8d6866-974f-49c3-a0ce-0380d5971153`.
- Packaged main script contains registrations for `CombatEncounter`, `PlayerCombat`, `PlayerHealth` and `ZombieBase`. The scene's standard-effect dependency remains included.
- No generated build output was manually edited. Existing `build-config/huawei-quick-game.json` was used unchanged.

Use the exact build command in [M1-HANDOFF.md](M1-HANDOFF.md). RPK packaging is verified; execution on a Huawei device is not.

## Known limitations and remaining checks

No known blocking bug remains in the tested M2 scenarios. Physical-device multitouch, safe areas/notches, OS interruptions, Huawei runtime compatibility, mobile frame rate and thermals require device testing. Browser touch emulation is not physical-device validation. The scene still uses blockout models and simple effects; no final-art or publication-readiness claim is made.

Navigation and line of sight intentionally use the arena's static axis-aligned XZ footprints. Future rotating/moving obstacles, slopes or new narrow passages need corresponding navigation/collision updates. Pistol bullets are cosmetic and travel to the resolved shot endpoint; gameplay damage is still resolved immediately by the tested hitscan/LOS path. Global player hit protection intentionally prevents several simultaneous enemy impacts from stacking instantly.

## M3 integration points

- Emit noise events at successful `PlayerCombat.shoot()` / `knife()` action activation; both know the origin and source category.
- Call `ZombieBase.investigate(position)` for heard noise. It does not override an active chase, attack, stun or death.
- `ZombieBase.stun(duration)` is available for later grenade/ability work.
- `DamageHit` carries source, kind and unique ID for future upgrades/ability rules.
- `CombatEncounter` owns pause, reset, simulation timing, effects and enemy access. Extend the spawner with capped reinforcement logic here.
- Add the noise meter to the existing safe-area Canvas. Preserve the separate touch ownership already tested.

No global noise pressure, reinforcement spawning, Horde waves, story progression or Huawei services are implemented in M2.
