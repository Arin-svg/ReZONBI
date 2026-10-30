# Submission readiness — 30 October 2026

Target confirmed by entrant: Huawei Quick Game RPK. HMS intentionally omitted, consistent with the organizer message supplied in chat. The supplied message states 1 November 2026, 11:59 pm as the deadline; confirm submission portal/timezone details with the organizer.

## Prepared

- USER-GUIDE.md: controls, objective, upgrade loop, boss milestones, save behavior, and settings; checked against source, pending final-device verification.
- PITCH-SCRIPT.md: three-minute speaking draft, demo sequence, and six-slide outline. Entrant name and actual time limit are still needed.
- CREDITS.md: ownership register with explicit unresolved asset sources.
- Home STATS button and independent persistent best kills/survival duration. Death clears the run save but preserves records.
- Tutorial page explaining EXP/upgrades and recurring Tyrant objectives, in English and Malay.
- Corrected build hook display name from Re to Re:ZONBI.

## Local verification

Passed on 30 October: TypeScript no-emit check with skipLibCheck; UI/menu/settings/tutorial/save fixtures; new stats persistence/corrupt-record checks; audio assets and lifecycle fixtures; auto-fire fixtures; recurring Tyrant/wave/checkpoint fixtures; endless-city fixtures; git diff whitespace check.

These are source/fixture checks, not physical-device playtests or visual sign-off. No final phone recording or screenshots were produced in this pass.

## Release gates

- [x] Fresh RPK generated at build/huawei-quick-game/dist/ReZONBI.rpk. Size: 72,860,624 bytes. SHA-256 and largest compressed entries are recorded in PACKAGE-AUDIT.json. Archived manifest confirms Re:ZONBI and landscape; archived scripts contain the new records and tutorial. Build log reports build/make completed; Creator exited with code 36. Installation/execution is still unverified.
- [ ] Confirm package-size limit. Previous on-disk RPK measured 72,860,286 bytes (26 October), exceeding the older project requirement of less than 20,000,000 bytes. That old requirement needs confirmation against the competition rules; do not use the obsolete 2.54 MB development-note figure.
- [ ] Review package identity (currently com.huawei.demo), default Cocos icon, and debug signing. Do not substitute an invented registered identity. Confirm whether the organizer accepts a debug-signed prototype.
- [ ] Complete credits: entrant/team, music sources, supplied models/art, permission and attribution details.
- [ ] Final guide verified against the actual submitted RPK.
- [ ] Pitch rehearsed to the confirmed time limit; actual-build screenshots/video captured.
- [ ] Upload final RPK and required materials; verify the portal's submission receipt.

## Phone test record

Phone model / OS: pending. Quick Game runtime/version: pending. Tester/date: pending. Package SHA-256: pending.

| Check | Expected result | Result |
| --- | --- | --- |
| Cold launch | Title/menu visible in landscape; no blank screen | Pending |
| Movement and multitouch | Move while using slash/dodge; releases never stick | Pending |
| Combat and upgrades | Auto-fire, EXP, choices, and cooldowns function | Pending |
| Boss | 100-kill milestone, telegraphs, defeat and continued survival | Pending |
| Pause / app switch | Gameplay freezes safely; controls/audio recover | Pending |
| Save / relaunch | Continue restores valid checkpoint; new-run confirmation works | Pending |
| Death / restart | Defeat and restart work; best records remain | Pending |
| Settings | Music/SFX/mute, quality, language persist | Pending |
| Display | Controls and text fit screen/notch; no obstructed buttons | Pending |
| Sustained session | At least 10 minutes; record FPS, heat, crashes, audio issues | Pending |

Treat story expansion and new modes as later work. Current build supports a survival premise and adaptation/perseverance theme, not a completed story campaign.
