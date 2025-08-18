# Signing and Revocation

This document details the cryptographic signing process, verification flow, and key revocation mechanisms for Provenance Passport v0.1.

## Canonicalization

Signatures are computed over JCS-canonicalized JSON (RFC 8785) to ensure deterministic serialization across different implementations.

### JCS Requirements

- **Field ordering**: Lexicographic ordering of object keys at all levels
- **UTF-8 encoding**: All strings must be UTF-8 encoded
- **No whitespace**: Compact JSON with no extra spaces or newlines
- **Unicode normalization**: NFC normalization for Unicode strings

### Example

Original JSON:
```json
{
  "version": "0.1",
  "artifact": {
    "created_at": "2024-01-15T14:30:00.000Z",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "mime": "application/pdf"
  }
}
```

JCS canonical form:
```json
{"artifact":{"created_at":"2024-01-15T14:30:00.000Z","mime":"application/pdf","sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},"version":"0.1"}
```

### Implementation Libraries

- **Node.js**: [`canonicalize`](https://www.npmjs.com/package/canonicalize) package
- **Python**: [`jcs`](https://pypi.org/project/jcs/) package

## Signing Process

### Ed25519 Signature Generation

1. **Prepare content**: Create passport JSON with all fields except `signature`
2. **Canonicalize**: Apply JCS canonicalization (RFC 8785)
3. **Sign**: Generate Ed25519 signature over canonical bytes
4. **Format**: Convert signature components to hex encoding

### Key and Signature Encoding

- **Public key**: 32 bytes → 64 hex characters
- **Signature**: 64 bytes → 128 hex characters
- **Key ID**: `ppk_` + first 8 bytes of SHA-256(public_key) in hex

### Key ID Generation

```javascript
// Example key ID generation
const crypto = require('crypto');

function generateKeyId(publicKeyHex) {
  const pubkeyBytes = Buffer.from(publicKeyHex, 'hex');
  const hash = crypto.createHash('sha256').update(pubkeyBytes).digest('hex');
  return `ppk_${hash.slice(0, 16)}`;  // First 8 bytes = 16 hex chars
}

// Example: ppk_8f2c91a3d4e5f678
```

## Verification Flow

### Step-by-Step Verification

1. **Extract signature**: Remove `signature` object from passport JSON
2. **Compute content hash**: 
   - If `artifact.hash_binding = "bytes"`: Use `artifact.sha256`
   - If `artifact.hash_binding = "c2pa-claim"`: Extract hash from C2PA claim
3. **Canonicalize**: Apply JCS to remaining JSON content
4. **Verify signature**: Check Ed25519 signature against canonical bytes and public key
5. **Check revocations**: Query revocations.json for `key_id` status

### Hash Binding Modes

- **bytes** (default): Direct SHA-256 hash of artifact bytes
- **c2pa-claim**: Hash extracted from C2PA (Coalition for Content Provenance and Authenticity) claim

## Revocation System

### Revocations File Structure

Location: `docs/spec/revocations.json`

```json
{
  "version": "1.0",
  "updated_at": "2024-01-15T14:30:00.000Z",
  "revoked_keys": [
    {
      "key_id": "ppk_8f2c91a3d4e5f678",
      "revoked_at": "2024-01-10T09:15:00.000Z",
      "reason": "compromise",
      "details": "Key potentially exposed in CI logs"
    },
    {
      "key_id": "ppk_a1b2c3d4e5f67890",
      "revoked_at": "2024-01-12T16:20:00.000Z",
      "reason": "retired",
      "details": "Scheduled key rotation"
    }
  ],
  "signature": {
    "algo": "ed25519",
    "public_key": "revocation_authority_public_key_hex",
    "signature": "revocation_list_signature_hex",
    "key_id": "ppk_revocation_authority"
  }
}
```

### Revocation Reasons

- **compromise**: Key security has been breached
- **retired**: Planned key lifecycle end
- **policy**: Key violates current policy requirements

### Viewer Implementation

- **Polling frequency**: Check revocations every 4-24 hours
- **Caching**: Cache revocation list locally with TTL
- **Fallback**: Continue with warning if revocation service unavailable
- **Performance**: Index revoked key_ids for fast lookup

## Key Rotation

### Recommended Rotation Process

1. **Generate new key**: Create new Ed25519 keypair with new key_id
2. **Overlapping period**: Issue signatures with both old and new keys (7-30 days)
3. **Update systems**: Configure CI/CD to accept both keys during transition
4. **Revoke old key**: Add old key_id to revocations.json after transition
5. **Clean up**: Remove old key from active signing systems

### Rotation Schedule

- **Normal rotation**: Every 12-24 months
- **Emergency rotation**: Immediately upon suspected compromise
- **Policy-driven**: As required by organizational security policies

### Transition Period

```json
{
  "signatures": [
    {
      "algo": "ed25519",
      "public_key": "old_key_hex",
      "signature": "signature_with_old_key",
      "key_id": "ppk_old_key_id"
    },
    {
      "algo": "ed25519", 
      "public_key": "new_key_hex",
      "signature": "signature_with_new_key", 
      "key_id": "ppk_new_key_id"
    }
  ]
}
```

## Security Considerations

### Key Management

- **Storage**: Use HSM or secure key management service
- **Access control**: Limit key access to authorized systems only
- **Backup**: Secure backup of private keys with proper encryption
- **Audit**: Log all key usage and access attempts

### Signature Validation

- **Time bounds**: Consider signature timestamp vs current time
- **Key validity**: Always check revocation status before trusting
- **Algorithm verification**: Ensure only approved algorithms are accepted
- **Canonical form**: Strict adherence to JCS canonicalization

### Revocation Distribution

- **Integrity**: Sign revocation lists to prevent tampering
- **Availability**: Ensure revocation service high availability
- **Caching**: Balance freshness with performance requirements
- **Fallback**: Define behavior when revocation checks fail