#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT_DIR="$SCRIPT_DIR/out"
PAYLOAD_ROOT="$SCRIPT_DIR/work/payload"
SCRIPTS_DIR="$SCRIPT_DIR/work/scripts"
PKG_ID="com.nholder88.ai-agent-workflows-pack"
PKG_VERSION="1.0.0"
PKG_NAME="AI-Agent-Workflows-Pack-macOS.pkg"

log_info() { printf '[INFO] %s\n' "$1"; }
fail() { printf '[ERROR] %s\n' "$1" >&2; exit 1; }

if ! command -v pkgbuild >/dev/null 2>&1; then
  fail "pkgbuild not found. Run this script on macOS with Xcode command line tools installed."
fi

rm -rf "$SCRIPT_DIR/work"
mkdir -p "$PAYLOAD_ROOT" "$SCRIPTS_DIR" "$OUT_DIR"

# Copy source payload into package working folder.
cp -R "$REPO_ROOT" "$PAYLOAD_ROOT/repo"
rm -rf "$PAYLOAD_ROOT/repo/.git" "$PAYLOAD_ROOT/repo/node_modules" "$PAYLOAD_ROOT/repo/dist" "$PAYLOAD_ROOT/repo/build" "$PAYLOAD_ROOT/repo/agent-progress" || true
# Remove any nested agent-progress folders from staged payload.
find "$PAYLOAD_ROOT/repo" -type d -name 'agent-progress' -prune -exec rm -rf {} + || true

cat > "$SCRIPTS_DIR/postinstall" <<'EOF'
#!/bin/bash
set -euo pipefail

PAYLOAD_REPO="/tmp/ai-agent-workflows-pack/repo"
if [[ ! -d "$PAYLOAD_REPO" ]]; then
  exit 1
fi

bash "$PAYLOAD_REPO/installer/mac/setup.sh" --source-repo-path "$PAYLOAD_REPO" || exit 1
exit 0
EOF
chmod +x "$SCRIPTS_DIR/postinstall"

# Install payload to /tmp so setup.sh can copy into user prompts paths.
PKG_PATH="$OUT_DIR/$PKG_NAME"
pkgbuild \
  --identifier "$PKG_ID" \
  --version "$PKG_VERSION" \
  --root "$PAYLOAD_ROOT" \
  --install-location "/tmp/ai-agent-workflows-pack" \
  --scripts "$SCRIPTS_DIR" \
  "$PKG_PATH"

log_info "PKG created: $PKG_PATH"
