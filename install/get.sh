#!/usr/bin/env bash
# One-line entry: curl -fsSL https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/install/get.sh | sudo bash
# Gets git, clones (or updates) the repository into /opt/mu-server, then runs install/install.sh.
set -euo pipefail

REPO_URL="${MU_REPO_URL:-https://github.com/Ignies/OpenMu-Client-Babylon.git}"
BRANCH="${MU_BRANCH:-main}"
DIR="${MU_DIR:-/opt/mu-server}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run it with sudo: curl -fsSL <url> | sudo bash" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "==> Installing git"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git ca-certificates curl
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y -q git ca-certificates curl
  else
    echo "Install git first, then run this again." >&2
    exit 1
  fi
fi

if [ -d "$DIR/.git" ]; then
  echo "==> Updating $DIR"
  git -C "$DIR" fetch -q origin "$BRANCH"
  git -C "$DIR" merge -q --ff-only "origin/$BRANCH"
else
  echo "==> Downloading the server into $DIR (about 2 GB, a few minutes)"
  git clone -q --branch "$BRANCH" "$REPO_URL" "$DIR"
fi

# The script itself arrived on stdin; give the installer the terminal back for its questions.
exec bash "$DIR/install/install.sh" "$@" </dev/tty
