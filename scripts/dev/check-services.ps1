#!/usr/bin/env pwsh
# Service Health Check Script

Write-Host ""
Write-Host "=== TriviaNFT Service Health Check ===" -ForegroundColor Cyan

# Check Docker
Write-Host ""
Write-Host "1. Checking Docker..." -ForegroundColor Yellow
try {
    $dockerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker is running" -ForegroundColor Green
        Write-Host $dockerStatus
    } else {
        Write-Host "[FAIL] Docker is not running" -ForegroundColor Red
        Write-Host "  -> Start Docker Desktop and run: docker compose up -d" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Docker is not available" -ForegroundColor Red
}

# Check Web Server (Metro)
Write-Host ""
Write-Host "2. Checking Web Server (port 8081)..." -ForegroundColor Yellow
$webPort = netstat -ano | findstr ":8081" | findstr "LISTENING"
if ($webPort) {
    Write-Host "[OK] Web server is running on port 8081" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Web server is not running" -ForegroundColor Red
    Write-Host "  -> Run: pnpm --filter @trivia-nft/web dev" -ForegroundColor Yellow
}

# Check API Server
Write-Host ""
Write-Host "3. Checking API Server (port 3001)..." -ForegroundColor Yellow
$apiPort = netstat -ano | findstr ":3001" | findstr "LISTENING"
if ($apiPort) {
    Write-Host "[OK] API server is running on port 3001" -ForegroundColor Green
} else {
    Write-Host "[FAIL] API server is not running" -ForegroundColor Red
    Write-Host "  -> Run: pnpm --filter @trivia-nft/api dev" -ForegroundColor Yellow
}

# Check PostgreSQL
Write-Host ""
Write-Host "4. Checking PostgreSQL (port 5432)..." -ForegroundColor Yellow
$pgPort = netstat -ano | findstr ":5432" | findstr "LISTENING"
if ($pgPort) {
    Write-Host "[OK] PostgreSQL is running on port 5432" -ForegroundColor Green
} else {
    Write-Host "[FAIL] PostgreSQL is not running" -ForegroundColor Red
    Write-Host "  -> Run: docker compose up -d" -ForegroundColor Yellow
}

# Check Redis
Write-Host ""
Write-Host "5. Checking Redis (port 6379)..." -ForegroundColor Yellow
$redisPort = netstat -ano | findstr ":6379" | findstr "LISTENING"
if ($redisPort) {
    Write-Host "[OK] Redis is running on port 6379" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Redis is not running" -ForegroundColor Red
    Write-Host "  -> Run: docker compose up -d" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "For wallet connection to work, you need:" -ForegroundColor White
Write-Host "  1. Cardano wallet extension installed (Lace/Nami/Eternl)" -ForegroundColor White
Write-Host "  2. Docker services running (PostgreSQL + Redis)" -ForegroundColor White
Write-Host "  3. API server running on port 3001" -ForegroundColor White
Write-Host "  4. Web server running on port 8081" -ForegroundColor White
Write-Host ""
