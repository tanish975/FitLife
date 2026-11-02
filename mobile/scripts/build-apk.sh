#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="${ANDROID_BUILD_TOOLS_DIR:-${ANDROID_HOME:-}/build-tools/36.0.0}"
STANDALONE="${FITLIFE_STANDALONE:-$ROOT/../FitLife-App.html}"
OUTPUT="${FITLIFE_APK_OUTPUT:-$ROOT/../FitLife.apk}"
KEY="${FITLIFE_SIGNING_KEY:-$ROOT/.signing/development-key.pk8}"
CERT="${FITLIFE_SIGNING_CERT:-$ROOT/.signing/development-cert.pem}"
VERSION_CODE="${FITLIFE_VERSION_CODE:-5}"
VERSION_NAME="${FITLIFE_VERSION_NAME:-1.0.$VERSION_CODE}"
for program in zipalign apksigner; do
  if [[ ! -x "$TOOLS/$program" ]]; then echo "Missing $program in $TOOLS. Set ANDROID_BUILD_TOOLS_DIR." >&2; exit 1; fi
done
if [[ ! -f "$STANDALONE" ]]; then echo 'Build the standalone HTML first: npm run build:standalone' >&2; exit 1; fi
if [[ ! -f "$KEY" || ! -f "$CERT" ]]; then echo 'Signing key/certificate missing. Release builds never generate a replacement key automatically.' >&2; exit 1; fi
if [[ ! "$VERSION_CODE" =~ ^[1-9][0-9]{0,9}$ ]] || (( VERSION_CODE > 2100000000 )); then echo 'FITLIFE_VERSION_CODE must be a positive Android version code (at most 2100000000).' >&2; exit 1; fi
if [[ ! "$VERSION_NAME" =~ ^[0-9]{1,4}\.[0-9]{1,4}\.[1-9][0-9]{0,9}$ ]] || [[ "${VERSION_NAME##*.}" != "$VERSION_CODE" ]]; then echo 'FITLIFE_VERSION_NAME must be major.minor.VERSION_CODE, e.g. 1.0.5.' >&2; exit 1; fi
EXPECTED="$(tr -d '[:space:]' < "$ROOT/android/signing-cert.sha256" | tr '[:upper:]' '[:lower:]')"
ACTUAL="$(openssl x509 -in "$CERT" -outform DER | sha256sum | cut -d' ' -f1)"
[[ "$EXPECTED" == "$ACTUAL" ]] || { echo 'Signing certificate does not match android/signing-cert.sha256; aborting to protect in-place updates.' >&2; exit 1; }
[[ -f "$ROOT/android/google-services.json" ]] || { echo 'Firebase Android configuration is missing.' >&2; exit 1; }

# Health Connect requires compileSdk 36. Some CI images only preinstall SDK 35;
# use the existing, free Android command-line SDK manager if 36 is missing.
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -n "$SDK" && ! -f "$SDK/platforms/android-36/android.jar" ]]; then
  MANAGER="$SDK/cmdline-tools/latest/bin/sdkmanager"
  if [[ ! -x "$MANAGER" ]]; then echo 'Android SDK platform 36 is required; install it with sdkmanager.' >&2; exit 1; fi
  "$MANAGER" --sdk_root="$SDK" 'platforms;android-36'
fi

# Retain the exact file:///android_asset/index.html origin used by older APKs.
mkdir -p "$ROOT/android/build/generated-fitlife-assets"
cp "$STANDALONE" "$ROOT/android/build/generated-fitlife-assets/index.html"
(cd "$ROOT/android" && ./gradlew --no-daemon -PfitlifeVersionCode="$VERSION_CODE" -PfitlifeVersionName="$VERSION_NAME" assembleRelease)
UNSIGNED="$ROOT/android/build/outputs/apk/release/FitLife-release-unsigned.apk"
[[ -f "$UNSIGNED" ]] || { echo "Gradle did not create $UNSIGNED" >&2; exit 1; }
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
"$TOOLS/zipalign" -f 4 "$UNSIGNED" "$WORK/aligned.apk"
"$TOOLS/apksigner" sign --key "$KEY" --cert "$CERT" --v4-signing-enabled false --out "$WORK/FitLife.apk" "$WORK/aligned.apk"
"$TOOLS/apksigner" verify --verbose --min-sdk-version 26 "$WORK/FitLife.apk"
mkdir -p "$(dirname "$OUTPUT")"
cp "$WORK/FitLife.apk" "$OUTPUT"
if [[ "${FITLIFE_COPY_PUBLIC_APK:-1}" == 1 ]]; then cp "$WORK/FitLife.apk" "$ROOT/public/FitLife.apk"; fi
echo "Signed FitLife $VERSION_NAME (Android versionCode $VERSION_CODE): $OUTPUT"
