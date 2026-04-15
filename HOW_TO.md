# HOW_TO: Use This Expo Mobile Template Safely

This guide explains:

1. How to start from this template
2. Where your team should put code
3. What you should not change if you want CI/CD to stay green
4. Which tests you must create and run

## 1) Start From Template

1. Install dependencies:

```sh
npm install
```

2. Create runtime env file:

```sh
# macOS/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

3. Set runtime variables in `.env`:

- `EXPO_PUBLIC_APP_NAME`
- `EXPO_PUBLIC_APP_ENV` (`development`, `staging`, or `production`)
- `EXPO_PUBLIC_API_BASE_URL`

4. Run locally:

```sh
npm run start
npm run android
# macOS only:
npm run ios
```

## 2) CI/CD Setup (Required Once Per Repo)

This template uses `.github/workflows/mobile-pipeline-caller.yml`, which calls the shared central mobile orchestrator.

Set repository variable `MOBILE_SINGLE_SYSTEMS_JSON`:

```json
{
  "name": "mobile-expo",
  "dir": ".",
  "mobile_stack": "expo",
  "enable_android_build": true,
  "enable_ios_build": true,
  "version_stream": "mobile-expo"
}
```

Pipeline triggers run on:

- Push to `test`, `uat`, `main`
- Pull requests targeting `test`, `uat`, `main`

## 3) Where To Put Your Code

Put application code and tests in these locations:

- `src/features/<feature-name>/...`: feature screens, hooks, state
- `src/navigation/`: navigators and route typing
- `src/app/`: app wiring
- `src/config/`: runtime config and environment mapping
- `src/theme/`: theme tokens and spacing
- `src/utils/`: shared helpers
- `tests/unit/`: Jest unit tests (`*.test.ts`, `*.test.tsx`)
- `.maestro/`: Maestro E2E flow files (`*.yaml`, `*.yml`)

Expo metadata belongs in `app.config.ts`.

## 4) What You Must Not Break

These are CI/CD contract rules enforced by the Expo workflow.

### Repository and TypeScript contracts

- Keep `package.json`
- Keep `tsconfig.json`
- Keep `expo` and `typescript` dependencies in `package.json`
- Keep `tsconfig.compilerOptions.strict = true`
- Keep app source TypeScript-only (`.ts` / `.tsx`)
- Do not add app source `.js` / `.jsx` files under `app`, `src`, `components`, `screens`, `features`, `hooks`, `utils`

### Workflow and pipeline contracts

- Do not remove `.github/workflows/mobile-pipeline-caller.yml`
- Keep repository variable name `MOBILE_SINGLE_SYSTEMS_JSON` (or correctly configured `MOBILE_MULTI_SYSTEMS_JSON`)
- Keep `mobile_stack` set to `expo` for this template system

### Maestro contracts

- Keep `.maestro/` in the repository.
- Keep at least one flow file (`*.yaml` or `*.yml`) under `.maestro/`.
- Keep `scripts/validate-maestro-flows.ts` and `npm run maestro:validate` working.

## 5) Tests You Need To Create

Create both categories of tests for every feature:

1. Unit tests (`tests/unit`)
2. E2E tests (`.maestro`)

### Unit tests (required)

Add unit tests for:

- Config behavior and env fallbacks
- Screen/component rendering behavior
- Feature logic and utility functions

Good examples already in template:

- `tests/unit/config/appConfig.test.ts`
- `tests/unit/config/expoConfig.test.ts`

### E2E tests (required)

At minimum, keep a smoke flow that verifies app launch and key UI visibility.

Then add E2E flows for your critical paths, such as:

- Login or onboarding
- Main navigation between core screens
- Core happy path action (submit, save, checkout, etc.)

Current examples:

- `.maestro/smoke-android.yaml`
- `.maestro/smoke-ios.yaml`

## 6) CI Test Gates (What Must Pass)

The Expo lane runs in this order:

1. Stage 1 gates (parallel):
   - Expo TypeScript standard check
   - Jest unit tests
   - Lint
   - Security scan
2. Stage 2 builds:
   - Android build for Maestro artifacts
   - iOS simulator build for Maestro artifacts
3. Stage 3 E2E:
   - Maestro Android E2E
   - Maestro iOS E2E

Important defaults from CI:

- Unit test command: `npx jest --coverage --verbose --ci --forceExit --runInBand`
- Coverage threshold default: `80%`
- Lint command default: `npx eslint . --max-warnings=0`
- Security: HIGH/CRITICAL findings enforced on `uat` and `main`; relaxed on `test`

## 7) Local Pre-PR Checklist

Run this before opening a PR:

```sh
npm run verify
npm run maestro:validate
npm run maestro:test:android
# macOS recommended:
npm run maestro:test:ios
```

If these pass locally, CI failure risk is much lower.

## 8) Common CI Failure Causes

- `tsconfig` strict mode turned off
- JS/JSX app source files added
- Coverage dropped below threshold
- `.maestro/` was deleted or contains no flow files
- `MOBILE_SINGLE_SYSTEMS_JSON` missing or wrong `mobile_stack`
