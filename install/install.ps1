# Windows bootstrap: Docker Desktop and Bun if missing, then the installer (install\cli\main.ts). Safe to rerun.
# Usage (PowerShell as Administrator, from the repository): install\install.ps1 [command]
$ErrorActionPreference = 'Stop'
$BunVersion = '1.4.2'
$Here = $PSScriptRoot

function Say($text) { Write-Host "==> $text" -ForegroundColor Cyan }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Open PowerShell as Administrator and run this again.' }

function Reload-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Say 'Installing Docker Desktop (it needs WSL2)'
  winget install --id Docker.DockerDesktop -e --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Write-Host 'Docker Desktop is installed. Restart Windows, start Docker Desktop once, then run the same command again.' -ForegroundColor Yellow
  exit 0
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Say 'Starting Docker Desktop'
  Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
  for ($i = 0; $i -lt 60; $i++) { Start-Sleep 5; docker info *> $null; if ($LASTEXITCODE -eq 0) { break } }
  if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop did not start. Start it by hand, wait for it to say it is running, and rerun.' }
}

$Bun = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
if (-not (Test-Path $Bun) -or ((& $Bun --version) -ne $BunVersion)) {
  Say "Installing Bun $BunVersion"
  & ([scriptblock]::Create((Invoke-RestMethod https://bun.sh/install.ps1))) -Version $BunVersion | Out-Null
  Reload-Path
}

Say 'Preparing the installer'
Push-Location $Here
& $Bun install --frozen-lockfile --silent
Pop-Location

& $Bun "$Here\cli\main.ts" @args
exit $LASTEXITCODE
