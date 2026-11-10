#!/usr/bin/env bash
# Records every app scene in narration order (Real-Time, s08, is recorded separately in shift hours).
set -e
export MSYS_NO_PATHCONV=1
npx tsx scenes/onboarding.ts s01 s02 s03
npx tsx scenes/scheduling.ts s05
npx tsx scenes/pages.ts s04 s06 s07 s09 s10 s11 s12
echo ALL-DONE
