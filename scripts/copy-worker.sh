#!/usr/bin/env bash
# copy-worker.sh
# Copies the SpessaSynth AudioWorklet processor to public/workers/
# Run this once after `pnpm install` and after any SpessaSynth version upgrade.
#
# Usage: bash scripts/copy-worker.sh

set -euo pipefail

WORKER_SRC="node_modules/spessasynth_lib/src/spessasynth_lib/synthetizer/worklet_system/worklet_processor.js"
WORKER_DST="public/workers/spessasynth_processor.min.js"

if [ ! -f "$WORKER_SRC" ]; then
  echo "ERROR: SpessaSynth processor not found at $WORKER_SRC"
  echo "       Run 'pnpm install' first."
  exit 1
fi

mkdir -p "$(dirname "$WORKER_DST")"
cp "$WORKER_SRC" "$WORKER_DST"
echo "✓ SpessaSynth processor copied to $WORKER_DST"
