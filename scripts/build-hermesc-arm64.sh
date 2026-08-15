#!/usr/bin/env bash
# Build a NATIVE aarch64 hermesc on-device (Termux + proot Ubuntu).
#
# Why: React Native ships hermesc prebuilts only for x86_64 (linux64/osx/win64).
# On an arm64 phone, `expo export` for release therefore fails with
# "Unsupported host platform for Hermes compiler: android". This script
# compiles Hermes's compiler from source for your own CPU and wires it into
# expo via REACT_NATIVE_OVERRIDE_HERMES_DIR.
#
# Usage:  scripts/build-hermesc-arm64.sh   (run from the repo root)
#
# Prereqs: proot-distro Ubuntu with apt + ~1.5GB free. Takes 15-40 min.
# Re-run after any `npm install` (it re-applies the expo platform patch).
set -euo pipefail

cd "$(dirname "$0")/.."
APP=apps/mobile
OVERRIDE="$APP/hermesc-override"
HERMES_SRC=/tmp/hermes-src
JOBS=$(( $(nproc 2>/dev/null || echo 4) ))
[ "$JOBS" -gt 4 ] && JOBS=4

TAG_FILE="$APP/node_modules/react-native/sdks/.hermesversion"
if [ ! -f "$TAG_FILE" ]; then
  echo "! react-native not installed yet — run: cd $APP && npm install"
  exit 1
fi
TAG="$(cat "$TAG_FILE" | tr -d '[:space:]')"
echo "== Hermes compiler tag: $TAG"

if [ -x "$OVERRIDE/build/bin/hermesc" ]; then
  echo "== hermesc already built at $OVERRIDE/build/bin/hermesc"
else
  echo "== Installing build toolchain (clang, cmake, ninja)..."
  apt-get install -y -qq clang cmake ninja-build git python3 >/dev/null 2>&1 || {
    apt-get update -qq && apt-get install -y -qq clang cmake ninja-build git python3 >/dev/null 2>&1; }

  echo "== Fetching hermes @ $TAG..."
  rm -rf "$HERMES_SRC"
  git clone -q --depth 1 --branch "$TAG" https://github.com/facebook/hermes.git "$HERMES_SRC"

  echo "== Configuring hermesc-only build..."
  cmake -S "$HERMES_SRC" -B "$HERMES_SRC/build" \
    -DHERMES_BUILD_HERMESC_ONLY=ON \
    -DCMAKE_BUILD_TYPE=Release \
    -G Ninja

  echo "== Compiling hermesc (-j$JOBS)..."
  cmake --build "$HERMES_SRC/build" --target hermesc -j"$JOBS"

  mkdir -p "$OVERRIDE/build/bin"
  cp "$HERMES_SRC/build/bin/hermesc" "$OVERRIDE/build/bin/hermesc"
  rm -rf "$HERMES_SRC"
  echo "== Installed arm64 hermesc"
fi

echo "== Patching expo's host-platform check (android -> linux64-bin)..."
PATCH="$APP/node_modules/expo/node_modules/@expo/metro-config/build/serializer/exportHermes.js"
if [ -f "$PATCH" ] && ! grep -q "case 'android'" "$PATCH"; then
  sed -i "s/        case 'win32':/        case 'android':\n            return 'linux64-bin\/hermesc';\n        case 'win32':/" "$PATCH"
  echo "== Patched $PATCH"
else
  echo "== Patch already applied or package layout changed — re-run after npm install."
fi

echo
echo "== Done. To build with the on-device hermesc:"
echo "   export REACT_NATIVE_OVERRIDE_HERMES_DIR=$PWD/$OVERRIDE"
echo "   cd $APP && npx expo export --platform android   # release-style .hbc bundle"
echo
echo "   (gradle release builds in Termux pick up the same env var.)"
