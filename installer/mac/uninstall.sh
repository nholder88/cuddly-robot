#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="${HOME}/Library/Application Support/ai-agent-workflows-pack"
REMOVE_INSTALL_ROOT=0
FORCE=0

log_info() { printf '[INFO] %s\n' "$1"; }
log_ok() { printf '[OK] %s\n' "$1"; }
log_warn() { printf '[WARN] %s\n' "$1"; }
fail() { printf '[ERROR] %s\n' "$1" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [options]

Options:
  --install-root <path>   Managed metadata root
  --remove-install-root   Remove install root if empty
  --force                 Bypass managed-root safety check
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-root)
      INSTALL_ROOT="$2"
      shift 2
      ;;
    --remove-install-root)
      REMOVE_INSTALL_ROOT=1
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

if [[ ! -d "$INSTALL_ROOT" ]]; then
  log_info "Install root does not exist; nothing to uninstall: $INSTALL_ROOT"
  exit 0
fi

MARKER_PATH="$INSTALL_ROOT/.managed-by-ai-agent-workflows"
MANIFEST_PATH="$INSTALL_ROOT/install-manifest.json"
FILES_PATH="$INSTALL_ROOT/installed-files.txt"

if [[ (! -f "$MARKER_PATH" || ! -f "$MANIFEST_PATH") && "$FORCE" -ne 1 ]]; then
  fail "Refusing uninstall because root is not recognized as managed by this installer: $INSTALL_ROOT"
fi

if [[ -f "$FILES_PATH" ]]; then
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    if [[ -f "$file" ]]; then
      rm -f "$file"
    fi
  done < "$FILES_PATH"
  log_info "Removed files listed in $FILES_PATH"
else
  log_warn "Installed files list missing; no per-file cleanup performed."
fi

if [[ -f "$MANIFEST_PATH" ]] && command -v python3 >/dev/null 2>&1; then
  mapfile -t template_dirs < <(python3 - <<'PY' "$MANIFEST_PATH"
import json, sys
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    for target in data.get('targets', []):
        p = target.get('templatesPath')
        if p:
            print(p)
except Exception:
    pass
PY
)
  for d in "${template_dirs[@]}"; do
    if [[ -d "$d" ]] && [[ -z "$(ls -A "$d")" ]]; then
      rmdir "$d" || true
    fi
  done

  python3 - "$MANIFEST_PATH" <<'PY'
import json, os, sys

path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except (OSError, json.JSONDecodeError):
    data = {}

def remove_files(paths):
    for fp in paths:
        if not isinstance(fp, str):
            continue
        if os.path.isfile(fp):
            try:
                os.remove(fp)
            except OSError:
                pass

paths = []
for t in data.get("targets", []) or []:
    paths.extend(t.get("installedFiles") or [])
ws = data.get("workspace") or {}
paths.extend(ws.get("installedFiles") or [])
paths.extend(data.get("installedFiles") or [])
remove_files(paths)
PY
fi

rm -f "$FILES_PATH" "$MANIFEST_PATH" "$MARKER_PATH"

if [[ "$REMOVE_INSTALL_ROOT" -eq 1 ]]; then
  if [[ -d "$INSTALL_ROOT" ]] && [[ -z "$(ls -A "$INSTALL_ROOT")" ]]; then
    rmdir "$INSTALL_ROOT"
    log_info "Removed empty install root: $INSTALL_ROOT"
  else
    log_warn "Install root not empty; leaving in place: $INSTALL_ROOT"
  fi
fi

log_ok "Uninstall complete."
log_info "Install root: $INSTALL_ROOT"
