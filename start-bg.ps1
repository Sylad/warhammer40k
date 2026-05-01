$proj = "C:\Developpeur\warhammer40k"
$npm  = "C:\Program Files\nodejs\npm.cmd"

# Tuer les anciens processus sur les ports 3001 et 4201
foreach ($port in @(3001, 4201)) {
    $pids = (netstat -ano | Select-String ":$port\s") |
            ForEach-Object { ($_ -split '\s+')[-1] } |
            Where-Object { $_ -match '^\d+$' } |
            Select-Object -Unique
    foreach ($pid in $pids) {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
    }
}

Start-Sleep -Seconds 2

# Backend NestJS (port 3001)
Start-Process -FilePath $npm -ArgumentList "run","start:dev" `
    -WorkingDirectory "$proj\backend" -WindowStyle Hidden

Start-Sleep -Seconds 10

# Frontend Angular (port 4201)
$logDir = "$proj\logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

Start-Process -FilePath $npm -ArgumentList "start" `
    -WorkingDirectory "$proj\frontend" -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\frontend.log" -RedirectStandardError "$logDir\frontend-err.log"

Start-Sleep -Seconds 30

Start-Process "http://localhost:4201"
