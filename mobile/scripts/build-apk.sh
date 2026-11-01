#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="${ANDROID_BUILD_TOOLS_DIR:-${ANDROID_HOME:-}/build-tools/33.0.2}"
PLATFORM="${ANDROID_JAR:-${ANDROID_HOME:-}/platforms/android-33/android.jar}"
STANDALONE="${FITLIFE_STANDALONE:-$ROOT/../FitLife-App.html}"
OUTPUT="${FITLIFE_APK_OUTPUT:-$ROOT/../FitLife.apk}"
KEY="${FITLIFE_SIGNING_KEY:-$ROOT/.signing/development-key.pk8}"
CERT="${FITLIFE_SIGNING_CERT:-$ROOT/.signing/development-cert.pem}"
VERSION_CODE="${FITLIFE_VERSION_CODE:-2}"
VERSION_NAME="${FITLIFE_VERSION_NAME:-1.0.$VERSION_CODE}"

for program in aapt2 d8 zipalign apksigner; do
  if [[ ! -x "$TOOLS/$program" ]]; then echo "Missing $program in $TOOLS. Set ANDROID_BUILD_TOOLS_DIR." >&2; exit 1; fi
done
if [[ ! -f "$PLATFORM" ]]; then echo 'Set ANDROID_JAR to an Android 33 android.jar.' >&2; exit 1; fi
if [[ ! -f "$STANDALONE" ]]; then echo 'Build the standalone HTML first: npm run build:standalone' >&2; exit 1; fi
if [[ ! -f "$KEY" || ! -f "$CERT" ]]; then
  echo 'Signing key/certificate missing. Release builds never generate a replacement key automatically.' >&2; exit 1
fi
if [[ ! "$VERSION_CODE" =~ ^[1-9][0-9]{0,9}$ ]] || (( VERSION_CODE > 2100000000 )); then
  echo 'FITLIFE_VERSION_CODE must be a positive Android version code (at most 2100000000).' >&2; exit 1
fi
if [[ ! "$VERSION_NAME" =~ ^[0-9]{1,4}\.[0-9]{1,4}\.[1-9][0-9]{0,9}$ ]] || [[ "${VERSION_NAME##*.}" != "$VERSION_CODE" ]]; then
  echo 'FITLIFE_VERSION_NAME must be major.minor.VERSION_CODE, e.g. 1.0.2.' >&2; exit 1
fi
EXPECTED="$(tr -d '[:space:]' < "$ROOT/android/signing-cert.sha256" | tr '[:upper:]' '[:lower:]')"
ACTUAL="$(openssl x509 -in "$CERT" -outform DER | sha256sum | cut -d' ' -f1)"
if [[ "$EXPECTED" != "$ACTUAL" ]]; then
  echo 'Signing certificate does not match android/signing-cert.sha256; aborting to protect in-place updates.' >&2; exit 1
fi

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/assets" "$WORK/generated" "$WORK/classes" "$WORK/dex"
cp "$STANDALONE" "$WORK/assets/index.html"
"$TOOLS/aapt2" compile --dir "$ROOT/android/res" -o "$WORK/resources.zip"
"$TOOLS/aapt2" link -I "$PLATFORM" --manifest "$ROOT/android/AndroidManifest.xml" \
  --java "$WORK/generated" -A "$WORK/assets" --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -o "$WORK/unsigned.apk" "$WORK/resources.zip"
mapfile -t JAVA_FILES < <(find "$ROOT/android/src" "$WORK/generated" -name '*.java' -print)
javac -encoding UTF-8 -source 8 -target 8 -classpath "$PLATFORM" -d "$WORK/classes" "${JAVA_FILES[@]}"
(cd "$WORK/classes" && zip -qr "$WORK/classes.zip" .)
"$TOOLS/d8" --min-api 26 --lib "$PLATFORM" --output "$WORK/dex" "$WORK/classes.zip"
(cd "$WORK/dex" && zip -q "$WORK/unsigned.apk" classes.dex)
"$TOOLS/zipalign" -f 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"
"$TOOLS/apksigner" sign --key "$KEY" --cert "$CERT" --v4-signing-enabled false --out "$WORK/FitLife.apk" "$WORK/aligned.apk"
"$TOOLS/apksigner" verify --verbose --min-sdk-version 26 "$WORK/FitLife.apk"
mkdir -p "$(dirname "$OUTPUT")"
cp "$WORK/FitLife.apk" "$OUTPUT"
# Preserve the in-app/preview download path for local builds, too.
if [[ "${FITLIFE_COPY_PUBLIC_APK:-1}" == 1 ]]; then cp "$WORK/FitLife.apk" "$ROOT/public/FitLife.apk"; fi
echo "Signed FitLife $VERSION_NAME (Android versionCode $VERSION_CODE): $OUTPUT"
