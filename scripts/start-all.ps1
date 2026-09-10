$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$php = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter php.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $php) {
    $php = (Get-Command php -ErrorAction SilentlyContinue).Source
}
if (-not $php) {
    Write-Error 'PHP tidak ditemukan. Pastikan PHP sudah terpasang.'
    exit 1
}

$backendPath = Join-Path $root 'backend'
$routerPath = Join-Path $backendPath 'router.php'
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
$backend = Start-Process -FilePath $php -ArgumentList @('-d', 'upload_max_filesize=10M', '-d', 'post_max_size=12M', '-S', '0.0.0.0:8000', '-t', $backendPath, $routerPath) -WorkingDirectory $root -PassThru
$frontend = $null
try {
    $frontend = Start-Process -FilePath 'npm.cmd' -ArgumentList @('--prefix', (Join-Path $root 'frontend'), 'run', 'dev:lan') -WorkingDirectory $root -NoNewWindow -PassThru
    Write-Host 'Backend PHP : http://localhost:8000'
    Write-Host 'Frontend    : http://localhost:5173'
    Write-Host 'LAN         : http://IP-SERVER:5173'
    Write-Host 'Tekan Ctrl+C untuk menghentikan keduanya.'
    Wait-Process -Id $frontend.Id
}
finally {
    try {
        $backupDir = Join-Path $root 'backups'
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        $dbFile = Join-Path $root 'database.db'
        if (Test-Path $dbFile) {
            $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
            $backupFile = Join-Path $backupDir "database-$stamp-shutdown.db"
            Copy-Item -Path $dbFile -Destination $backupFile -Force
            Write-Host "Backup database tersimpan: backups/$(Split-Path $backupFile -Leaf)"
            Get-ChildItem $backupDir -Filter *.db | Sort-Object LastWriteTime -Descending | Select-Object -Skip 20 | Remove-Item -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Warning "Backup database gagal: $($_.Exception.Message)"
    }
    if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
}
