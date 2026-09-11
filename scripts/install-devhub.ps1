$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host 'Building DBZ LSW Dev Hub...' -ForegroundColor Cyan
& npx tauri build --features devhub --config src-tauri/tauri.devhub.conf.json --bundles nsis
if ($LASTEXITCODE -ne 0) {
  throw "Tauri build failed with exit code $LASTEXITCODE"
}

$BundleDir = Join-Path $RepoRoot 'src-tauri\target\release\bundle\nsis'
$Installer = Get-ChildItem $BundleDir -Filter '*.exe' -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $Installer) {
  throw "No NSIS installer found in $BundleDir"
}

Write-Host "Opening installer: $($Installer.FullName)" -ForegroundColor Green
Start-Process -FilePath $Installer.FullName
