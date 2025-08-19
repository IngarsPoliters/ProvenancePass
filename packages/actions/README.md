# Verify Provenance Passport GitHub Action

[![GitHub Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue)](https://github.com/marketplace/actions/verify-provenance-passport)
[![License](https://img.shields.io/github/license/IngarsPoliters/ProvenancePass)](https://github.com/IngarsPoliters/ProvenancePass/blob/main/LICENSE)
[![CI](https://github.com/IngarsPoliters/ProvenancePass/workflows/CI/badge.svg)](https://github.com/IngarsPoliters/ProvenancePass/actions)

Automatically verify cryptographic provenance of digital artifacts in your CI/CD pipeline using [Provenance Passport](https://github.com/IngarsPoliters/ProvenancePass).

This action helps you:
- ✅ Gate pull requests based on provenance verification
- 🔍 Detect tampered or unverified artifacts
- 📋 Generate detailed verification reports
- 🛡️ Enforce provenance policies in your workflow

## Quick Start

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
          glob: '**/*.{pdf,png,jpg,jpeg,docx}'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `glob` | Glob pattern for files to verify | No | `**/*.{pdf,png,jpg,jpeg,docx}` |
| `revocations_url` | URL for revocation list | No | [Default revocations.json](https://data.provenancepass.com/revocations.json) |
| `manifest_url` | Manifest URL for DOCX pointer fallback | No | - |

## Outputs

| Output | Description |
|--------|-------------|
| `total` | Total number of files checked |
| `passed` | Number of files that passed verification |
| `failed` | Number of files that failed verification |
| `warnings` | Number of files with warnings |
| `success` | Whether all verifications passed (`true`/`false`) |

## Examples

### Basic Usage

```yaml
- name: Verify Provenance Passports
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    glob: 'assets/**/*.{pdf,png,jpg}'
```

### Custom Revocation List

```yaml
- name: Verify with Custom Revocations
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    glob: 'docs/**/*.pdf'
    revocations_url: 'https://example.com/revocations.json'
```

### DOCX with Manifest Fallback

```yaml
- name: Verify DOCX with Manifest
  uses: IngarsPoliters/ProvenancePass/packages/actions@main
  with:
    glob: '**/*.docx'
    manifest_url: 'https://manifest.example.com/receipts'
```

### Conditional on Outputs

```yaml
- name: Verify Provenance Passports
  id: verify
  uses: IngarsPoliters/ProvenancePass/packages/actions@main

- name: Comment on PR
  if: steps.verify.outputs.failed > 0
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '⚠️ Some files failed provenance verification. Please check the action logs.'
      })
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