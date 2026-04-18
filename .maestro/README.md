# Maestro Starter Flows

This project includes platform-specific smoke flows for CI:

- smoke-android.yaml
- smoke-ios.yaml

Before release, keep appId values in sync with your bundle/package identifiers.

Run flows:

```sh
maestro test .maestro/smoke-android.yaml
maestro test .maestro/smoke-ios.yaml
```
