# Threat Model

This document analyzes security threats to the Provenance Passport system using a STRIDE-based approach, identifying potential attacks and corresponding mitigations.

## Threat Categories

### Spoofing (Identity Fraud)

**Threat**: Counterfeit passport creation with fake signatures or stolen identities.

#### Attack Scenarios
- **Forged signatures**: Attacker creates passport with invalid signature
- **Key impersonation**: Attacker claims to own legitimate public key
- **Passport cloning**: Copying valid passport for different artifact

#### Mitigations
- **Cryptographic signatures**: Ed25519 signatures prevent forgery without private key
- **Key ID verification**: `ppk_` prefix + SHA-256 hash links signatures to specific keys
- **Trust bundles**: Curated lists of trusted public keys for verification
- **Certificate pinning**: Pin trusted signing authorities in verification software

```
Verification Chain:
Passport → Signature → Public Key → Key ID → Trust Bundle → Authority
```

### Tampering (Data Integrity)

**Threat**: Modification of passport content or artifact without detection.

#### Attack Scenarios
- **Passport modification**: Altering fields after signing
- **Artifact substitution**: Replacing original file while keeping passport
- **Replay attacks**: Reusing valid passport for different context

#### Mitigations
- **Artifact binding**: SHA-256 hash cryptographically binds passport to specific content
- **Signature coverage**: Signature covers all passport fields except signature itself
- **C2PA integration**: For supported formats, bind to C2PA claim for stronger integrity
- **Immutable storage**: Store signed passports in append-only systems

```
Integrity Chain:
Original Artifact → SHA-256 → Passport Content → JCS Canonical → Signature
```

### Repudiation (Non-accountability)

**Threat**: Signers denying they created or approved specific passports.

#### Attack Scenarios
- **Key disavowal**: Claiming private key was compromised after signing
- **Timestamp disputes**: Arguing about when signature was created
- **Context denial**: Claiming passport was signed for different purpose

#### Mitigations
- **Non-repudiable signatures**: Ed25519 provides mathematical proof of signing
- **Timestamp inclusion**: Require `created_at` and `started_at`/`ended_at` fields
- **Audit logging**: Log all signing operations with secure timestamps
- **Key management**: Secure key storage with access controls and monitoring

### Information Disclosure (Privacy Leaks)

**Threat**: Sensitive information exposure through passport metadata.

#### Attack Scenarios
- **Metadata analysis**: Inferring sensitive details from processing steps
- **Input exposure**: Raw prompts or file contents included in inputs array
- **Tool fingerprinting**: Identifying internal tools and infrastructure
- **Timing attacks**: Inferring content type from processing duration

#### Mitigations
- **Hash-only defaults**: Store only hashes, never raw content by default
- **Selective disclosure**: Allow users to choose what metadata to include
- **Input sanitization**: Strip sensitive information from tool names and parameters
- **Generalized timing**: Round timestamps to reduce timing precision

```
Privacy Levels:
Full Disclosure → Selective Metadata → Hash-Only → Claims-Only → Minimal
```

### Denial of Service (Availability)

**Threat**: Disrupting passport creation, verification, or revocation services.

#### Attack Scenarios
- **Verification flooding**: Overwhelming signature verification endpoints
- **Revocation poisoning**: Falsely marking legitimate keys as revoked
- **Resource exhaustion**: Memory/CPU attacks during JCS canonicalization
- **Storage bloat**: Creating massive passports to exhaust storage

#### Mitigations
- **Rate limiting**: Throttle verification requests per client
- **Signature caching**: Cache verification results for repeated checks
- **Size limits**: Enforce maximum passport size and field count
- **Distributed verification**: Multiple verification endpoints for redundancy
- **Revocation authentication**: Require signatures on revocation lists

### Elevation of Privilege (Authorization Bypass)

**Threat**: Gaining unauthorized access to signing keys or administrative functions.

#### Attack Scenarios
- **Key extraction**: Stealing private keys from compromised systems
- **Privilege escalation**: Using limited access to gain full signing rights
- **CI/CD compromise**: Injecting malicious code into build pipelines
- **Social engineering**: Tricking administrators into revealing keys

#### Mitigations
- **HSM/KMS usage**: Store private keys in hardware security modules
- **Principle of least privilege**: Limit key access to minimum necessary scope
- **Multi-factor authentication**: Require MFA for key access
- **Key rotation**: Regular rotation limits impact of compromise
- **Monitoring**: Alert on unusual key usage patterns

## Specific Attack Vectors

### Metadata Stripping Attacks

**Problem**: Passports stored as separate files can be easily removed.

#### Attack Method
1. Distribute artifact without accompanying `.pp` sidecar file
2. Recipients cannot verify provenance without passport
3. Malicious content appears legitimate due to missing verification

#### Mitigations
- **Embedded signatures**: Encourage in-band signatures where possible (PDF, images)
- **Remote manifest store**: Central registry mapping artifact hashes to passports
- **Visible fingerprints**: Short hash displayed in UI when passport missing
- **Policy enforcement**: Require passport presence for sensitive operations

```
Defense in Depth:
Embedded → Sidecar → Remote Store → Visible Hash → Policy Check
```

### Key Compromise Scenarios

**Timeline**: What happens when signing keys are compromised.

#### Immediate Response (0-1 hours)
- **Disable key**: Remove from active signing systems
- **Generate new key**: Create replacement with new key_id
- **Emergency revocation**: Add to revocations.json immediately

#### Short-term Response (1-24 hours)
- **Notify stakeholders**: Alert all passport verifiers
- **Audit signatures**: Review all passports signed with compromised key
- **Update trust bundles**: Remove compromised key from trusted lists

#### Long-term Response (1-30 days)
- **Re-sign affected artifacts**: Create new passports with replacement key
- **Security review**: Analyze how compromise occurred
- **Process improvements**: Update key management procedures

### Privacy Leakage Vectors

**Data Categories**: What information might leak through passport metadata.

#### High-Risk Information
- **Raw prompts**: Direct AI inputs containing sensitive instructions
- **File contents**: Actual data snippets in error messages or logs
- **Internal paths**: System directories revealing infrastructure details
- **Personal identifiers**: Email addresses, usernames, or employee IDs

#### Medium-Risk Information
- **Tool versions**: Specific software versions revealing security vulnerabilities  
- **Processing times**: Duration patterns indicating content sensitivity
- **Infrastructure details**: Cloud regions, instance types, or network topology
- **Workflow patterns**: Step sequences revealing business processes

#### Low-Risk Information
- **Hash values**: SHA-256 hashes provide minimal information leakage
- **Timestamps**: General timing information (rounded to hours)
- **Public tool names**: Commonly known software (git, npm, docker)
- **Standard formats**: MIME types and file extensions

## Risk Assessment Matrix

| Threat | Likelihood | Impact | Risk Level | Primary Mitigation |
|--------|------------|--------|------------|-------------------|
| Forged signatures | Low | High | Medium | Ed25519 + Trust bundles |
| Metadata stripping | High | Medium | High | Sidecar + Remote store |
| Key compromise | Medium | High | High | HSM/KMS + Rotation |
| Privacy leakage | Medium | Medium | Medium | Hash-only defaults |
| Replay attacks | Low | Low | Low | SHA-256 binding |
| Revocation bypass | Low | High | Medium | Signed revocation lists |

## Implementation Guidelines

### Secure Development Practices

- **Input validation**: Validate all passport fields against schema
- **Error handling**: Avoid leaking sensitive information in error messages
- **Logging security**: Never log private keys or sensitive metadata
- **Testing**: Include security test cases for all threat scenarios

### Deployment Security

- **Network security**: Use TLS for all passport transmission
- **Storage encryption**: Encrypt private keys at rest
- **Access logging**: Audit all key access and administrative operations
- **Monitoring**: Alert on signature verification failures or unusual patterns

### User Education

- **Best practices**: Document secure passport handling procedures
- **Tool configuration**: Provide secure default settings for passport creation
- **Verification guidance**: Teach users how to properly verify passport authenticity
- **Incident response**: Clear procedures for handling security incidents