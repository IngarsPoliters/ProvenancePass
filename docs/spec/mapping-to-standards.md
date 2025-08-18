# Mapping Provenance Passport to Existing Standards

## Overview

This document describes how Provenance Passport v0.1 fields map to established standards including C2PA (Coalition for Content Provenance and Authenticity) and SLSA/in-toto attestations. These mappings enable interoperability and leverage existing verification infrastructure.

## C2PA Mapping

### Custom Namespace

Provenance Passport assertions will use the custom C2PA namespace:
```
https://provenancepass.org/assertions/v0.1
```

### Field Mappings

| PP v0.1 Field | C2PA Assertion | C2PA Field | Notes |
|---------------|----------------|------------|-------|
| `version` | `provenancepass.org/passport` | `version` | Custom assertion type |
| `artifact.sha256` | `c2pa.hash.data` | `hash` | Built-in C2PA data hash |
| `artifact.mime` | `c2pa.hash.data` | `alg` | MIME type in algorithm field |
| `artifact.name` | `provenancepass.org/passport` | `artifact.name` | Custom field |
| `artifact.size` | `provenancepass.org/passport` | `artifact.size` | Custom field |
| `artifact.created_at` | `stds.exif` | `DateTimeOriginal` | EXIF standard assertion |
| `inputs[]` | `c2pa.ingredient` | Multiple instances | Each input as separate ingredient |
| `steps[]` | `c2pa.actions` | `actions` | C2PA actions list |
| `review` | `provenancepass.org/passport` | `review` | Custom field |
| `policy_checks[]` | `provenancepass.org/passport` | `policy_checks` | Custom field |
| `signature` | C2PA Manifest | Signature block | Native C2PA signature mechanism |

### C2PA Integration Example

```json
{
  "claim_generator": "ProvenancePass/0.1.0",
  "assertions": [
    {
      "label": "c2pa.hash.data",
      "data": {
        "exclusions": [],
        "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "name": "jumbf manifest"
      }
    },
    {
      "label": "provenancepass.org/passport",
      "data": {
        "version": "0.1",
        "artifact": {
          "name": "contract-final.pdf",
          "size": 45678
        },
        "review": {
          "status": "approved",
          "reviewer": "legal@company.com",
          "timestamp": "2024-01-15T14:29:45.000Z"
        },
        "policy_checks": [
          {
            "policy": "data-retention",
            "result": "pass",
            "details": "Retention period: 7 years"
          }
        ]
      }
    },
    {
      "label": "c2pa.actions",
      "data": {
        "actions": [
          {
            "action": "c2pa.converted",
            "when": "2024-01-15T14:28:00.000Z",
            "softwareAgent": "pandoc/3.1.2"
          },
          {
            "action": "c2pa.edited",
            "when": "2024-01-15T14:29:30.000Z",
            "digitalSourceType": "https://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
          }
        ]
      }
    },
    {
      "label": "c2pa.ingredient",
      "data": {
        "title": "contract-draft.docx",
        "relationship": "parentOf",
        "hash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890"
      }
    }
  ]
}
```

## SLSA/in-toto Mapping

### Predicate Type

Provenance Passport will use a custom predicate type in the in-toto attestation framework:
```
https://provenancepass.org/predicate/passport/v0.1
```

### Field Mappings

| PP v0.1 Field | SLSA/in-toto Field | Location | Notes |
|---------------|-------------------|----------|-------|
| `artifact.sha256` | `subject.digest.sha256` | Statement subject | in-toto subject binding |
| `artifact.mime` | `predicate.passport.artifact.mime` | Custom predicate | PP-specific field |
| `artifact.created_at` | `predicate.passport.artifact.created_at` | Custom predicate | PP-specific field |
| `inputs[]` | `predicate.passport.inputs[]` | Custom predicate | Maps to SLSA materials |
| `steps[]` | `predicate.passport.steps[]` | Custom predicate | Maps to SLSA build steps |
| `review` | `predicate.passport.review` | Custom predicate | PP-specific field |
| `policy_checks[]` | `predicate.passport.policy_checks[]` | Custom predicate | PP-specific field |
| `signature` | Envelope signature | in-toto envelope | Native in-toto mechanism |

### in-toto Attestation Example

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    {
      "name": "contract-final.pdf",
      "digest": {
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    }
  ],
  "predicateType": "https://provenancepass.org/predicate/passport/v0.1",
  "predicate": {
    "passport": {
      "version": "0.1",
      "artifact": {
        "mime": "application/pdf",
        "name": "contract-final.pdf",
        "size": 45678,
        "created_at": "2024-01-15T14:30:00.000Z"
      },
      "inputs": [
        {
          "type": "source",
          "sha256": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
          "name": "contract-draft.docx",
          "role": "template"
        }
      ],
      "steps": [
        {
          "action": "convert",
          "tool": "pandoc",
          "version": "3.1.2",
          "timestamp": "2024-01-15T14:28:00.000Z",
          "actor": {
            "type": "software",
            "id": "build-agent-7"
          }
        }
      ],
      "review": {
        "status": "approved",
        "reviewer": "legal@company.com",
        "timestamp": "2024-01-15T14:29:45.000Z"
      },
      "policy_checks": [
        {
          "policy": "data-retention",
          "result": "pass",
          "timestamp": "2024-01-15T14:30:00.000Z"
        }
      ]
    }
  }
}
```

### SLSA Provenance Alignment

For compatibility with SLSA provenance, key mappings include:

| PP v0.1 Field | SLSA Provenance Field | Notes |
|---------------|----------------------|-------|
| `inputs[]` | `predicate.materials[]` | Source materials |
| `steps[]` | `predicate.recipe.steps[]` | Build recipe steps |
| `artifact.created_at` | `predicate.metadata.buildStartedOn` | Build timing |
| `signature.public_key` | `predicate.builder.id` | Builder identity |

## Standards Compatibility Matrix

| Feature | Native PP | C2PA | SLSA/in-toto | Notes |
|---------|-----------|------|--------------|-------|
| Artifact binding | SHA-256 | ✅ Hash assertion | ✅ Subject digest | Universal compatibility |
| Digital signature | Ed25519 | ✅ Manifest signature | ✅ Envelope signature | Native support |
| Input tracking | Custom array | ✅ Ingredients | ✅ Materials | Maps to existing concepts |
| Step documentation | Custom array | ✅ Actions | ✅ Recipe steps | Semantic alignment |
| Review process | Custom object | ❌ Custom assertion | ❌ Custom predicate | PP-specific feature |
| Policy validation | Custom array | ❌ Custom assertion | ❌ Custom predicate | PP-specific feature |
| Metadata preservation | JSON structure | ✅ JUMBF embedding | ✅ Attestation storage | Format-dependent |

## Implementation Strategies

### C2PA Integration
1. Implement custom assertion types for PP-specific fields
2. Use standard C2PA assertions for common metadata
3. Embed PP JSON as custom assertion payload
4. Leverage C2PA toolchain for manifest creation and verification

### SLSA/in-toto Integration
1. Define custom predicate type for Provenance Passport
2. Map PP fields to predicate structure
3. Use standard in-toto envelope for signatures
4. Enable verification through existing SLSA tooling

### Dual Compatibility
1. Support export to both C2PA and in-toto formats
2. Maintain semantic equivalence across formats
3. Enable cross-format verification workflows
4. Provide format conversion utilities

## Future Considerations

- Standardization of PP-specific assertions in C2PA registry
- Submission of PP predicate type to in-toto specification
- Integration with GitHub Artifact Attestations
- Support for federated verification across standards
- Automatic format detection and conversion