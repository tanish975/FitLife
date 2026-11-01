#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="${1:-$ROOT/../FitLife.apk}"
TOOLS="${ANDROID_BUILD_TOOLS_DIR:-${ANDROID_HOME:-}/build-tools/33.0.2}"
CODE="${FITLIFE_VERSION_CODE:-2}"
NAME="${FITLIFE_VERSION_NAME:-1.0.$CODE}"
[[ -f "$APK" && -f "$ROOT/../FitLife-App.html" ]] || { echo 'Missing APK or standalone HTML.' >&2; exit 1; }
badging="$("$TOOLS/aapt" dump badging "$APK")"
[[ "$badging" == *"package: name='com.tanish.fitlife' versionCode='$CODE' versionName='$NAME'"* ]] || { echo 'Incorrect Android package or version.' >&2; exit 1; }
[[ "$badging" == *"sdkVersion:'26'"* ]] || { echo 'Incorrect minimum Android version.' >&2; exit 1; }
"$TOOLS/apksigner" verify --verbose --min-sdk-version 26 "$APK" > /dev/null
fingerprint="$("$TOOLS/apksigner" verify --print-certs "$APK" | sed -n 's/.*certificate SHA-256 digest: //p' | head -1 | tr '[:upper:]' '[:lower:]')"
expected="$(tr -d '[:space:]' < "$ROOT/android/signing-cert.sha256" | tr '[:upper:]' '[:lower:]')"
[[ "$fingerprint" == "$expected" ]] || { echo 'APK certificate differs from the update-compatible signing certificate.' >&2; exit 1; }
embedded="$(unzip -p "$APK" assets/index.html | sha256sum | cut -d' ' -f1)"
standalone="$(sha256sum "$ROOT/../FitLife-App.html" | cut -d' ' -f1)"
[[ "$embedded" == "$standalone" ]] || { echo 'APK embedded app differs from the standalone build.' >&2; exit 1; }
echo "PASS: APK $NAME, versionCode $CODE, Android 8+, expected signer and matching embedded app."
