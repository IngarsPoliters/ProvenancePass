# Provenance Passport Specification Changelog

*Version history and breaking changes for the Provenance Passport specification.*

## [Unreleased]

### Added
- RFC process for specification changes
- Conformance test suite with Vitest
- Schema validation test vectors
- Signature verification test vectors

### Changed
- TBD

### Deprecated
- TBD

### Removed
- TBD

### Fixed
- TBD

### Security
- TBD

---

## [0.1.0] - 2024-08-19

**Initial Release** - First stable version of the Provenance Passport specification.

### Added
- **Core Schema**: Complete JSON schema definition for passport format
- **Cryptographic Requirements**: Ed25519 signature specification
- **Canonicalization**: JCS (RFC 8785) requirement for signature computation
- **Artifact Binding**: SHA-256 digest requirement for tamper detection
- **Provenance Chain**: Support for inputs, steps, and reviews
- **Policy Framework**: Policy check validation structure
- **MIME Type Support**: Content type identification
- **Timestamp Requirements**: ISO8601 UTC timestamp specification

### Schema Structure
- **Required Fields**: version, artifact.sha256, artifact.mime, artifact.created_at, signature.*
- **Optional Fields**: artifact.name, artifact.size, inputs[], steps[], review, policy_checks[]
- **Field Validation**: Comprehensive validation rules and constraints
- **Extension Points**: Structured extension mechanism for future versions

### Cryptographic Specification
- **Signature Algorithm**: Ed25519 (RFC 8032)
- **Hash Algorithm**: SHA-256 for artifact binding
- **Key Format**: 64-character hex encoding for public keys
- **Signature Format**: 128-character hex encoding for signatures
- **Canonicalization**: JCS (JSON Canonicalization Scheme, RFC 8785)

### Implementation Guidelines
- **Backward Compatibility**: Version field enables future compatibility
- **Security Considerations**: Threat model and mitigation strategies
- **Privacy Guidelines**: Data minimization and user control principles
- **Embedding Methods**: C2PA, DOCX custom parts, sidecar files

### Documentation
- **[pp-0.1.md](pp-0.1.md)**: Complete specification document
- **[pp-0.1.schema.json](pp-0.1.schema.json)**: JSON Schema for validation
- **[signing-and-revocation.md](signing-and-revocation.md)**: Cryptographic details
- **[threat-model.md](threat-model.md)**: Security analysis using STRIDE
- **[embedding.md](embedding.md)**: Format-specific embedding guidelines
- **[trust-bundles.md](trust-bundles.md)**: Key distribution and revocation

---

## Version Numbering

### Semantic Versioning
Provenance Passport follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR**: Incompatible schema changes
- **MINOR**: Backward-compatible additions
- **PATCH**: Backward-compatible bug fixes

### Pre-release Versions
- **Alpha**: `0.2.0-alpha.1` - Early development, breaking changes expected
- **Beta**: `0.2.0-beta.1` - Feature complete, testing and feedback
- **Release Candidate**: `0.2.0-rc.1` - Final testing before release

### Compatibility Promise

#### **Backward Compatibility** (MINOR versions)
- Existing valid passports remain valid
- New optional fields may be added
- Validation rules may be relaxed (but not tightened)
- Implementation requirements may be clarified

#### **Breaking Changes** (MAJOR versions)
- Schema structure changes
- Required field additions
- Validation rule changes that invalidate existing passports
- Cryptographic algorithm changes
- Canonicalization method changes

### Migration Guidelines

#### **Version 0.1.x → 0.2.x** (Future)
- All v0.1 passports will remain valid
- New implementations should support both versions
- Deprecation notices will precede removal by at least 12 months

#### **Version 0.x → 1.0** (Future Stable)
- Major stability milestone
- Long-term support commitment
- Comprehensive migration tooling
- Extended backward compatibility period

---

## Change Categories

### Added ✨
New features, fields, or capabilities that don't break existing functionality.

### Changed 🔄
Modifications to existing functionality that maintain backward compatibility.

### Deprecated ⚠️
Features marked for future removal. Will be supported for at least 12 months after deprecation notice.

### Removed 🗑️
Features that have been completely removed. Only appears in MAJOR version changes.

### Fixed 🐛
Bug fixes that don't change the specification semantics.

### Security 🔒
Security-related changes, vulnerability fixes, or cryptographic updates.

---

## RFC Process

### Proposing Changes
1. **Draft RFC**: Create RFC document using template ([docs/spec/rfcs/0001-template.md](rfcs/0001-template.md))
2. **Discussion**: Open issue for community discussion
3. **Review Period**: Minimum 2 weeks for significant changes
4. **Implementation**: Prototype in conformance tests
5. **Approval**: Maintainer approval and merge
6. **Release**: Include in next appropriate version

### RFC Status
- **Draft**: Initial proposal, seeking feedback
- **Accepted**: Approved for implementation
- **Final**: Implemented and released
- **Withdrawn**: Proposal abandoned
- **Superseded**: Replaced by later RFC

---

## Implementation Status

### Current Implementations

#### **@provenancepass/cli v0.1.0**
- ✅ Complete v0.1 schema support
- ✅ Ed25519 signature generation/verification
- ✅ JCS canonicalization
- ✅ C2PA embedding support
- ✅ DOCX custom parts
- ✅ Sidecar file support

#### **Web Viewer v0.1.0**
- ✅ v0.1 passport verification
- ✅ C2PA metadata extraction
- ✅ Sidecar file detection
- ✅ Revocation list checking
- ✅ Cross-platform support

#### **GitHub Action v0.1.0**
- ✅ Automated passport creation
- ✅ Bulk verification
- ✅ CI/CD integration
- ✅ Multi-platform support

### Conformance Testing
- ✅ Schema validation tests
- ✅ Signature verification tests
- ✅ Canonicalization tests
- ✅ Edge case handling
- ✅ Error condition tests

---

## Future Roadmap

### Version 0.2 (Planned Q1 2025)
- **Enhanced Provenance Chain**: Multi-step processing support
- **Policy Framework**: Advanced policy validation
- **Timestamp Verification**: Trusted timestamping support
- **Metadata Extensions**: Custom metadata fields
- **Performance Optimizations**: Larger file support

### Version 1.0 (Planned Q3 2025)
- **Stability Commitment**: Long-term backward compatibility
- **Enterprise Features**: Advanced audit and compliance
- **Federation Support**: Cross-organization trust
- **Standards Alignment**: Integration with industry standards
- **Comprehensive Documentation**: Complete implementation guide

### Long-term (2026+)
- **Multi-Signature Support**: Threshold signatures
- **Zero-Knowledge Proofs**: Privacy-preserving verification
- **Quantum Resistance**: Post-quantum cryptography migration
- **Blockchain Integration**: Decentralized trust anchors

---

## Contributing

### Specification Changes
1. **Read**: Review existing specifications and RFCs
2. **Discuss**: Open GitHub issue for discussion
3. **Draft**: Create RFC using provided template
4. **Implement**: Create conformance tests for changes
5. **Document**: Update changelog and related documentation

### Reporting Issues
- **Schema Issues**: Problems with JSON schema validation
- **Specification Ambiguities**: Unclear or conflicting requirements
- **Security Concerns**: Cryptographic or security issues
- **Implementation Problems**: Real-world implementation challenges

### Contact
- **GitHub Issues**: [ProvenancePass Issues](https://github.com/IngarsPoliters/ProvenancePass/issues)
- **RFC Discussions**: [ProvenancePass Discussions](https://github.com/IngarsPoliters/ProvenancePass/discussions)
- **Security Issues**: security@provenancepass.com
- **Specification Questions**: spec@provenancepass.com

---

## Acknowledgments

### Contributors
- Initial specification design and implementation
- Community feedback and testing
- Security review and analysis
- Documentation and examples

### Standards References
- **RFC 8785**: JSON Canonicalization Scheme (JCS)
- **RFC 8032**: Edwards-Curve Digital Signature Algorithm (EdDSA)
- **RFC 3339**: Date and Time on the Internet: Timestamps
- **RFC 2045**: Multipurpose Internet Mail Extensions (MIME)
- **ISO/IEC 21320-1**: Document Container File (for C2PA)

---

*Last updated: 2024-08-19*
*Next review: 2024-11-19*