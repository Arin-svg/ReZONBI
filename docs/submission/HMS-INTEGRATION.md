# Huawei account integration

App ID: `119747847`. Package: `com.arinja.rezonbi`. Intended region: Malaysia.

Settings > HUAWEI ACCOUNT exposes optional runtime Quick Game sign-in through `qg.gameLogin`. The account screen explains data use and links Huawei's privacy policy before the player chooses sign-in. Only the display name is held in session memory. No account IDs, credentials, signatures, or client secrets are logged or saved. Local checkpoints remain local and independent of the account.

The adapter handles missing APIs, cancellation, errors, malformed results, duplicate requests, timeouts and late callbacks. Responses requiring server verification (`isAuth === 1`) are not accepted as authenticated: a server verification implementation is still required for that configuration. No server or cloud saves are implemented. This flow is not configured for a mainland China release.

Source integration is implemented; successful Huawei sign-in and Malaysia runtime compatibility remain unverified. Console switches alone do not prove working integration. Mock tests exercise adapter behavior, not Huawei authentication.

Before claiming verified integration, test a freshly rebuilt RPK in a compatible Huawei runtime: open Settings > HUAWEI ACCOUNT, review the privacy policy, sign in, check displayed name, cancel and retry, test offline failure, and confirm guest gameplay and local checkpoint continuation. Record the device/runtime versions and actual outcomes. Rotate the console secrets previously shared in chat before production use; never embed them in the RPK.

Reference: https://developer.huawei.com/consumer/en/doc/quickApp-References/quickgame-api-account-0000001083874630/

## Build and checks — 10 November 2026

- Fresh `build/huawei-quick-game/dist/ReZONBI.rpk`: 72,862,371 bytes. SHA-256: `4E51599EC5C5561752EF19B3A460C661F4FD328DA7F6D801CB745F5C54172290`.
- Archived manifest confirms `com.arinja.rezonbi`; archived JavaScript contains App ID `119747847` and the account sign-in UI.
- Creator build/make completed; process returned 36. Log: `temp/huawei-account-retry.log`. Initial sandbox build failed on GPU/cache access; retry with cache access succeeded.
- `node tools/test-huawei-account.cjs` and `node tools/test-game-ui.cjs` pass. Project TypeScript check passes with `--skipLibCheck`; without it, Creator's engine declaration files report missing/invalid types.
- No visual account-screen review or actual Huawei authentication was performed. Release signing and the existing package icon were not changed. Use the portable build config for subsequent builds; older editor task profiles may still contain the demo package identifier.
