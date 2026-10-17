#!/bin/sh
# Rebuild "A Spoonful of Gold" from scratch.  sh build.sh   (set LIB to the lemo-opuscar library folder if it isn't ~/lemo-opuscar)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY=.venv/bin/python
mkdir -p "$HERE/out"
$PY core/tts/tts.py "$HERE/lines.json" "$HERE/voices"                 # narration (Kokoro, offline)
node core/render/events.mjs "$HERE"                                    # timeline -> events.json
$PY "$HERE/score.py"                                                   # original score
$PY "$HERE/mix.py"                                                     # foley + ambience + voice + score -> out/mix.wav
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
CRF=24 sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/spoonful-of-gold.mp4" 24 0
