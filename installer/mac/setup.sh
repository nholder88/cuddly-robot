#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_SOURCE_REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

INSTALL_ROOT="${HOME}/Library/Application Support/ai-agent-workflows-pack"
SOURCE_REPO_PATH="${DEFAULT_SOURCE_REPO}"
VSCODE_PROMPTS_PATH="${HOME}/Library/Application Support/Code/User/prompts"
CURSOR_PROMPTS_PATH="${HOME}/Library/Application Support/Cursor/User/prompts"
SKIP_VSCODE=0
SKIP_CURSOR=0
FORCE=0

log_info() { printf '[INFO] %s\n' "$1"; }
log_ok() { printf '[OK] %s\n' "$1"; }
log_warn() { printf '[WARN] %s\n' "$1"; }
fail() { printf '[ERROR] %s\n' "$1" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./setup.sh [options]

Options:
  --install-root <path>          Managed metadata root
  --source-repo-path <path>      Source repo containing "agents" and "templates"
  --vscode-prompts-path <path>   VS Code prompts target path
  --cursor-prompts-path <path>   Cursor prompts target path
  --skip-vscode                  Skip VS Code target
  --skip-cursor                  Skip Cursor target
  --force                        Compatibility flag (currently informational)
  -h, --help                     Show this help
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
    --vscode-prompts-path)
      VSCODE_PROMPTS_PATH="$2"
      shift 2
      ;;
    --cursor-prompts-path)
      CURSOR_PROMPTS_PATH="$2"
      shift 2
      ;;
    --skip-vscode)
      SKIP_VSCODE=1
      shift
      ;;
    --skip-cursor)
      SKIP_CURSOR=1
      shift
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

if [[ "$FORCE" -eq 1 ]]; then
  log_info "--force specified (compatibility mode)."
fi

SOURCE_REPO_PATH="$(cd "$SOURCE_REPO_PATH" && pwd)"
AGENTS_SOURCE="$SOURCE_REPO_PATH/agents"
TEMPLATES_SOURCE="$SOURCE_REPO_PATH/templates"

[[ -d "$AGENTS_SOURCE" ]] || fail "Required source folder not found: $AGENTS_SOURCE"
[[ -d "$TEMPLATES_SOURCE" ]] || fail "Required source folder not found: $TEMPLATES_SOURCE"

mkdir -p "$INSTALL_ROOT"
MANAGED_MARKER_PATH="$INSTALL_ROOT/.managed-by-ai-agent-workflows"
MANIFEST_PATH="$INSTALL_ROOT/install-manifest.json"
INSTALLED_FILES_PATH="$INSTALL_ROOT/installed-files.txt"

printf 'managed=true\n' > "$MANAGED_MARKER_PATH"
: > "$INSTALLED_FILES_PATH"

PACKAGE_VERSION="unknown"
if [[ -f "$SOURCE_REPO_PATH/package.json" ]] && command -v python3 >/dev/null 2>&1; then
  PACKAGE_VERSION="$(python3 - <<'PY' "$SOURCE_REPO_PATH/package.json"
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    data = json.load(f)
print(data.get('version', 'unknown'))
PY
)"
fi

copy_target() {
  local target_name="$1"
  local prompts_path="$2"

  mkdir -p "$prompts_path"
  local templates_target_path="$prompts_path/templates"
  mkdir -p "$templates_target_path"

  local agent_count=0
  while IFS= read -r -d '' file; do
    local base
    base="$(basename "$file")"
    cp -f "$file" "$prompts_path/$base"
    printf '%s\n' "$prompts_path/$base" >> "$INSTALLED_FILES_PATH"
    agent_count=$((agent_count + 1))
  done < <(find "$AGENTS_SOURCE" -type f -name '*.agent.md' -print0)

  local template_count=0
  while IFS= read -r -d '' file; do
    local rel
    rel="${file#${TEMPLATES_SOURCE}/}"
    local target_file="$templates_target_path/$rel"
    mkdir -p "$(dirname "$target_file")"
    cp -f "$file" "$target_file"
    printf '%s\n' "$target_file" >> "$INSTALLED_FILES_PATH"
    template_count=$((template_count + 1))
  done < <(find "$TEMPLATES_SOURCE" -type f -print0)

  log_info "Target [$target_name] prompts: $prompts_path"
  log_info "  Agents copied   : $agent_count"
  log_info "  Templates copied: $template_count"
}

TARGET_COUNT=0
if [[ "$SKIP_VSCODE" -eq 0 ]]; then
  copy_target "vscode" "$VSCODE_PROMPTS_PATH"
  TARGET_COUNT=$((TARGET_COUNT + 1))
fi
if [[ "$SKIP_CURSOR" -eq 0 ]]; then
  copy_target "cursor" "$CURSOR_PROMPTS_PATH"
  TARGET_COUNT=$((TARGET_COUNT + 1))
fi

[[ "$TARGET_COUNT" -gt 0 ]] || fail "Nothing to install. Remove --skip-vscode/--skip-cursor exclusions."

if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PY' "$MANIFEST_PATH" "$INSTALL_ROOT" "$SOURCE_REPO_PATH" "$MANAGED_MARKER_PATH" "$PACKAGE_VERSION" "$VSCODE_PROMPTS_PATH" "$CURSOR_PROMPTS_PATH" "$SKIP_VSCODE" "$SKIP_CURSOR" "$INSTALLED_FILES_PATH"
import json
import sys
from datetime import datetime, timezone

manifest_path = sys.argv[1]
install_root = sys.argv[2]
source_repo = sys.argv[3]
managed_marker = sys.argv[4]
package_version = sys.argv[5]
vscode_prompts = sys.argv[6]
cursor_prompts = sys.argv[7]
skip_vscode = sys.argv[8] == '1'
skip_cursor = sys.argv[9] == '1'
files_path = sys.argv[10]

with open(files_path, 'r', encoding='utf-8') as f:
    installed_files = [line.strip() for line in f if line.strip()]

targets = []
if not skip_vscode:
    targets.append({
        'target': 'vscode',
        'promptsPath': vscode_prompts,
        'templatesPath': f'{vscode_prompts}/templates',
    })
if not skip_cursor:
    targets.append({
        'target': 'cursor',
        'promptsPath': cursor_prompts,
        'templatesPath': f'{cursor_prompts}/templates',
    })

manifest = {
    'schemaVersion': 2,
    'packageVersion': package_version,
    'installedAtUtc': datetime.now(timezone.utc).isoformat(),
    'installRoot': install_root,
    'sourceRepoPath': source_repo,
    'managedMarker': managed_marker,
    'targets': targets,
    'installedFiles': installed_files,
}

with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)
PY
else
  log_warn "python3 not found; writing minimal text manifest fallback."
  {
    printf 'schemaVersion=2\n'
    printf 'installRoot=%s\n' "$INSTALL_ROOT"
    printf 'sourceRepoPath=%s\n' "$SOURCE_REPO_PATH"
    printf 'vscodePromptsPath=%s\n' "$VSCODE_PROMPTS_PATH"
    printf 'cursorPromptsPath=%s\n' "$CURSOR_PROMPTS_PATH"
  } > "$MANIFEST_PATH"
fi

log_ok "Quick macOS install complete."
log_info "Install root (manifest): $INSTALL_ROOT"
log_info "Manifest: $MANIFEST_PATH"
