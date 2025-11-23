# Run E2E tests against preview deployment (PowerShell)
# Usage: .\scripts\run-e2e-preview.ps1 https://your-preview.vercel.app

param(
    [Parameter(Mandatory=$true)]
    [string]$PreviewUrl
)

$ErrorActionPreference = "Stop"

Write-Host "🎭 Running E2E Tests Against Preview Deployment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "Preview URL: $PreviewUrl"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════"
Write-Host ""

# Set the base URL for Playwright
$env:PLAYWRIGHT_BASE_URL = $PreviewUrl

# Navigate to web app directory
Push-Location apps\web

try {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    pnpm install --frozen-lockfile

    Write-Host ""
    Write-Host "🧪 Running Playwright E2E tests..." -ForegroundColor Yellow
    Write-Host ""

    # Run E2E tests
    pnpm exec playwright test `
        --config=playwright.config.ts `
        --reporter=list `
        --max-failures=5

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════════════════════"
        Write-Host "🎉 All E2E tests passed!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════════════════════════"
        Write-Host ""
        exit 0
    } else {
        throw "E2E tests failed"
    }
} catch {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════════════════════"
    Write-Host "❌ Some E2E tests failed" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════════════════════════"
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check preview deployment logs in Vercel"
    Write-Host "2. Verify all environment variables are set"
    Write-Host "3. Check database and Redis connectivity"
    Write-Host "4. Review test output above for specific failures"
    Write-Host ""
    exit 1
} finally {
    Pop-Location
}
