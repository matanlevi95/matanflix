#!/usr/bin/env bash
#
# Build a signed Android APK for MyTV.
#
# Two modes:
#   1. cloud   (default) — EAS Build. Easiest; Expo manages the keystore.
#   2. local             — `expo prebuild` + Gradle on this machine
#                          (needs Android SDK + JDK 17).
#
# Usage:
#   ./scripts/build-apk.sh            # cloud build, 'production-apk' profile
#   ./scripts/build-apk.sh local      # local gradle build
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
MODE="${1:-cloud}"

cd "$FRONTEND"

echo "==> Installing JS dependencies"
if command -v npm >/dev/null 2>&1; then
  npm install
fi

if [ "$MODE" = "local" ]; then
  echo "==> Local APK build (Gradle)"
  npx expo prebuild --platform android --clean

  cd android
  echo "==> Assembling release APK"
  ./gradlew assembleRelease

  APK="$FRONTEND/android/app/build/outputs/apk/release/app-release.apk"
  echo ""
  echo "✅ APK built:"
  echo "   $APK"
  echo ""
  echo "If unsigned, sign it with your keystore:"
  echo "   apksigner sign --ks my-release-key.jks $APK"
else
  echo "==> Cloud APK build via EAS"
  if ! command -v eas >/dev/null 2>&1; then
    echo "Installing eas-cli..."
    npm install -g eas-cli
  fi

  # Logs you in if needed and creates a managed keystore on first run.
  eas build --platform android --profile production-apk --non-interactive || \
  eas build --platform android --profile production-apk

  echo ""
  echo "✅ Build submitted. The signed APK download link will be printed above"
  echo "   and is also available at https://expo.dev/accounts/<you>/projects/mytv/builds"
fi
