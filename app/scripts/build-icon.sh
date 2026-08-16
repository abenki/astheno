#!/usr/bin/env bash
# Recompiles brand/astheno.icon (Icon Composer project) into the derived,
# committed assets the app actually reads:
#   - build/icon.icns      electron-builder's default packaged-app icon fallback
#   - resources/icon.png   dev-mode Dock icon (see src/main/index.ts, app.dock.setIcon)
#
# Re-run this after editing the .icon file in Icon Composer — nothing
# regenerates these automatically. Requires Xcode 26+ (for `actool`).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ICON="$APP_DIR/../brand/astheno.icon"
BUILD_ICNS="$APP_DIR/build/icon.icns"
DEV_ICON_PNG="$APP_DIR/resources/icon.png"

if ! xcrun -f actool >/dev/null 2>&1; then
  echo "error: actool not found. Install Xcode 26+ (actool ships with it)." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp -R "$SOURCE_ICON" "$TMP_DIR/Icon.icon"
mkdir -p "$TMP_DIR/out"

xcrun actool "$TMP_DIR/Icon.icon" \
  --compile "$TMP_DIR/out" \
  --output-format human-readable-text \
  --notices --warnings \
  --output-partial-info-plist "$TMP_DIR/out/assetcatalog_generated_info.plist" \
  --app-icon Icon \
  --include-all-app-icons \
  --accent-color AccentColor \
  --enable-on-demand-resources NO \
  --development-region en \
  --target-device mac \
  --minimum-deployment-target 26.0 \
  --platform macosx

mkdir -p "$APP_DIR/build" "$APP_DIR/resources"
cp "$TMP_DIR/out/Icon.icns" "$BUILD_ICNS"

iconutil -c iconset "$TMP_DIR/out/Icon.icns" -o "$TMP_DIR/Icon.iconset"
cp "$TMP_DIR/Icon.iconset/icon_128x128@2x.png" "$DEV_ICON_PNG"

echo "wrote $BUILD_ICNS"
echo "wrote $DEV_ICON_PNG"
