#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Starting WS↔TCP proxy on port 3000..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun run proxy & PROXY_PID=$!

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ Starting dev server on port 5173..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun run dev -- --host 0.0.0.0 & DEV_PID=$!
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Client ready → http://localhost:5173/online"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Monitoring both processes; if one goes down, kill the other and exit
monitor() {
  while true; do
    for pid in $PROXY_PID $DEV_PID; do
      if ! kill -0 "$pid" 2>/dev/null; then
        echo "Process $pid went down - shutting down container"
        kill $PROXY_PID $DEV_PID 2>/dev/null || true
        exit 1
      fi
    done
    sleep 2
  done
}

trap 'kill $PROXY_PID $DEV_PID 2>/dev/null; exit 0' SIGTERM SIGINT

monitor
