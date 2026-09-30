# Local AI Phase 0 Spike

## Scope

This internal harness validates the technical assumptions in `VOICE_TRANSACTIONS.md` without enabling
an end-user AI feature. It is available at `/ai-spike` in development or when the dedicated internal
build flag is set. Expo Go and web cannot load `llama.rn`.

The spike pins:

- `llama.rn` `0.13.0-rc.6`.
- Gemma 4 E2B-it QAT `UD-Q4_K_XL` at revision
  `66a399f68ddd113b06dff02fca9523e55465d11d`.
- `mmproj-F16.gguf` from the same revision.
- MTP disabled.

## Run

1. Install dependencies with `npm install`.
2. Create a native development build with `EAS_BUILD_PROFILE=development npm run ios` or
   `EAS_BUILD_PROFILE=development npm run android`. The profile variable lets the `llama.rn` plugin
   apply its required iOS memory entitlements.
3. Start Metro with `npm run start` and open the development build.
4. Navigate to `cashio://ai-spike`, or open `/ai-spike` through an Expo Router development URL.
5. Download and verify the two pinned artifacts. This requires about 3.61 GB plus temporary space.
6. Load the model and confirm that the result reports both `audio: true` and `vision: true`.
7. Run the constrained text probe.
8. Record a transaction of at most 30 seconds and run the audio probe.
9. Select a receipt image and run the image probe.
10. Release the model before repeating a test with another backend or device.

For production-like measurements, run `eas build --profile ai-spike --platform ios` or
`eas build --profile ai-spike --platform android`. This internal release profile sets
`EXPO_PUBLIC_ENABLE_AI_SPIKE=true`; normal non-development builds keep the route disabled.

The harness stores verified artifacts and temporary WAV recordings in app-private cache so
re-downloadable model data is not included in device backups. The OS may evict these files. It never
calls a Cash IO repository and cannot create a transaction. Prompts and responses are displayed only
on screen and are not written to logs.

## Measurements

Record the following for each physical device and release build configuration:

| Field | Value |
| --- | --- |
| Device and OS | |
| App build/profile | |
| CPU/RAM class | |
| llama.rn version | `0.13.0-rc.6` |
| Backend and devices | |
| GPU active/reason unavailable | |
| Model load time | |
| Projector load time | |
| Audio support | |
| Vision support | |
| Text prompt/prediction tokens per second | |
| Audio duration and total inference time | |
| Image dimensions and total inference time | |
| Peak resident memory | |
| Thermal state after five runs | |
| Background/cancellation result | |
| Airplane-mode result after installation | |

Use Xcode Instruments for iOS memory and time profiling and Android Studio Profiler for Android. Test
on physical devices because Metal multimodal inference is not representative in the iOS simulator.

## Phase 0 Gates

The spike passes only if all of these are demonstrated on physical iOS and Android devices:

- Both files pass byte-size and SHA-256 checks and are moved into place only after verification.
- `llama.rn` loads the pinned model without an out-of-memory termination.
- The projector reports `audio: true` and `vision: true`.
- Text, recorded WAV audio, and a local image each produce parseable JSON matching the schema.
- Inference works in airplane mode after artifact installation.
- Cancelling or backgrounding an operation does not leave a loaded context or corrupt artifact.
- Network inspection shows no request during inference.
- Peak RAM, latency, battery, and thermal measurements satisfy thresholds agreed before Phase 1.

## Known Risks And Blockers

- `llama.rn` `0.13.0-rc.6` is a prerelease. It is acceptable for this spike but not approved for
  production without a stable release or an explicit risk decision.
- Expo SDK 56 uses the Hermes generation with a documented memory regression involving Worklets and
  Reanimated. Record memory results, but repeat final qualification after the project moves to a fixed
  Expo release.
- SHA-256 is incremental and bounded in memory, but currently runs through JavaScript in 4 MB chunks.
  Measure verification time before deciding whether Phase 1 needs a native streaming hash module.
- The model repository declares Apache 2.0 in its model card and links to a Gemma license page, but
  the fixed revision does not contain a license file. Legal review and a retained notice are required
  before redistribution or production download.
- Leaving the screen or backgrounding the app cancels downloads and incremental hashing. Durable
  background transfer and pause/resume belong to Phase 1.
- The spike dependencies and native module remain temporary build inputs. Do not submit a store build
  with the Phase 0 harness; remove it or make native inclusion profile-conditional before release.
