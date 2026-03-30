#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/setup.sh"
DEFAULT_SOURCE_REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

INSTALL_ROOT="${HOME}/Library/Application Support/ai-agent-workflows-pack"
SOURCE_REPO_PATH=""
FORCE=0

log_info() { printf '[INFO] %s\n' "$1"; }
fail() { printf '[ERROR] %s\n' "$1" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./update.sh [options]

Options:
  --install-root <path>      Managed metadata root
  --source-repo-path <path>  Source repo path override
  --force                    Forward --force to setup
  -h, --help                 Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-root)
      INSTALL_ROOT="$2"
      shift 2
      ;;
    --source-repo-path)
      SOURCE_REPO_PATH="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

[[ -f "$SETUP_SCRIPT" ]] || fail "Setup script not found next to update script: $SETUP_SCRIPT"

if [[ -z "$SOURCE_REPO_PATH" ]] && [[ -d "$DEFAULT_SOURCE_REPO/agents" ]] && [[ -d "$DEFAULT_SOURCE_REPO/templates" ]]; then
  SOURCE_REPO_PATH="$DEFAULT_SOURCE_REPO"
  log_info "Using local source repo next to installer scripts: $SOURCE_REPO_PATH"
fi

MANIFEST_PATH="$INSTALL_ROOT/install-manifest.json"
if [[ -z "$SOURCE_REPO_PATH" ]] && [[ -f "$MANIFEST_PATH" ]] && command -v python3 >/dev/null 2>&1; then
  SOURCE_REPO_PATH="$(python3 - <<'PY' "$MANIFEST_PATH"
import json, sys
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(data.get('sourceRepoPath', ''))
except Exception:
    print('')
PY
)"
  if [[ -n "$SOURCE_REPO_PATH" ]]; then
    log_info "Using source repo from manifest: $SOURCE_REPO_PATH"
  fi
fi

args=("--install-root" "$INSTALL_ROOT")
if [[ -n "$SOURCE_REPO_PATH" ]]; then
  args+=("--source-repo-path" "$SOURCE_REPO_PATH")
fi
if [[ "$FORCE" -eq 1 ]]; then
  args+=("--force")
fi

log_info "Running setup.sh in update mode..."
bash "$SETUP_SCRIPT" "${args[@]}"
printf '[OK] Update complete.\n'
