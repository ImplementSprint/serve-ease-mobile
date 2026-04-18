# Maestro Starter Flows

This project includes platform-specific smoke flows for CI:

- smoke-android.yaml
- smoke-ios.yaml

CI-safe tags:

- smoke-android.yaml: `smoke`, `android`
- smoke-ios.yaml: `smoke`, `ios`

Only smoke flows are kept under `.maestro` so CI commands like `maestro test .maestro` remain deterministic.

Manual scenario flows were moved to `maestro-manual/` and can be run with:

```sh
npm run maestro:test:manual
```

Before release, keep appId values in sync with your bundle/package identifiers.

Run flows:

```sh
maestro test .maestro/smoke-android.yaml
maestro test .maestro/smoke-ios.yaml
```
