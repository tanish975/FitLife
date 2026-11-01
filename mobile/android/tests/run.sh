#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
javac -encoding UTF-8 -d "$WORK" \
  "$ROOT/android/tests/org/json/JSONObject.java" "$ROOT/android/tests/org/json/JSONArray.java" \
  "$ROOT/android/src/com/tanish/fitlife/ReleaseParser.java" "$ROOT/android/tests/com/tanish/fitlife/ReleaseParserTest.java"
java -cp "$WORK" com.tanish.fitlife.ReleaseParserTest
