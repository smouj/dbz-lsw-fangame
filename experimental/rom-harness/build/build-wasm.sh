#!/usr/bin/env bash
# build-wasm.sh — compila SameBoy CORE API + thin wrapper a WASM (spike H0).
# Pin por commit exacto. Reproducible: ver build/sameboy-version.json.
set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$HARNESS_DIR/build/out"
SAMEBOY_COMMIT="213a12ce93d66b105a113debd9396306066a7cfc"
SAMEBOY_DIR="${SAMEBOY_DIR:-/home/local-user/sameboy}"

# Emscripten
if [ -f /home/local-user/emsdk/emsdk_env.sh ]; then
  . /home/local-user/emsdk/emsdk_env.sh
fi
command -v emcc >/dev/null || { echo "emcc no encontrado; source emsdk_env.sh" >&2; exit 1; }

# Verificar commit (warn, no hard-fail, para permitir iterar local)
ACTUAL="$(git -C "$SAMEBOY_DIR" rev-parse HEAD 2>/dev/null || echo '?')"
if [ "$ACTUAL" != "$SAMEBOY_COMMIT" ]; then
  echo "WARN: SameBoy HEAD=$ACTUAL != pinned $SAMEBOY_COMMIT" >&2
fi

mkdir -p "$OUT_DIR"

# Core sources: lista EXACTA del core (misma que libretro/Makefile.common, sin printer/workboy/bootroms)
CORE_SOURCES=""
for f in gb sgb apu memory mbc timing display camera sm83_cpu joypad save_state random rumble; do
  CORE_SOURCES="$CORE_SOURCES $SAMEBOY_DIR/Core/$f.c"
done

emcc -O2 \
  -I"$SAMEBOY_DIR/Core" -I"$SAMEBOY_DIR" \
  -DGB_INTERNAL \
  -DGB_DISABLE_TIMEKEEPING -DGB_DISABLE_REWIND -DGB_DISABLE_DEBUGGER \
  -DGB_DISABLE_CHEATS -DGB_DISABLE_CHEAT_SEARCH \
  -DGB_VERSION='"H0"' -DGB_COPYRIGHT_YEAR='"2026"' \
  -std=gnu11 -D_GNU_SOURCE \
  $CORE_SOURCES "$HARNESS_DIR/core/sameboy_harness.c" \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createSameBoyHarness \
  -sASSERTIONS=1 --profiling-funcs \
  -sEXPORTED_FUNCTIONS='["_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["HEAPU8","HEAPU32","getValue","setValue"]' \
  -sALLOW_MEMORY_GROWTH=1 \
  -sENVIRONMENT=web,node \
  -o "$OUT_DIR/sameboy_harness.mjs"

echo "OK -> $OUT_DIR/sameboy_harness.mjs + .wasm"
ls -la "$OUT_DIR"
