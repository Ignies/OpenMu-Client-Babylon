# One-line entry (PowerShell as Administrator):
#   irm https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/install/get.ps1 | iex
# Gets git, clones (or updates) the repository into C:\mu-server, then runs install\install.ps1.
$ErrorActionPreference = 'Stop'

$RepoUrl = if ($env:MU_REPO_URL) { $env:MU_REPO_URL } else { 'https://github.com/Ignies/OpenMu-Client-Babylon.git' }
$Branch = if ($env:MU_BRANCH) { $env:MU_BRANCH } else { 'main' }
$Dir = if ($env:MU_DIR) { $env:MU_DIR } else { 'C:\mu-server' }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Open PowerShell as Administrator and run this again.' }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host '==> Installing Git' -ForegroundColor Cyan
  winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

if (Test-Path "$Dir\.git") {
  Write-Host "==> Updating $Dir" -ForegroundColor Cyan
  git -C $Dir fetch -q origin $Branch
  git -C $Dir merge -q --ff-only "origin/$Branch"
} else {
  Write-Host "==> Downloading the server into $Dir (about 2 GB, a few minutes)" -ForegroundColor Cyan
  git clone -q --branch $Branch $RepoUrl $Dir
}

& "$Dir\install\install.ps1" @args
