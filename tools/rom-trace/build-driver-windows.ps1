$ErrorActionPreference = 'Stop'

$msysRoot = if ($env:MSYS2_ROOT) { $env:MSYS2_ROOT } else { 'C:\msys64' }
$bash = Join-Path $msysRoot 'usr\bin\bash.exe'
if (-not (Test-Path -LiteralPath $bash)) {
  throw "MSYS2 not found at $msysRoot. Install MSYS2 and mingw-w64-ucrt-x86_64-{gcc,mgba}."
}

$env:MSYSTEM = 'UCRT64'
$traceDir = $PSScriptRoot
$env:DBZLSW_TRACE_DIR = $traceDir
& $bash -lc 'export PATH=/ucrt64/bin:$PATH; cd "$(cygpath -u "$DBZLSW_TRACE_DIR")"; gcc -O2 -Wall -Wextra -I/ucrt64/include -L/ucrt64/lib -o rom-driver-win.exe rom-driver.c -lmgba -lm'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Built tools/rom-trace/rom-driver-win.exe (local artifact; do not commit).'
