# Provenance Passport v0.1 Specification

**Note**: Signatures are computed over the JCS-canonicalized receipt (RFC 8785). See the Canonicalization section below for details.

## Overview

The Provenance Passport (PP) v0.1 defines a standardized format for recording and verifying the provenance of digital artifacts. It provides cryptographically signed metadata that documents an artifact's creation, processing history, and verification status.

## Core Concepts

### Artifact Binding
Each passport is cryptographically bound to a specific artifact through its SHA-256 digest, ensuring the passport cannot be transferred to different content.

### Provenance Chain
The passport captures the complete provenance chain through inputs (source materials), steps (processing actions), and reviews (human or automated validations).

### Cryptographic Integrity
All passports are digitally signed using Ed25519 to ensure authenticity and prevent tampering.

## Schema Structure

### Required Fields

- **version**: Specification version (must be "0.1")
- **artifact.sha256**: SHA-256 digest of the artifact (64 hex characters)
- **artifact.mime**: MIME type of the artifact
- **artifact.created_at**: ISO8601 timestamp in UTC when artifact was created
- **signature.algo**: Signature algorithm (must be "ed25519")
- **signature.public_key**: Ed25519 public key (64 hex characters)
- **signature.signature**: Ed25519 signature (128 hex characters)

### Optional Fields

- **artifact.name**: Human-readable name for the artifact
- **artifact.size**: Size in bytes
- **inputs[]**: Array of input artifacts or sources used
- **steps[]**: Array of processing steps applied
- **review**: Human or automated review information
- **policy_checks[]**: Array of policy validation results

## JSON Example

```json
{
  "version": "0.1",
  "artifact": {
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "mime": "application/pdf",
    "name": "contract-final.pdf",
    "size": 45678,
    "created_at": "2024-01-15T14:30:00.000Z",
    "hash_binding": "bytes",
    "byte_size": 123456
  },
  "inputs": [
    {
      "type": "source",
      "sha256": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "name": "contract-draft.docx",
      "role": "template"
    },
    {
      "type": "external",
      "url": "https://legal.company.com/templates/v2.1",
      "accessed_at": "2024-01-15T14:25:00.000Z"
    }
  ],
  "steps": [
    {
      "action": "convert",
      "tool": "pandoc",
      "version": "3.1.2",
      "timestamp": "2024-01-15T14:28:00.000Z",
      "started_at": "2024-01-15T14:27:45.000Z",
      "ended_at": "2024-01-15T14:28:00.000Z",
      "actor": {
        "type": "software",
        "id": "build-agent-7"
      }
    },
    {
      "action": "sign",
      "tool": "docusign",
      "timestamp": "2024-01-15T14:29:30.000Z",
      "actor": {
        "type": "human",
        "id": "john.doe@company.com"
      }
    }
  ],
  "review": {
    "status": "approved",
    "reviewer": "legal@company.com",
    "timestamp": "2024-01-15T14:29:45.000Z",
    "comments": "Contract terms verified and approved"
  },
  "policy_checks": [
    {
      "policy": "data-retention",
      "result": "pass",
      "timestamp": "2024-01-15T14:30:00.000Z",
      "details": "Retention period: 7 years"
    },
    {
      "policy": "pii-scan",
      "result": "pass",
      "timestamp": "2024-01-15T14:30:00.000Z",
      "findings": []
    }
  ],
  "signature": {
    "algo": "ed25519",
    "public_key": "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678",
    "signature": "1a2b3c4d5e6f78901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012",
    "key_id": "ppk_8f2c91a3"
  }
}
```

## Field Semantics

### Artifact
The `artifact` object uniquely identifies and describes the digital asset:

- **sha256**: Cryptographic fingerprint ensuring integrity
- **mime**: Standard MIME type for proper handling
- **name**: Human-readable identifier
- **size**: File size for validation
- **created_at**: Timestamp of artifact creation (not passport creation)

### Inputs
The `inputs` array documents source materials and dependencies:

- Each input can reference other artifacts by SHA-256 or external resources by URL
- The `role` field describes how the input was used
- Support for both digital artifacts and external references

### Steps
The `steps` array captures the processing pipeline:

- **action**: Type of operation performed
- **tool**: Software or system that performed the action
- **version**: Tool version for reproducibility
- **timestamp**: When the step occurred
- **actor**: Who or what initiated the step (human, software, system)

### Review
The `review` object documents human or automated validation:

- **status**: Outcome of the review (approved, rejected, pending)
- **reviewer**: Identity of the reviewing party
- **timestamp**: When the review was completed
- **comments**: Additional notes or feedback

### Policy Checks
The `policy_checks` array records compliance validations:

- **policy**: Name or identifier of the policy checked
- **result**: Outcome (pass, fail, warning)
- **timestamp**: When the check was performed
- **details/findings**: Additional information about the check

### Signature
The `signature` object provides cryptographic authenticity:

- **algo**: Signature algorithm (currently only "ed25519")
- **public_key**: Verifier's public key
- **signature**: Digital signature over the passport content (excluding the signature field itself)

## Canonicalization

Signatures are computed over JCS-canonicalized JSON (RFC 8785) to ensure deterministic serialization. If a JCS library is not available in the CLI implementation, an equivalent stable canonicalization compatible with JCS will be used.

## Signing Process

1. Create the passport JSON with all fields except `signature`
2. Canonicalize the JSON using JCS (RFC 8785)
3. Generate Ed25519 signature over the canonical bytes
4. Add the `signature` object with algorithm, public key, and signature
5. The final passport includes the signature for verification

## Verification Process

1. Extract the `signature` object from the passport
2. Remove the `signature` field from the JSON
3. Canonicalize the remaining JSON
4. Verify the Ed25519 signature against the canonical bytes and public key
5. Optionally verify the artifact SHA-256 matches the actual file

## Future Considerations

- Support for additional signature algorithms
- Nested passport references for complex workflows
- Integration with PKI and certificate authorities
- Standardized policy and step vocabularies
- Support for distributed and federated verification