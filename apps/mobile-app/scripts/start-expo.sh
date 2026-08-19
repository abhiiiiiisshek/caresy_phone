#!/bin/bash
# Caresy Expo starter — LAN-first, tunnel fallback, one-go fix for 172.20.10.4 hotspot isolation.
# Usage: npm run start:lan | npm run start:tunnel | npm run start:web
set -e
MODE=${1:-lan}
PORT=8081

# Detect Mac IP on hotspot en0, fallback to en1
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "172.20.10.4")
if [ -z "$IP" ]; then IP="172.20.10.4"; fi

echo "→ Caresy Expo start [$MODE] — IP $IP port $PORT"
echo "  Firewall: $(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>&1 | head -1)"
echo ""

# Kill stale Metro on 8081
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "⚠ Port $PORT busy — clearing…"
  lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

if [ "$MODE" = "web" ]; then
  exec npx expo start --web --clear --port $PORT
fi

if [ "$MODE" = "tunnel" ]; then
  echo "→ Trying tunnel (ngrok)… if it fails, fallback to LAN exp://$IP:$PORT"
  npx expo start --tunnel --clear --port $PORT || {
    echo ""
    echo "✗ Tunnel failed (ngrok outage). Falling back to LAN…"
    echo "  Manually enter in Expo Go: exp://$IP:$PORT"
    exec npx expo start --lan --clear --host $IP --port $PORT
  }
  exit 0
fi

# Default: lan
echo "→ LAN: exp://$IP:$PORT (use this if QR shows exp.direct and fails)"
echo "  If phone can't connect, ensure iPhone + Mac on same Hotspot SSID and try 'exp://$IP:$PORT' manually in Expo Go → Enter URL"
exec npx expo start --lan --clear --host $IP --port $PORT
