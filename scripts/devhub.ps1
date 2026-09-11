param(
  [ValidateSet('dev', 'build')]
  [string]$Mode = 'dev'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if ($Mode -eq 'dev') {
  Write-Host 'Starting DBZ LSW Dev Hub (Tauri dev flavor)...' -ForegroundColor Cyan
  & npx tauri dev --features devhub --config src-tauri/tauri.devhub.conf.json
  exit $LASTEXITCODE
}

Write-Host 'Building DBZ LSW Dev Hub installer...' -ForegroundColor Cyan
& npx tauri build --features devhub --config src-tauri/tauri.devhub.conf.json --bundles nsis
exit $LASTEXITCODE
