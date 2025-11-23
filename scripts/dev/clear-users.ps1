#!/usr/bin/env pwsh
# Clear all users from the dev server

Write-Host ""
Write-Host "Clearing all users from server..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/dev/clear-players" -Method POST
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "[OK] $($data.message)" -ForegroundColor Green
    Write-Host "  Timestamp: $($data.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Failed to clear users" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Make sure the API server is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter @trivia-nft/api dev" -ForegroundColor Yellow
}

Write-Host ""
