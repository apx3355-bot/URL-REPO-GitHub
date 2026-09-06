$ErrorActionPreference = 'Stop'
$php = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter php.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $php) {
    $php = (Get-Command php -ErrorAction SilentlyContinue).Source
}
if (-not $php) {
    Write-Error 'PHP tidak ditemukan. Install PHP atau buka terminal baru setelah instalasi.'
    exit 1
}
$root = Split-Path $PSScriptRoot -Parent
$listeners = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
}
& $php -d upload_max_filesize=10M -d post_max_size=12M -S 0.0.0.0:8000 -t (Join-Path $root 'backend') (Join-Path $root 'backend/router.php')
