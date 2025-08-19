#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/examples/out"
ASSETS="$ROOT/examples/assets"
KEY="$OUT/test-key.pem"

mkdir -p "$OUT/pass" "$OUT/c2pa" "$OUT/docx" "$ASSETS"

# 0) Seed input files
echo "Hello, ProvenancePass." > "$ASSETS/document.txt"

# 1) Ensure CLI is present
if ! command -v pp >/dev/null 2>&1; then
  echo "pp CLI not found. Run: cd packages/cli && npm run build && npm link" >&2
  exit 1
fi

# 2) Generate a test key (id optional; adapt args if CLI differs)
if [ ! -f "$KEY" ]; then
  pp keygen --out "$KEY"
fi

# 3) Sidecar for TXT using `pp wrap` with a no-op step.
#    We pass --in/--out; and give a trivial --run to satisfy the command.
#    If your CLI uses different flag names, Claude: run `pp wrap --help` and adapt.
pp wrap \
  --in  "$ASSETS/document.txt" \
  --out "$OUT/pass/document.txt" \
  --sign "$KEY" \
  --step "No-op signing" \
  --run "cp $ASSETS/document.txt $OUT/pass/document.txt"

# Expect a sidecar next to the output (commonly .passport.json). If your CLI writes to a different filename, detect it:
SIDECAR="$(ls -1 "$OUT/pass"/document.txt*.json | head -n1 || true)"
if [ -z "${SIDECAR:-}" ]; then
  echo "No sidecar found. Claude: open CLI help and adjust wrap/sign flags to emit a JSON sidecar."
  exit 1
fi

# 4) Optional: create a C2PA-signed image IF c2patool is available (skip otherwise).
if command -v c2patool >/dev/null 2>&1; then
  # Create a dummy image if none exists
  if [ ! -f "$ASSETS/sample.jpg" ]; then
    # 400x200 white JPEG
    convert -size 400x200 xc:white "$ASSETS/sample.jpg" || true
  fi
  # Minimal manifest example (Claude can refine fields as needed)
  cat > "$OUT/c2pa/manifest.json" <<JSON
{
  "assertions": [
    {"label":"c2pa.sample","data":{"note":"ProvenancePass demo"}} 
  ]
}
JSON

  # If you have test keys for c2patool, embed; otherwise skip with a note.
  # (See c2patool README for signing options.)
  echo "If you have c2patool keys, run embedding per README to produce: $OUT/c2pa/sample.signed.jpg"
fi

# 5) Optional DOCX pointer sample (kept simple):
cp "$ASSETS/document.txt" "$OUT/docx/README.txt"

echo "Done. Outputs in: $OUT"