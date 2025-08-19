# Provenance Passport GitHub Action

[![GitHub Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue)](https://github.com/marketplace/actions/provenance-passport)
[![License](https://img.shields.io/github/license/IngarsPoliters/ProvenancePass)](https://github.com/IngarsPoliters/ProvenancePass/blob/main/LICENSE)
[![CI](https://github.com/IngarsPoliters/ProvenancePass/workflows/CI/badge.svg)](https://github.com/IngarsPoliters/ProvenancePass/actions)

Create and verify cryptographic provenance for digital artifacts in your CI/CD pipeline using [Provenance Passport](https://github.com/IngarsPoliters/ProvenancePass).

This action helps you:
- 🔐 **Create** provenance passports for build artifacts
- ✅ **Verify** cryptographic provenance in pull requests  
- 🏷️ **Embed** C2PA metadata into files
- 🔍 **Detect** tampered or unverified artifacts
- 📋 **Generate** detailed verification reports
- 🛡️ **Enforce** provenance policies in workflows

## Quick Start

### Verify Existing Passports
```yaml
name: Verify Provenance
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: verify
          glob: '**/*.{pdf,png,jpg,jpeg,docx}'
```

### Create Passports for Build Artifacts
```yaml
name: Build with Provenance
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build artifacts
        run: |
          # Your build process
          npm run build
          
      - name: Create Provenance Passports
        uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: wrap
          glob: 'dist/**/*.{js,css,png}'
          embed_c2pa: true
          
      - name: Upload with Provenance
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            dist/
            **/*.passport.json
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `mode` | Action mode: `verify`, `wrap`, or `both` | No | `verify` |
| `glob` | Glob pattern for files to process | No | `**/*.{pdf,png,jpg,jpeg,docx}` |
| `revocations_url` | URL for revocation list (verify mode) | No | `https://data.provenancepass.com/revocations.json` |
| `manifest_url` | Manifest URL for DOCX fallback (verify mode) | No | - |
| `command` | Command to wrap with provenance (wrap mode) | No | - |
| `keyfile` | Path to signing key file (wrap mode) | No | Auto-generated |
| `output_dir` | Output directory for wrapped files | No | `.` |
| `embed_c2pa` | Embed passport in C2PA metadata | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `total` | Total number of files checked (verify) |
| `passed` | Number of files that passed verification |
| `failed` | Number of files that failed verification |
| `warnings` | Number of files with warnings |
| `success` | Whether all verifications passed |
| `wrapped_files` | Number of files wrapped with provenance |
| `passport_files` | Comma-separated list of passport files created |
| `embedded_files` | Number of files with embedded C2PA metadata |

## Examples

### 1. Verify Existing Passports (Default Mode)
```yaml
- name: Verify Provenance Passports
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: verify
    glob: 'assets/**/*.{pdf,png,jpg}'
```

### 2. Create Passports for Build Output
```yaml
- name: Create Provenance for Build Artifacts
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: wrap
    glob: 'dist/**/*.{js,css,png,woff2}'
    embed_c2pa: true
```

### 3. Wrap Command Execution
```yaml
- name: Build with Provenance Tracking
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: wrap
    command: "npm run build"
    output_dir: "build-output"
```

### 4. Complete Build + Verify Pipeline
```yaml
- name: Build and Verify with Provenance
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: both
    command: "make release"
    embed_c2pa: true
    revocations_url: 'https://example.com/revocations.json'
```

### 5. Custom Signing Key
```yaml
- name: Create Passports with Organization Key
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: wrap
    glob: 'releases/**/*.{tar.gz,zip}'
    keyfile: .github/signing-key.pem
```

### 6. DOCX with Manifest Fallback
```yaml
- name: Verify DOCX Documents
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: verify
    glob: 'docs/**/*.docx'
    manifest_url: 'https://manifest.example.com/receipts'
```

### 7. Conditional Actions Based on Results
```yaml
- name: Verify Provenance
  id: verify
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    mode: verify

- name: Block PR on Verification Failure  
  if: steps.verify.outputs.failed > 0
  run: |
    echo "::error::${{ steps.verify.outputs.failed }} files failed provenance verification"
    exit 1

- name: Upload Wrapped Artifacts
  if: steps.verify.outputs.wrapped_files > 0
  uses: actions/upload-artifact@v4
  with:
    name: signed-artifacts
    path: ${{ steps.verify.outputs.passport_files }}
```

### 8. Matrix Testing Across Platforms
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    
runs-on: ${{ matrix.os }}
steps:
  - uses: actions/checkout@v4
  - name: Create Cross-Platform Provenance
    uses: IngarsPoliters/ProvenancePass/packages/actions@main
    with:
      mode: wrap
      glob: 'build/**/*'
      output_dir: 'signed-${{ matrix.os }}'
```

## Supported File Types

The action supports verification of:

| Format | Method | Notes |
|--------|--------|-------|
| **Images** | C2PA embedded or sidecar | JPEG, PNG, WebP, AVIF |
| **Video** | C2PA embedded or sidecar | MP4, MOV, WebM |
| **Audio** | C2PA embedded or sidecar | MP3, WAV, FLAC |
| **Documents** | C2PA or sidecar | PDF |
| **DOCX** | Pointer-based or sidecar | Custom XML parts fallback |
| **Other files** | Sidecar only | Any file type with `.passport.json` |

## Verification Sources

The action checks for provenance in this priority order:

1. **C2PA Embedded** 🏷️ - Uses `c2patool` to extract from file metadata
2. **DOCX Custom Parts** 📄 - Reads from OOXML custom XML parts  
3. **Sidecar Files** 📋 - Looks for `.passport.json` files

## Action Behavior

### ✅ Success (All Pass)
- Action completes successfully
- Green checkmarks in PR
- Summary shows verified files

### ❌ Failure (Any Fail)
- Action fails the workflow
- Creates error annotations on files
- Detailed failure reasons in summary

### ⚠️ Warning (Missing Passports)
- Action succeeds but shows warnings
- Yellow warning annotations
- Suggestions for adding provenance

## Requirements

- **Node.js 20+** (automatically installed)
- **c2patool** (automatically installed on Linux/macOS)
- **@provenancepass/cli** (automatically installed)

## Security Considerations

- Revocation lists are checked by default
- Custom revocation URLs should use HTTPS
- Failed verification blocks PR merges
- Supports signed revocation feeds with `--revocation-pubkey`

## Troubleshooting

### No files found
```
⚠️ No files found matching the pattern
```
- Check your `glob` pattern
- Ensure files are committed to the repository

### c2patool installation failed
```
::warning::c2patool installation not supported on Windows
```
- Action falls back to sidecar verification
- Consider using sidecar files for Windows runners

### CLI installation failed
```
npm install -g @provenancepass/cli failed
```
- Check if npm registry is accessible
- Verify package name and version

## Related Documentation

- 📚 [Provenance Passport Specification](https://provenancepass.com/docs/)
- 🛠️ [CLI Usage Guide](https://provenancepass.com/docs/cli)
- 🔗 [C2PA Standard](https://c2pa.org/)
- 📋 [Embedding Guide](https://provenancepass.com/docs/embedding)

## License

This action is licensed under the [Apache License 2.0](https://github.com/IngarsPoliters/ProvenancePass/blob/main/LICENSE).