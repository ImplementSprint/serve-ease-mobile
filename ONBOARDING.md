# Template Onboarding Guide

This guide is for teams adopting this Expo TypeScript boilerplate.

Use the onboarding skill at .github/onboarding-skill/SKILL.md as the operating checklist.

## 1) What onboarding includes

- Project identity setup (name, slug, package IDs)
- Environment setup (.env variables)
- Local build and test setup
- CI readiness checks
- Boundaries for safe customization

## 2) Prerequisites

- Node.js 20+
- npm
- Android SDK and emulator tools
- Xcode + iOS Simulator (macOS only)

## 3) First-day setup

1. Install dependencies
- npm install

2. Validate Expo dependency compatibility
- npx expo install --check

3. Set app identity in app.config.ts
- app name
- slug
- scheme
- ios.bundleIdentifier
- android.package

4. Set environment values
- EXPO_PUBLIC_APP_NAME
- EXPO_PUBLIC_APP_ENV
- EXPO_PUBLIC_API_BASE_URL

5. Start app
- npm run start

## 4) What you can touch

- src/**
- tests/unit/**
- .maestro/** (flow files)
- app.config.ts
- .env value usage through src/config/appConfig.ts
- theme and navigation files under src/**

## 5) What you should not touch (without platform review)

- .github/workflows/**
- scripts/validate-maestro-flows.ts
- pipeline wiring and artifact naming conventions

If one of these must change, run a full CI validation branch before merge.

## 6) Test setup and where tests live

- Unit tests
  - Location: tests/unit/**
  - Command: npm run test:unit

- Maestro E2E tests
  - Location: .maestro/**
  - Baseline flows: .maestro/smoke-android.yaml and .maestro/smoke-ios.yaml
  - Commands:
    - Validate flows: npm run maestro:validate
    - Android: npm run maestro:test:android
    - iOS: npm run maestro:test:ios

## 7) CI artifacts and releases

- Actions artifacts are downloaded as an outer ZIP.
- Android artifact includes APK files.
- iOS artifact includes .app.zip.
- Extracted .app appears as a folder because it is an Apple app bundle directory by design.
- Use Actions artifacts for run-level inspection.
- Use GitHub Releases for publish/distribution outputs.

## 8) Dependency update policy for this boilerplate

- Primary rule: keep Expo compatibility first.
- Run before upgrades:
  - npx expo install --check
  - npm outdated
- Safe update flow:
  1. npm update
  2. npx expo install --check
  3. npm run verify
  4. run Maestro smoke flow commands

Do not blindly upgrade to latest major versions when Expo-managed ranges are not ready.

## 9) Definition of done for onboarding

- verify command passes
- unit tests pass
- Maestro Android smoke flow passes
- Maestro iOS smoke flow passes
- CI uploads Android and iOS artifacts
- app identity and env values are configured
