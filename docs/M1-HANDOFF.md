# M1: residential exploration

## Run

Open this existing project in **Cocos Creator 3.8.8**, let asset import finish, and open `assets/Main.scene` from disk. If Creator was open while external changes were made, reload the scene before previewing; its in-memory copy may still be the empty baseline. Use the browser preview or the web validation build below.

- **WASD / arrow keys:** camera-relative movement.
- **Left joystick:** analog movement; only the initiating finger owns the stick.
- **Pause / Resume:** freezes movement and clears held inputs.
- Collision covers houses, garden walls, planters, cars, barricades, lamp posts and arena limits. Pavement is decorative and traversable.
- No combat buttons are shown in M1 because combat is not implemented yet.

## Connected scene and source

`assets/Main.scene` keeps the original scene UUID and main camera/light. Its enabled `GameBootstrap` component has a serialized standard-effect dependency, which is essential for build-time shader inclusion. It creates:

```
Main (GameBootstrap + surfaceEffect reference)
  Main Light
  Main Camera (Camera + IsometricCamera)
  Residential Arena (shared procedural geometry)
  Rin (PlayerController)
    VisualRoot (RinVisual procedural model and limb pivots)
    AttackOrigin
    CameraTarget
    EffectsRoot
  Mobile Canvas (Canvas + Widget)
    UI Camera
    Safe area (SafeArea + Widget)
      Area heading
      Movement hint
      Movement joystick (MobileJoystick)
        Thumb
      Pause button
      Paused hint
```

The arena and character nodes are constructed at runtime, rather than duplicated in static scene serialization. There are no unused gameplay prefabs. Replace `RinVisual` with a rigged model adapter while retaining the `PlayerController` and `animate(dt, movementAmount)` contract. Current art is an original procedural blockout, not a finished anime character.

Source modules:

- `core/GameBootstrap.ts`: creates and connects the runtime graph.
- `core/GameConfig.ts`: movement, camera, joystick and palette tuning.
- `core/MovementMath.ts`: input normalization and deterministic collision helpers.
- `levels/GeometryFactory.ts`: shared meshes and materials, with GPU instancing.
- `levels/ResidentialArena.ts`: visible city geometry and matching collision footprints.
- `player/PlayerController.ts`: keyboard/touch movement, facing and lifecycle cleanup.
- `player/RinVisual.ts`: replaceable character geometry and procedural running motion.
- `camera/IsometricCamera.ts`: bounded, smoothed orthographic following.
- `ui/MobileJoystick.ts`: finger ownership, dead zone, cancel/release/hide reset.
- `ui/ExplorationHUD.ts`: responsive safe-area HUD and pause interaction.

Collision uses a lightweight circle-versus-static-AABB solver with small swept steps and wall sliding. It is appropriate for this flat, static arena; slopes, moving rigid bodies and arbitrary rotated obstacles would need an expanded solver or engine physics. Ordinary frame deltas are integrated at up to 1/120-second substeps; long background/resume gaps are intentionally capped at 0.1 seconds.

## Reproduce builds

`build-config/huawei-quick-game.json` preserves the existing package identity, debug signing, engine selection, scene UUID, output path and version settings, with landscape orientation. `profiles/v2/packages/huawei-quick-game.json` also has landscape set for the existing local task. Profiles are ignored by Git, so the portable JSON build configuration is the reproducible source of truth.

From PowerShell in the project folder:

```powershell
$env:ELECTRON_RUN_AS_NODE = $null
& 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe' --project 'C:\GameProjects\RE_ZONBI\ReZONBI' --build 'configPath=C:\GameProjects\RE_ZONBI\ReZONBI\build-config\huawei-quick-game.json'
```

Use `build-config/web-check.json` instead for a separate web validation build. Its fullscreen wrapper is authored in `build-templates/web-desktop/index.ejs`; no generated HTML is manually patched. Run `node tools/serve-check.cjs`, then open `http://localhost:7457`.

These commands use [Cocos Creator's documented command-line build workflow](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-in-command-line.html).

## Checks

```powershell
node 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\app.asar.unpacked\node_modules\typescript\lib\tsc.js' --noEmit --skipLibCheck --pretty false
node tools/test-m1.cjs
```

`tools/browser-m1.cjs` tests the built Cocos game through Chrome DevTools Protocol: keyboard input, release, car collision, two-finger input, joystick release, pause/resume and HUD bounds at 16:9, 19.5:9 and 4:3. It requires the local server and a dedicated Chrome test instance exposing port 9333. Screenshots go under ignored `temp/`. This is desktop browser touch emulation, not physical device verification.

Pass `http://localhost:7456` as its argument to test Cocos Creator Preview instead. That run checks interactions at the default preview size; use the fullscreen web build for aspect-ratio tests because the Creator toolbar can lock its canvas to Design Resolution. The final runs passed in both environments. The test hides the profiler overlay while exercising the joystick; in manual Preview use the toolbar's Show FPS control if the stats overlap the stick.

The corrected Huawei RPK is **2,516,740 bytes**. SHA-256: `37D86351723247D700E7EA4FEA453407299578F9EC28E25D68984B4A2475140E`. Its archived manifest specifies landscape. Packaging succeeds, but installation/execution in Huawei Quick Game has not been performed.

## Remaining device/editor checks

- Verify touchscreen feel and simultaneous fingers on an Android phone/tablet, including a notched device.
- Test focus loss, OS interruptions and orientation changes in the actual Huawei runtime.
- Install and launch the RPK in Huawei Quick Game tooling; verify offline launch and landscape display.
- Measure device performance and thermals. Desktop test FPS is not evidence of mobile 30 FPS.
- Review character size, wall occlusion and joystick reach during a manual playthrough.
- Replace `com.huawei.demo` and debug signing before publication; no Huawei service integration is claimed.

M2 should begin with pistol/knife combat, health and one Walker encounter. M1 browser interaction validation passed; continue tracking the outstanding device checks. All later modes, enemies, noise, abilities, boss, saves and final visual polish remain unimplemented.
