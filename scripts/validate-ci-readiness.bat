@echo off
REM GitHub Actions Pre-Flight Validation Script (Windows)
REM Run this before setting up GitHub Actions to verify everything is ready

echo ========================================
echo GitHub Actions CI/CD Readiness Check
echo ========================================
echo.

set ERRORS=0
set WARNINGS=0

REM Check 1: Node modules installed
echo [1/11] Checking Node modules...
if not exist "node_modules\" (
    echo X ERROR: node_modules not found. Run: npm install
    set /a ERRORS+=1
) else (
    echo OK: node_modules exists
)

REM Check 2: package.json has required scripts
echo.
echo [2/11] Checking package.json scripts...
findstr /C:"\"lint\":" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: lint script exists
) else (
    echo X ERROR: lint script missing in package.json
    set /a ERRORS+=1
)

findstr /C:"\"test\":" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: test script exists
) else (
    echo X ERROR: test script missing in package.json
    set /a ERRORS+=1
)

findstr /C:"\"test:ci\":" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: test:ci script exists
) else (
    echo X ERROR: test:ci script missing in package.json
    set /a ERRORS+=1
)

findstr /C:"\"typecheck\":" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: typecheck script exists
) else (
    echo X ERROR: typecheck script missing in package.json
    set /a ERRORS+=1
)

findstr /C:"\"maestro:validate\":" package.json >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: maestro:validate script exists
) else (
    echo X ERROR: maestro:validate script missing in package.json
    set /a ERRORS+=1
)

REM Check 3: TypeScript config
echo.
echo [3/11] Checking tsconfig.json...
if exist "tsconfig.json" (
    findstr /C:"\"strict\": true" tsconfig.json >nul
    if %ERRORLEVEL% EQU 0 (
        echo OK: tsconfig.json exists with strict mode
    ) else (
        echo WARNING: tsconfig.json exists but strict mode is disabled
        set /a WARNINGS+=1
    )
) else (
    echo X ERROR: tsconfig.json not found
    set /a ERRORS+=1
)

REM Check 4: Jest config
echo.
echo [4/11] Checking jest.config.js...
if exist "jest.config.js" (
    findstr /C:"coverageThreshold" jest.config.js >nul
    if %ERRORLEVEL% EQU 0 (
        echo OK: jest.config.js exists with coverage threshold
    ) else (
        echo WARNING: jest.config.js exists but no coverage threshold
        set /a WARNINGS+=1
    )
) else (
    echo X ERROR: jest.config.js not found
    set /a ERRORS+=1
)

REM Check 5: ESLint config
echo.
echo [5/11] Checking ESLint config...
if exist "eslint.config.js" (
    echo OK: ESLint config exists
) else if exist ".eslintrc.js" (
    echo OK: ESLint config exists
) else if exist ".eslintrc.json" (
    echo OK: ESLint config exists
) else (
    echo X ERROR: ESLint config not found
    set /a ERRORS+=1
)

REM Check 6: .env files not committed
echo.
echo [6/11] Checking for committed .env files...
git ls-files | findstr /R "\.env$" >nul
if %ERRORLEVEL% EQU 0 (
    echo X ERROR: .env files are committed! Remove them before pushing.
    set /a ERRORS+=1
) else (
    echo OK: No .env files committed
)

REM Check 7: .gitignore includes coverage
echo.
echo [7/11] Checking .gitignore...
findstr /C:"coverage/" .gitignore >nul
if %ERRORLEVEL% EQU 0 (
    echo OK: .gitignore includes coverage/
) else (
    echo WARNING: .gitignore doesn't include coverage/
    set /a WARNINGS+=1
)

REM Check 8: GitHub workflows exist
echo.
echo [8/11] Checking GitHub workflows...
if exist ".github\workflows\mobile-pipeline-caller.yml" (
    echo OK: .github/workflows/mobile-pipeline-caller.yml exists
) else (
    echo X ERROR: .github/workflows/mobile-pipeline-caller.yml not found
    set /a ERRORS+=1
)

REM Check 9: Maestro validation assets
echo.
echo [9/11] Checking Maestro validation assets...
if exist "scripts\validate-maestro-flows.ts" (
    echo OK: scripts/validate-maestro-flows.ts exists
) else (
    echo X ERROR: scripts/validate-maestro-flows.ts not found
    set /a ERRORS+=1
)

if exist ".maestro\smoke-android.yaml" (
    echo OK: .maestro/smoke-android.yaml exists
) else (
    echo WARNING: .maestro/smoke-android.yaml not found
    set /a WARNINGS+=1
)

if exist ".maestro\smoke-ios.yaml" (
    echo OK: .maestro/smoke-ios.yaml exists
) else (
    echo WARNING: .maestro/smoke-ios.yaml not found
    set /a WARNINGS+=1
)

REM Check 10: SonarCloud config (optional)
echo.
echo [10/11] Checking SonarCloud config...
if exist "sonar-project.properties" (
    echo OK: sonar-project.properties exists
) else (
    echo WARNING: sonar-project.properties not found (optional for SonarCloud^)
    set /a WARNINGS+=1
)

REM Check 11: Expo app.json
echo.
echo [11/11] Checking app.json...
if exist "app.json" (
    findstr /C:"\"package\":" app.json >nul
    if %ERRORLEVEL% EQU 0 (
        echo OK: app.json exists with Android package
    ) else (
        echo WARNING: app.json exists but no Android package identifier
        set /a WARNINGS+=1
    )
) else (
    echo X ERROR: app.json not found
    set /a ERRORS+=1
)

REM Summary
echo.
echo ========================================
echo Summary
echo ========================================
echo Errors: %ERRORS%
echo Warnings: %WARNINGS%
echo.

if %ERRORS% EQU 0 (
    echo OK: All critical checks passed!
    echo.
    echo Next steps:
    echo 1. Set MOBILE_SINGLE_SYSTEMS_JSON repository variable in GitHub
    echo 2. (Optional^) Set SONAR_TOKEN secret for SonarCloud
    echo 3. Push to 'test', 'uat', or 'main' branch to trigger CI
    echo.
    echo See README.md for detailed instructions.
    exit /b 0
) else (
    echo X %ERRORS% critical issue(s^) found. Fix them before enabling CI/CD.
    exit /b 1
)
