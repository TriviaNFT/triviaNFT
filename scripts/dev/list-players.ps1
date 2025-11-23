#!/usr/bin/env pwsh
# List all players from the dev server

Write-Host ""
Write-Host "=== Player List ===" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/dev/list-players" -Method GET
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "Total Players: $($data.count)" -ForegroundColor Green
    Write-Host "Timestamp: $($data.timestamp)" -ForegroundColor Gray
    Write-Host ""
    
    if ($data.count -eq 0) {
        Write-Host "No players found." -ForegroundColor Yellow
    } else {
        Write-Host "Players:" -ForegroundColor White
        Write-Host "--------" -ForegroundColor Gray
        
        foreach ($player in $data.players) {
            $username = if ($player.username) { $player.username } else { "(not set)" }
            $email = if ($player.email) { $player.email } else { "(not set)" }
            $stakeKeyShort = $player.stakeKey.Substring(0, 20)
            
            Write-Host ""
            Write-Host "  ID: $($player.id)" -ForegroundColor Cyan
            Write-Host "  Username: $username" -ForegroundColor White
            Write-Host "  Email: $email" -ForegroundColor Gray
            Write-Host "  Stake Key: ${stakeKeyShort}..." -ForegroundColor Gray
            Write-Host "  Created: $($player.createdAt)" -ForegroundColor Gray
            Write-Host "  Updated: $($player.updatedAt)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[FAIL] Failed to list players" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Make sure the API server is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter @trivia-nft/api dev" -ForegroundColor Yellow
}

Write-Host ""
