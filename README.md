# ServEase Mobile (ServEase-MB)

Expo + React Native mobile app for ServEase customer and provider flows.  
This app is API-driven and expects the ServEase backend gateway to be running.

## Prerequisites

- Node.js 20+
- npm 10+
- Expo Go app or an Android/iOS emulator
- `ServEase-BE` repository (backend)
- Docker Desktop (for backend Kafka in local dev)

## 1. Start the backend first (ServEase-BE)

From `ServEase-BE`:

```bash
npm install
copy .env.example .env
```

Set required backend `.env` values (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `JWT_SECRET`, etc.), then run:

```bash
npm run dev
```

This starts Kafka plus gateway + microservices.  
Gateway should be available at `http://localhost:5000`.

## 2. Configure this mobile app environment

From `ServEase-MB`:

```bash
copy .env.example .env
```

Set:

- `EXPO_PUBLIC_API_URL`
  - iOS simulator / web: `http://localhost:5000`
  - Android emulator: `http://10.0.2.2:5000`
  - Physical device: `http://<your-local-ip>:5000`
- `EXPO_PUBLIC_API_TIMEOUT_MS` (optional, default is `15000`)

## 3. Run the mobile app

```bash
npm install
npm run start
```

Then open on your target:

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web
- Or scan QR with Expo Go

If network discovery fails:

```bash
npx expo start --tunnel
```

## Common scripts

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
npm run test
npm run test:ci
npm run test:watch
npm run doctor
npm run verify
npm run maestro:validate
npm run maestro:test
npm run maestro:test:android
npm run maestro:test:ios
npm run test:e2e
```

## Pre-push checks (Windows)

```bash
run-ci-checks.bat
```

Alternative:

```bash
scripts\validate-ci-readiness.bat
```

## Troubleshooting

- **Request timed out / empty dashboard data:** make sure `ServEase-BE` is running (`npm run dev`) and all services are up.
- **Android emulator cannot reach backend:** use `http://10.0.2.2:5000` for `EXPO_PUBLIC_API_URL`.
- **Physical phone cannot reach backend:** use your machine LAN IP in `EXPO_PUBLIC_API_URL` and ensure both devices are on the same network.

## CI/CD Template Alignment

This repo now follows the same mobile CI caller template as `serve-ease-mobile`.

- Workflow caller: `.github/workflows/mobile-pipeline-caller.yml`
- Orchestrator workflow source: `ImplementSprint/central-workflow/.github/workflows/master-pipeline-mobile.yml@main`
- Required repository variable: `MOBILE_SINGLE_SYSTEMS_JSON`

Recommended `MOBILE_SINGLE_SYSTEMS_JSON` value:

```json
{
  "name": "servease-mb",
  "dir": ".",
  "mobile_stack": "expo",
  "enable_android_build": true,
  "enable_ios_build": true,
  "version_stream": "servease-mb"
}
```

Optional pre-flight checks:

```bash
# Windows quick checks
run-ci-checks.bat

# Cross-platform readiness checks
scripts/validate-ci-readiness.sh
scripts/validate-ci-readiness.bat
```
