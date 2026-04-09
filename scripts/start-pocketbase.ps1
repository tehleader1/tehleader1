$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pbDir = Join-Path $root "pocketbase"
$pbExe = Join-Path $pbDir "pocketbase.exe"
$pbData = Join-Path $pbDir "pb_data"

if (!(Test-Path $pbExe)) {
  Write-Error "PocketBase binary not found at $pbExe"
}

New-Item -ItemType Directory -Force -Path $pbData | Out-Null
Write-Host "Starting PocketBase on http://127.0.0.1:8090"
& $pbExe serve --http="127.0.0.1:8090" --dir="$pbData"
