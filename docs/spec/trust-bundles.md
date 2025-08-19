# Trust Bundles Specification

Trust bundles provide a mechanism for preloading and managing known public keys and their associated metadata for Provenance Passport verification. This enables improved security, performance, and user experience when verifying digital artifacts.

## Overview

Trust bundles are JSON files containing collections of verified public keys, their associated metadata, and trust policies. They serve multiple purposes:

- **Preloaded Keys**: Enable verification without requiring network lookups
- **Key Metadata**: Provide context about key owners, purposes, and validity periods
- **Trust Policies**: Define trust levels and validation requirements
- **Revocation Integration**: Work alongside signed revocation lists for comprehensive key management

## Trust Bundle Format

### Basic Structure

```json
{
  "version": "1.0",
  "bundle_id": "example-org-2025",
  "name": "Example Organization Trust Bundle",
  "description": "Verified public keys for Example Organization's signing infrastructure",
  "created_at": "2025-08-19T00:00:00Z",
  "valid_until": "2026-08-19T00:00:00Z",
  "issuer": {
    "name": "Example Organization Security Team",
    "email": "security@example.org",
    "website": "https://example.org/security",
    "pgp_fingerprint": "1234 5678 9ABC DEF0 1234 5678 9ABC DEF0 1234 5678"
  },
  "keys": [
    {
      "key_id": "example-prod-2025-001",
      "public_key": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      "algorithm": "ed25519",
      "usage": ["signing"],
      "owner": {
        "name": "Example Production Key",
        "department": "Software Release Engineering",
        "contact": "sre@example.org"
      },
      "validity": {
        "not_before": "2025-01-01T00:00:00Z",
        "not_after": "2025-12-31T23:59:59Z"
      },
      "trust_level": "high",
      "purposes": ["artifact-signing", "release-signing"],
      "constraints": {
        "max_age_days": 365,
        "require_timestamp": true,
        "allowed_artifacts": ["*.tar.gz", "*.zip", "*.exe", "*.dmg"]
      },
      "metadata": {
        "created_at": "2025-01-01T00:00:00Z",
        "key_ceremony_id": "KC-2025-001",
        "hardware_module": "YubiHSM2",
        "approval_required": true
      }
    }
  ],
  "policies": {
    "default_trust_level": "medium",
    "require_revocation_check": true,
    "max_key_age_days": 1095,
    "require_key_rollover_notice": 90
  },
  "signature": {
    "algorithm": "ed25519",
    "key_id": "bundle-authority-2025",
    "signature": "def456789012345678901234567890abcdef1234567890abcdef123456789012",
    "signed_at": "2025-08-19T12:00:00Z"
  }
}
```

### Key Entry Fields

Each key entry in the `keys` array contains:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key_id` | string | Yes | Unique identifier for the key |
| `public_key` | string | Yes | Ed25519 public key in hex format (64 chars) |
| `algorithm` | string | Yes | Cryptographic algorithm ("ed25519") |
| `usage` | array | Yes | Allowed key usages ("signing", "verification") |
| `owner` | object | No | Information about the key owner |
| `validity` | object | No | Key validity time period |
| `trust_level` | string | No | Trust level ("high", "medium", "low") |
| `purposes` | array | No | Specific purposes for this key |
| `constraints` | object | No | Additional validation constraints |
| `metadata` | object | No | Additional key metadata |

### Trust Levels

| Level | Description | Use Cases |
|-------|-------------|-----------|
| **high** | Highest trust, minimal additional verification | Production releases, critical infrastructure |
| **medium** | Standard trust, normal verification required | Regular software packages, documentation |
| **low** | Limited trust, enhanced verification required | Testing, experimental builds |

### Usage Examples

#### Organization Bundle

```json
{
  "bundle_id": "acme-corp-2025",
  "name": "ACME Corporation Public Keys",
  "keys": [
    {
      "key_id": "acme-release-signing-2025",
      "public_key": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "trust_level": "high",
      "purposes": ["software-release"],
      "owner": {
        "name": "ACME Release Engineering",
        "department": "Software Development"
      }
    },
    {
      "key_id": "acme-security-updates-2025", 
      "public_key": "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
      "trust_level": "high",
      "purposes": ["security-updates"],
      "constraints": {
        "require_timestamp": true,
        "max_age_days": 30
      }
    }
  ]
}
```

#### Development Team Bundle

```json
{
  "bundle_id": "dev-team-alpha-2025",
  "name": "Development Team Alpha Keys",
  "keys": [
    {
      "key_id": "dev-alice-2025",
      "public_key": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "trust_level": "medium",
      "purposes": ["development", "testing"],
      "owner": {
        "name": "Alice Developer",
        "email": "alice@company.com"
      },
      "validity": {
        "not_after": "2025-12-31T23:59:59Z"
      }
    }
  ]
}
```

## CLI Integration

### Loading Trust Bundles

```bash
# Use trust bundle from file
pp verify document.pdf --trust-bundle /path/to/trust-bundle.json

# Use trust bundle from URL
pp verify document.pdf --trust-bundle https://company.com/security/trust-bundle.json

# Use multiple trust bundles
pp verify document.pdf \
  --trust-bundle company-keys.json \
  --trust-bundle team-keys.json
```

### Trust Bundle Priority

When multiple trust bundles are loaded, key resolution follows this priority:

1. **Exact key_id match** in higher-priority bundles
2. **Trust level** (high > medium > low)
3. **Bundle loading order** (first loaded wins for equal trust levels)

### Verification Behavior

```bash
# Standard verification with trust bundle
pp verify *.pdf --trust-bundle org-keys.json

# Strict mode: require all keys to be in trust bundle
pp verify *.pdf --trust-bundle org-keys.json --strict

# Combined with revocation checking
pp verify *.pdf \
  --trust-bundle org-keys.json \
  --revocations https://org.com/revocations.json \
  --revocation-pubkey abcdef123456...
```

## Trust Bundle Creation

### 1. Key Collection

Gather public keys from authorized sources:

```bash
# Extract public key from signing key
pp fingerprint --key signing-key.pem --format hex

# Get public key from existing passport
jq -r '.signature.key_id' sample.passport.json
```

### 2. Bundle Assembly

Create the trust bundle JSON with appropriate metadata:

```json
{
  "version": "1.0",
  "bundle_id": "my-org-2025",
  "keys": [
    {
      "key_id": "extracted-key-id",
      "public_key": "extracted-public-key-hex",
      "trust_level": "high",
      "owner": {
        "name": "Key Owner Name"
      }
    }
  ]
}
```

### 3. Bundle Signing

Sign the trust bundle for integrity verification:

```bash
# Sign trust bundle
node scripts/sign-trust-bundle.mjs trust-bundle.json --key authority-key.pem

# Verify signed bundle
pp verify-trust-bundle trust-bundle.json --authority-key authority.pub
```

## Security Considerations

### Key Management

- **Key Rotation**: Trust bundles should be updated regularly as keys are rotated
- **Expiration**: Set appropriate `valid_until` dates and monitor expiration
- **Revocation Integration**: Always use trust bundles alongside revocation checking
- **Bundle Integrity**: Sign trust bundles to prevent tampering

### Trust Policies

```json
{
  "policies": {
    "default_trust_level": "medium",
    "require_revocation_check": true,
    "max_key_age_days": 1095,
    "require_key_rollover_notice": 90,
    "allowed_algorithms": ["ed25519"],
    "minimum_key_strength": 256
  }
}
```

### Validation Rules

1. **Bundle Signature**: Verify bundle signature before using keys
2. **Key Expiration**: Check key validity periods against current time
3. **Purpose Matching**: Ensure key purposes match intended usage
4. **Trust Level**: Apply appropriate verification rigor based on trust level
5. **Constraint Enforcement**: Validate against specified constraints

## Distribution and Updates

### Centralized Distribution

```bash
# Organization trust bundle endpoint
https://security.company.com/trust-bundles/production.json

# Versioned bundles
https://security.company.com/trust-bundles/v2025.1/production.json

# Environment-specific bundles
https://security.company.com/trust-bundles/staging.json
```

### Automatic Updates

```bash
# Update trust bundles daily
0 6 * * * pp update-trust-bundles --config ~/.pp/config.json

# Validate and reload bundles
pp verify-trust-bundles --directory ~/.pp/trust-bundles/
```

### Version Management

Trust bundles should follow semantic versioning:

- **Major**: Breaking changes to bundle format
- **Minor**: New keys added, non-breaking policy changes
- **Patch**: Key metadata updates, corrections

## Implementation Examples

### Corporate Environment

```json
{
  "bundle_id": "corp-infrastructure-2025",
  "name": "Corporate Infrastructure Trust Bundle",
  "keys": [
    {
      "key_id": "ci-cd-pipeline-2025",
      "public_key": "...",
      "trust_level": "high",
      "purposes": ["ci-cd", "automated-builds"],
      "constraints": {
        "allowed_artifacts": ["*.tar.gz", "*.deb", "*.rpm"],
        "require_timestamp": true
      }
    },
    {
      "key_id": "security-team-emergency-2025",
      "public_key": "...",
      "trust_level": "high",
      "purposes": ["emergency-patches", "security-updates"],
      "constraints": {
        "max_age_days": 7,
        "require_approval": true
      }
    }
  ],
  "policies": {
    "require_revocation_check": true,
    "default_trust_level": "medium"
  }
}
```

### Open Source Project

```json
{
  "bundle_id": "myproject-maintainers-2025",
  "name": "MyProject Maintainer Keys",
  "keys": [
    {
      "key_id": "lead-maintainer-alice",
      "public_key": "...",
      "trust_level": "high",
      "purposes": ["release-signing"],
      "owner": {
        "name": "Alice Maintainer",
        "github": "alice-dev",
        "pgp_fingerprint": "1234 5678 9ABC DEF0..."
      }
    },
    {
      "key_id": "maintainer-bob",
      "public_key": "...",
      "trust_level": "medium",
      "purposes": ["release-signing", "testing"],
      "owner": {
        "name": "Bob Contributor",
        "github": "bob-contrib"
      }
    }
  ]
}
```

## Trust Bundle Schema

The trust bundle format follows a JSON schema for validation:

```json
{
  "$schema": "https://schemas.provenancepass.org/trust-bundle-v1.schema.json",
  "type": "object",
  "required": ["version", "bundle_id", "keys"],
  "properties": {
    "version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "bundle_id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "keys": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["key_id", "public_key", "algorithm"],
        "properties": {
          "key_id": {
            "type": "string",
            "minLength": 1
          },
          "public_key": {
            "type": "string", 
            "pattern": "^[0-9a-fA-F]{64}$"
          },
          "algorithm": {
            "type": "string",
            "enum": ["ed25519"]
          }
        }
      }
    }
  }
}
```

## Best Practices

### For Bundle Creators

1. **Regular Updates**: Update bundles monthly or when keys change
2. **Clear Naming**: Use descriptive bundle_id and key_id values
3. **Documentation**: Include comprehensive owner and purpose information
4. **Signing**: Always sign trust bundles with a well-known authority key
5. **Validation**: Test bundles before distribution

### For Bundle Consumers

1. **Verification**: Always verify bundle signatures before use
2. **Caching**: Cache bundles locally but check for updates regularly
3. **Fallback**: Have fallback verification methods if bundles are unavailable
4. **Monitoring**: Monitor for bundle updates and key changes
5. **Revocation**: Combine trust bundles with revocation checking

### For Organizations

1. **Key Governance**: Establish clear policies for key inclusion in bundles
2. **Access Control**: Limit who can update trust bundles
3. **Audit Trail**: Maintain logs of bundle changes and key additions
4. **Incident Response**: Have procedures for emergency key revocation
5. **Training**: Ensure staff understand trust bundle concepts and usage

## Migration Guide

### From Manual Key Management

1. **Inventory**: Catalog existing public keys and their usage
2. **Categorize**: Group keys by owner, purpose, and trust level
3. **Bundle Creation**: Create appropriate trust bundles for each category
4. **Testing**: Test verification with new bundles
5. **Rollout**: Gradually migrate verification workflows

### From Other Systems

Trust bundles can complement existing PKI infrastructure:

- **X.509 Integration**: Extract Ed25519 keys from X.509 certificates
- **PGP Keyring**: Convert PGP keys to trust bundle format
- **SSH Known Hosts**: Adapt SSH key management concepts

## Troubleshooting

### Common Issues

1. **Key Not Found**: Check bundle loading and key_id spelling
2. **Signature Verification Failed**: Verify bundle signature and authority key
3. **Trust Level Conflicts**: Review trust level assignment and policies
4. **Expired Keys**: Check key validity periods and update bundles
5. **Network Issues**: Implement local caching for bundle availability

### Debug Commands

```bash
# List loaded trust bundles
pp trust-bundles list

# Validate trust bundle format
pp trust-bundles validate bundle.json

# Show key resolution for specific key_id
pp trust-bundles resolve key-id-here

# Test bundle loading
pp verify --trust-bundle bundle.json --dry-run
```

## Future Enhancements

Planned improvements to trust bundle functionality:

- **Hierarchical Bundles**: Parent/child bundle relationships
- **Conditional Trust**: Dynamic trust levels based on context
- **Key Attestation**: Hardware-backed key attestation support
- **Automated Discovery**: DNS-based trust bundle discovery
- **Multi-Algorithm**: Support for additional signature algorithms