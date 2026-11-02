#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
javac -encoding UTF-8 -d "$WORK" \
  "$ROOT/android/tests/org/json/JSONObject.java" "$ROOT/android/tests/org/json/JSONArray.java" \
  "$ROOT/android/src/com/tanish/fitlife/ReleaseParser.java" "$ROOT/android/tests/com/tanish/fitlife/ReleaseParserTest.java" \
  "$ROOT/android/src/com/tanish/fitlife/BackupTransfer.java" "$ROOT/android/tests/com/tanish/fitlife/BackupTransferTest.java" \
  "$ROOT/android/src/com/tanish/fitlife/StepCounterMath.java" "$ROOT/android/tests/com/tanish/fitlife/StepCounterMathTest.java"
java -cp "$WORK" com.tanish.fitlife.ReleaseParserTest
java -cp "$WORK" com.tanish.fitlife.BackupTransferTest
java -cp "$WORK" com.tanish.fitlife.StepCounterMathTest
mkdir -p "$WORK/ledger"
javac -encoding UTF-8 -d "$WORK/ledger" \
  "$ROOT"/android/tests/vendor/org/json/*.java \
  "$ROOT/android/tests/android/content/Context.java" "$ROOT/android/tests/android/util/AtomicFile.java" \
  "$ROOT/android/src/com/tanish/fitlife/StepLedger.java" "$ROOT/android/tests/com/tanish/fitlife/StepLedgerTest.java"
java -cp "$WORK/ledger" com.tanish.fitlife.StepLedgerTest
