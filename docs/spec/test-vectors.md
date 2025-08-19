# Provenance Passport Test Vectors

This document provides reproducible test cases for verifying Provenance Passport implementation correctness across different embedding methods and scenarios.

## Overview

Test vectors demonstrate:
- ✅ **PASS** - Valid passports with correct signatures and hashes
- ❌ **FAIL** - Invalid passports, tampered files, or missing provenance  
- ⚠️ **WARNING** - Missing passports or non-critical issues

Each test vector includes:
- Input files and generation commands
- Expected verification outputs
- Common failure modes and edge cases

## Test Categories

### 1. Sidecar File Tests

#### PASS: Valid Sidecar Passport

**File**: `examples/artifacts/document.pdf.passport.json`
```bash
pp verify examples/artifacts/document.pdf --json
```

**Expected Output**:
```json
{
  "summary": { "total": 1, "passed": 1, "failed": 0, "warnings": 0 },
  "results": [{
    "file": "examples/artifacts/document.pdf",
    "status": "pass",
    "passport_found": true,
    "passport_source": "sidecar",
    "signature_valid": true,
    "key_id": "test-key-001",
    "key_status": "active",
    "artifact_hash": "a1b2c3d4...",
    "steps_count": 2,
    "policies_passed": 1
  }]
}
```

#### FAIL: Tampered File with Valid Passport

**Generation**:
```bash
# Create valid file + passport
echo "Hello World" > test.txt
pp wrap test.txt --sign test-key.pem --output test.txt.passport.json

# Tamper with the file
echo "Hello World!" > test.txt  # Added exclamation

# Verify (should fail)
pp verify test.txt --json
```

**Expected Output**:
```json
{
  "summary": { "total": 1, "passed": 0, "failed": 1, "warnings": 0 },
  "results": [{
    "file": "test.txt",
    "status": "fail",
    "passport_found": true,
    "passport_source": "sidecar",
    "signature_valid": false,
    "error": "Content hash mismatch - file may have been modified",
    "details": "Expected: a1b2c3d4..., Got: e5f6g7h8..."
  }]
}
```

#### FAIL: Invalid Signature

**Generation**:
```bash
# Create file with tampered passport signature
echo "Hello World" > test.txt
pp wrap test.txt --sign test-key.pem --output test.txt.passport.json

# Manually corrupt the signature in the JSON file
sed -i 's/signature": "[a-f0-9]\{128\}"/signature": "deadbeef..."/g' test.txt.passport.json

pp verify test.txt --json
```

**Expected Output**:
```json
{
  "results": [{
    "status": "fail",
    "error": "Passport signature verification failed"
  }]
}
```

#### WARNING: Missing Passport

**Generation**:
```bash
echo "Hello World" > orphan.txt
pp verify orphan.txt --json
```

**Expected Output**:
```json
{
  "summary": { "total": 1, "passed": 0, "failed": 0, "warnings": 1 },
  "results": [{
    "file": "orphan.txt",
    "status": "warning",
    "passport_found": false,
    "error": "No passport found (neither C2PA embedded, DOCX custom parts, nor sidecar file)"
  }]
}
```

### 2. C2PA Embedded Tests

#### PASS: C2PA Embedded Passport

**Generation**:
```bash
# Create image with embedded passport
cp examples/artifacts/sample.jpg test-image.jpg
pp embed test-image.jpg --passport test-image.jpg.passport.json
pp verify test-image.jpg --json
```

**Expected Output**:
```json
{
  "results": [{
    "file": "test-image.jpg",
    "status": "pass",
    "passport_source": "c2pa",
    "signature_valid": true,
    "key_status": "active"
  }]
}
```

#### FAIL: C2PA with Revoked Key

**Prerequisites**: Add key to revocations.json
```json
{
  "revoked_keys": [
    {
      "key_id": "revoked-key-001",
      "revoked_at": "2025-08-19T00:00:00Z",
      "reason": "Key compromise"
    }
  ]
}
```

**Expected Output**:
```json
{
  "results": [{
    "status": "fail",
    "key_status": "revoked",
    "error": "Signing key has been revoked"
  }]
}
```

### 3. DOCX Pointer Tests

#### PASS: DOCX with Sidecar Lookup

**Generation**:
```bash
# Create DOCX with pointer
cp examples/artifacts/sample.docx test-doc.docx
pp embed test-doc.docx --passport test-doc.docx.passport.json

# Create matching sidecar file
cp test-doc.docx.passport.json test-doc.passport.json

pp verify test-doc.docx --json
```

**Expected Output**:
```json
{
  "results": [{
    "file": "test-doc.docx",
    "status": "pass",
    "passport_source": "sidecar",
    "signature_valid": true
  }]
}
```

#### PASS: DOCX with Manifest URL

**Generation**:
```bash
# Embed pointer in DOCX
pp embed test-doc.docx --passport test-doc.docx.passport.json

# Verify with manifest URL
pp verify test-doc.docx --manifest https://example.com/manifests --json
```

**Mock Server Response**: `GET https://example.com/manifests/{sha256}`
```json
{
  "version": "0.1",
  "artifact": { "sha256": "...", "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  "signature": { "key_id": "test-key-001", "signature": "..." }
}
```

#### WARNING: DOCX Pointer Without Fallback

**Generation**:
```bash
# Create DOCX with pointer but no sidecar or manifest
pp embed test-doc.docx --passport test-doc.docx.passport.json
rm test-doc.passport.json  # Remove sidecar

pp verify test-doc.docx --json  # No --manifest provided
```

**Expected Output**:
```json
{
  "results": [{
    "status": "warning",
    "passport_found": false,
    "error": "DOCX contains pointer but no sidecar file found and no --manifest URL provided"
  }]
}
```

### 4. Edge Cases and Error Conditions

#### Invalid JSON Format

**Generation**:
```bash
echo "Hello World" > test.txt
echo "invalid json" > test.txt.passport.json
pp verify test.txt --json
```

**Expected Output**:
```json
{
  "results": [{
    "status": "fail",
    "error": "Failed to parse sidecar passport: Unexpected token 'i', \"invalid json\" is not valid JSON"
  }]
}
```

#### Network Timeout (Manifest URL)

**Generation**:
```bash
pp verify test-doc.docx --manifest https://unreachable.example.com --json
```

**Expected Output**:
```json
{
  "results": [{
    "status": "warning",
    "error": "Failed to fetch from manifest URL: getaddrinfo ENOTFOUND unreachable.example.com"
  }]
}
```

#### Multiple Files with Mixed Results

**Generation**:
```bash
# Valid file
echo "Good" > good.txt
pp wrap good.txt --sign test-key.pem

# Tampered file  
echo "Bad Original" > bad.txt
pp wrap bad.txt --sign test-key.pem
echo "Bad Tampered" > bad.txt

# Missing passport
echo "Orphan" > orphan.txt

pp verify --glob "*.txt" --json
```

**Expected Output**:
```json
{
  "summary": { "total": 3, "passed": 1, "failed": 1, "warnings": 1 },
  "results": [
    { "file": "good.txt", "status": "pass" },
    { "file": "bad.txt", "status": "fail", "error": "Content hash mismatch" },
    { "file": "orphan.txt", "status": "warning", "passport_found": false }
  ]
}
```

## Generation Scripts

### Automated Test Vector Generation

Use the provided scripts to generate reproducible test cases:

```bash
# Generate all test vectors
./examples/scripts/generate.sh

# Create tampered versions
./examples/scripts/tamper.sh examples/artifacts/
```

### Manual Verification

```bash
# Verify all test vectors
pp verify --glob "examples/artifacts/**/*" --json

# Check specific embedding methods
pp verify --glob "examples/artifacts/sidecar/*" --json
pp verify --glob "examples/artifacts/c2pa/*" --json  
pp verify --glob "examples/artifacts/docx/*" --json
```

## Implementation Testing

### Required Test Coverage

Implementations should pass all test vectors and handle:

1. **Valid Cases**: All PASS scenarios return correct status and metadata
2. **Invalid Cases**: All FAIL scenarios return appropriate error messages
3. **Edge Cases**: Graceful handling of malformed inputs and network errors
4. **Hash Verification**: Correct detection of file tampering
5. **Signature Verification**: Proper cryptographic validation
6. **Revocation Checking**: Integration with revocation lists
7. **Source Priority**: Correct precedence of C2PA > DOCX > sidecar

### Regression Testing

```bash
# Run full test suite
npm test

# Verify backwards compatibility
./test/regression.sh

# Performance benchmarks
./test/benchmark.sh examples/artifacts/
```

## File Formats and Examples

The test vectors include examples for:

| Format | Sidecar | C2PA | DOCX Pointer | Notes |
|--------|---------|------|--------------|-------|
| **Text** | ✅ | ❌ | ❌ | `.txt.passport.json` |
| **PDF** | ✅ | ✅ | ❌ | C2PA support varies |
| **JPEG** | ✅ | ✅ | ❌ | Standard EXIF embedding |
| **PNG** | ✅ | ✅ | ❌ | Metadata chunks |
| **MP4** | ✅ | ✅ | ❌ | Requires c2patool |
| **DOCX** | ✅ | ✅ | ✅ | OOXML custom parts |

## Validation Checklist

When implementing Provenance Passport verification:

- [ ] Sidecar files parsed correctly
- [ ] C2PA manifests extracted properly  
- [ ] DOCX pointer resolution works
- [ ] Hash verification prevents tampering
- [ ] Signature validation uses ed25519 correctly
- [ ] Revocation lists checked when enabled
- [ ] Error messages are informative
- [ ] JSON output matches expected format
- [ ] File type detection works reliably
- [ ] Network timeouts handled gracefully

## Contributing Test Vectors

To add new test vectors:

1. Create the test case files using generation scripts
2. Verify expected outputs manually
3. Document the test case in this file
4. Add to automated test suites
5. Ensure reproducibility across platforms

Test vectors should cover:
- Common success scenarios
- All documented failure modes
- Edge cases and error conditions
- Performance and scalability limits