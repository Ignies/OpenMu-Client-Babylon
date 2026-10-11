#!/usr/bin/env bash
# Linux bootstrap: Docker and Bun if missing, then the installer (install/cli/main.ts). Safe to rerun.
# Usage (from the repository): sudo bash install/install.sh [command]
set -euo pipefail

BUN_VERSION="1.4.2"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUN="${BUN_INSTALL:-$HOME/.bun}/bin/bun"

say() { printf '\033[36m==>\033[0m %s\n' "$1"; }
die() { printf '\033[31mxx\033[0m %s\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run it as root: sudo bash install/install.sh"

if ! command -v curl >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  say "Installing curl and unzip"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl unzip ca-certificates
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y -q curl unzip ca-certificates
  else
    die "Install curl and unzip, then run this again."
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker (official script from get.docker.com)"
  curl -fsSL https://get.docker.com | sh
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now docker >/dev/null 2>&1 || true
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is missing. Install the docker-compose-plugin package and rerun."

if [ ! -x "$BUN" ] || [ "$("$BUN" --version)" != "$BUN_VERSION" ]; then
  say "Installing Bun $BUN_VERSION"
  curl -fsSL https://bun.sh/install | bash -s "bun-v$BUN_VERSION" >/dev/null
fi

say "Preparing the installer"
(cd "$HERE" && "$BUN" install --frozen-lockfile --silent)

exec "$BUN" "$HERE/cli/main.ts" "$@"
