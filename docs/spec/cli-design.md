# CLI Design Specification

This document defines the exact command-line interface for the Provenance Passport CLI tool, including all flags, arguments, and expected behaviors.

## Overview

The `pp` CLI provides three main commands for creating, embedding, and verifying provenance passports:

- `pp wrap` - Execute commands while capturing provenance metadata
- `pp embed` - Embed passport into supported file formats using C2PA
- `pp verify` - Verify passport signatures and integrity

## Global Flags

These flags are available for all commands:

- `--log-level <level>` - Set logging verbosity (error, warn, info, debug, trace)
- `--revocations <url>` - Override revocation list URL (default: docs/spec/revocations.json)
- `--fail-on-missing` - Exit with error if passport is missing during verification

## Command: `pp wrap`

Execute a command while capturing its provenance and creating a signed passport.

### Syntax

```bash
pp wrap --in <input> --out <output> --run <command> [options]
```

### Required Flags

- `--in <path>` - Input file or directory to track
- `--out <path>` - Output file or directory to create passport for
- `--run <command>` - Command to execute (can be repeated for multiple commands)
- `--sign <key.pem>` - Private key file for signing the passport

### Optional Flags

- `--step <description>` - Human-readable description of the processing step
- `--policy <name>` - Policy validation to apply (can be repeated)
- `--watermark` - Add visible watermark to output indicating provenance tracking

### Examples

#### Basic Usage

```bash
pp wrap --in contract-draft.docx --out contract-final.pdf \
        --run "pandoc -f docx -t pdf contract-draft.docx -o contract-final.pdf" \
        --sign ~/.pp/signing-key.pem
```

#### Multi-step Process

```bash
pp wrap --in source.md --out final.pdf \
        --run "pandoc source.md -o temp.html" \
        --run "wkhtmltopdf temp.html final.pdf" \
        --run "rm temp.html" \
        --step "Convert markdown to PDF via HTML" \
        --policy data-retention \
        --policy pii-scan \
        --sign ~/.pp/signing-key.pem \
        --watermark
```

#### Build Pipeline

```bash
pp wrap --in src/ --out dist/app.js \
        --run "npm run build" \
        --step "Production build with webpack" \
        --policy security-scan \
        --sign $CI_SIGNING_KEY \
        --log-level info
```

### Output

Creates two files:
- `<output>` - The actual output file from the command
- `<output>.pp` - Sidecar passport file with provenance metadata

### Exit Codes

- `0` - Success: Command executed and passport created
- `1` - Command execution failed
- `2` - Passport creation failed
- `3` - Signing failed (invalid key or permissions)
- `4` - Policy validation failed

### Sample Output

**Success:**
```
✅ Command executed successfully
📄 Input: contract-draft.docx (sha256: a1b2c3d4...)
📄 Output: contract-final.pdf (sha256: e5f6789a...)
🔐 Signed with key: ppk_8f2c91a3d4e5f678
📋 Passport: contract-final.pdf.pp
⏱️  Duration: 2.3s
```

**Failure:**
```
❌ Command failed with exit code 1
📄 Input: contract-draft.docx (sha256: a1b2c3d4...)
💥 Error: pandoc: unrecognized option `--invalid-flag`
🚫 No passport created
```

## Command: `pp embed`

Embed a passport directly into supported file formats using C2PA technology.

### Syntax

```bash
pp embed <file> --passport <sidecar.json> --sign <key> [options]
```

### Required Arguments

- `<file>` - Target file to embed passport into (PDF, PNG, JPG, JPEG, DOCX)

### Required Flags

- `--passport <path>` - Path to existing passport JSON file
- `--sign <key.pem>` - Private key for C2PA claim signing

### Optional Flags

- `--backup` - Create backup of original file before embedding
- `--output <path>` - Write embedded file to different location (default: overwrite)

### Examples

#### Embed into PDF

```bash
pp embed contract-final.pdf --passport contract-final.pdf.pp --sign ~/.pp/signing-key.pem
```

#### Embed with Backup

```bash
pp embed photo.jpg --passport photo.jpg.pp --sign ~/.pp/signing-key.pem --backup
```

#### Embed to New File

```bash
pp embed document.pdf --passport document.pdf.pp --sign ~/.pp/signing-key.pem --output document-signed.pdf
```

### Dependencies

Requires `c2patool` to be installed and available in PATH:
```bash
# Install c2patool
npm install -g c2patool
# or
cargo install c2patool
```

### Exit Codes

- `0` - Success: Passport embedded successfully
- `1` - File format not supported for embedding
- `2` - C2PA tool not found or failed
- `3` - Passport file invalid or not found
- `4` - Signing key invalid or not found
- `5` - File permissions error

### Sample Output

**Success:**
```
✅ Passport embedded successfully
📄 File: contract-final.pdf (sha256: e5f6789a...)
🔗 C2PA claim added with passport metadata
🔐 Signed with key: ppk_8f2c91a3d4e5f678
💾 Original backed up to: contract-final.pdf.backup
```

**Failure:**
```
❌ Embedding failed
📄 File: document.txt
🚫 Error: Text files do not support C2PA embedding
💡 Tip: Use sidecar .pp files for unsupported formats
```

## Command: `pp verify`

Verify passport signatures and validate artifact integrity.

### Syntax

```bash
pp verify <path> [options]
pp verify --glob <pattern> [options]
```

### Required Arguments

Either:
- `<path>` - Single file to verify (checks for embedded passport or .pp sidecar)
- `--glob <pattern>` - Glob pattern for multiple files

### Optional Flags

- `--json` - Output results in JSON format
- `--strict` - Fail on any warnings (not just errors)
- `--check-revocations` - Always check revocation status (default: true)
- `--trust-bundle <path>` - Additional trusted public keys file

### Examples

#### Single File Verification

```bash
pp verify contract-final.pdf
```

#### Batch Verification with Glob

```bash
pp verify --glob '**/*.{pdf,png,jpg,jpeg,docx}'
```

#### JSON Output for CI/CD

```bash
pp verify --glob 'dist/**/*' --json --fail-on-missing
```

#### Strict Verification

```bash
pp verify document.pdf --strict --log-level debug
```

### Exit Codes

- `0` - Success: All passports verified successfully
- `1` - Verification failed: Invalid signature or tampered content
- `2` - Passport not found and --fail-on-missing set
- `3` - Revoked key used for signing
- `4` - Network error checking revocations (with --strict)
- `5` - Invalid passport format or schema

### Sample Output

#### Single File Success

```
✅ PASS: contract-final.pdf
📄 Artifact: contract-final.pdf (sha256: e5f6789a...)
🔐 Signature: Valid (ppk_8f2c91a3d4e5f678)
⏰ Created: 2024-01-15T14:30:00.000Z
👤 Signer: build-system@company.com
✅ Key status: Active (not revoked)
📋 Steps: 2 processing steps recorded
🛡️  Policies: 2 checks passed
```

#### Single File Failure

```bash
❌ FAIL: document.pdf
📄 Artifact: document.pdf (sha256: f9e8d7c6...)
🔐 Signature: INVALID - does not match content
💥 Error: Passport signature verification failed
⚠️  Warning: Content may have been modified after signing
```

#### Batch Results

```bash
🔍 Verifying 15 files...

✅ PASS: dist/app.js (ppk_8f2c91a3)
✅ PASS: dist/style.css (ppk_8f2c91a3)
❌ FAIL: dist/config.json (signature invalid)
⚠️  WARN: dist/readme.txt (no passport found)

📊 Summary: 2 passed, 1 failed, 1 warning
```

#### JSON Output Format

```json
{
  "summary": {
    "total": 4,
    "passed": 2,
    "failed": 1,
    "warnings": 1
  },
  "results": [
    {
      "file": "dist/app.js",
      "status": "pass",
      "passport_found": true,
      "signature_valid": true,
      "key_id": "ppk_8f2c91a3d4e5f678",
      "key_status": "active",
      "created_at": "2024-01-15T14:30:00.000Z",
      "artifact_hash": "e5f6789a12345678...",
      "steps_count": 2,
      "policies_passed": 2
    },
    {
      "file": "dist/config.json", 
      "status": "fail",
      "passport_found": true,
      "signature_valid": false,
      "error": "Signature verification failed",
      "details": "Content hash mismatch - file may have been modified"
    },
    {
      "file": "dist/readme.txt",
      "status": "warning", 
      "passport_found": false,
      "error": "No passport file found"
    }
  ]
}
```

## Common Workflows

### CI/CD Integration

```bash
# Build with provenance
pp wrap --in src/ --out dist/app.js \
        --run "npm run build" \
        --policy security-scan \
        --sign $CI_SIGNING_KEY

# Verify before deployment
pp verify --glob 'dist/**/*' --json --fail-on-missing || exit 1
```

### Document Processing

```bash
# Convert with tracking
pp wrap --in report.md --out report.pdf \
        --run "pandoc report.md -o report.pdf" \
        --step "Generate PDF report" \
        --sign ~/.pp/doc-key.pem

# Embed for distribution
pp embed report.pdf --passport report.pdf.pp --sign ~/.pp/doc-key.pem
```

### Compliance Audit

```bash
# Verify all artifacts in audit
find . -name "*.pp" -exec dirname {} \; | sort -u | while read dir; do
  pp verify "$dir"/* --strict --check-revocations
done
```

## Error Handling

### Key Management Errors

```bash
❌ FAIL: Signing key not found
📁 Path: ~/.pp/signing-key.pem
💡 Tip: Generate a new key with: pp keygen --out ~/.pp/signing-key.pem
```

### Network Errors

```bash
⚠️  WARNING: Could not check revocation status
🌐 URL: https://example.com/revocations.json
🔄 Retrying in 5 seconds... (2/3)
💡 Tip: Use --revocations to specify alternative URL
```

### Policy Failures

```bash
❌ POLICY FAILED: pii-scan
📋 Policy: Personal information detected
🔍 Found: 3 email addresses, 1 SSN
💥 Error: PII policy violations must be resolved before signing
```

## Configuration

### Environment Variables

- `PP_SIGNING_KEY` - Default signing key path
- `PP_REVOCATIONS_URL` - Default revocation list URL  
- `PP_LOG_LEVEL` - Default log level
- `PP_TRUST_BUNDLE` - Default trusted keys file

### Config File Support

Optional `~/.pp/config.yaml`:

```yaml
signing_key: ~/.pp/default-key.pem
revocations_url: https://example.com/revocations.json
log_level: info
trust_bundle: ~/.pp/trusted-keys.json
policies:
  - name: pii-scan
    enabled: true
  - name: security-scan
    enabled: false
```

## Dependencies

### Required

- Node.js 18+ or equivalent runtime
- OpenSSL for cryptographic operations

### Optional

- `c2patool` - For embedding passports in media files
- `pandoc` - For document conversion examples
- `git` - For source control integration