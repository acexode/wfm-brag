#!/usr/bin/env bash
# Waits for shift hours (07:05 UTC), records scene 08 (Real-Time) and re-assembles the video.
set -e
export MSYS_NO_PATHCONV=1
target=$(date -u -d "$(date -u +%Y-%m-%d) ${RT_AT:-13:35}" +%s)
now=$(date -u +%s)
[ "$now" -ge "$target" ] && target=$((target + 86400))
echo "waiting until $(date -u -d @$target)"
sleep $((target - now))
for p in 3000 4501 4502 4503 4504 4508 4510 4511; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:$p/health || true)
  [ "$code" = "200" ] || { echo "SERVICE-DOWN $p"; exit 3; }
done
npx tsx scenes/realtime.ts s08
npx tsx assemble.ts
echo REALTIME-DONE
