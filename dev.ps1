# dev.ps1 - Plain version (No emojis for compatibility)
Write-Host "Starting OFPPT Specs Manager..." -ForegroundColor Cyan

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: pnpm not found." -ForegroundColor Red
    exit 1
}

$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables..."
    foreach ($line in Get-Content $envFile) {
        $l = $line.Trim()
        if ($l -and -not $l.StartsWith("#")) {
            $parts = $l.Split("=", 2)
            if ($parts.Count -eq 2) {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }
    }
}

Write-Host "Starting services..." -ForegroundColor Yellow

$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    if (Test-Path ".env.local") {
        foreach ($line in Get-Content ".env.local") {
            $l = $line.Trim()
            if ($l -and -not $l.StartsWith("#")) {
                $parts = $l.Split("=", 2)
                if ($parts.Count -eq 2) {
                    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
                }
            }
        }
    }
    pnpm --filter @workspace/api-server run dev
}

Write-Host "API started in background." -ForegroundColor Green
Write-Host "Starting Frontend..." -ForegroundColor Cyan

pnpm --filter @workspace/ofppt-manager run dev

Stop-Job $apiJob.Id -ErrorAction SilentlyContinue
Remove-Job $apiJob.Id -ErrorAction SilentlyContinue
