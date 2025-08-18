# SLSA and in-toto Attestations Research

## SLSA Framework Overview

Supply-chain Levels for Software Artifacts (SLSA, pronounced "salsa") is a security framework developed by Google and adopted by the OpenSSF to ensure the integrity and security of software artifacts throughout their supply chain. SLSA provides a structured approach through progressive security levels, with version 1.0 focusing primarily on the Build Track to ensure trustworthy software artifact creation processes.

The framework addresses supply chain tampering by providing verifiable evidence through attestations, helping organizations assess and improve their software supply chain security posture systematically.

## SLSA Build Track Levels

### Build L0: No Guarantees
This level represents the absence of SLSA compliance, intended for development or test builds where software is built and run on the same machine. No security controls or provenance tracking are required at this level.

### Build L1: Provenance Exists
Organizations must maintain consistent and reproducible build environments with documented configurations. Basic provenance metadata is generated, including information about the source, build script, build platform, and top-level dependencies. While provenance must be available, it doesn't need to be comprehensive or tamper-proof.

### Build L2: Hosted Build Platform
At this level, provenance is digitally signed by the build platform, significantly increasing the difficulty of forging or tampering with artifact metadata without detection. The requirement for valid digital signatures linking the build platform to artifacts provides stronger integrity guarantees.

### Build L3: Hardened Build Platform
The highest assurance level incorporates rigorous security practices including continuous monitoring, penetration testing, and comprehensive supply chain attestation. This level provides maximum confidence in the security and integrity of software artifacts through hardened build environments and strict isolation controls.

## in-toto Attestation Framework

### ITE-6 Format Specification
The in-toto Attestation Framework, introduced in ITE-6, defines the format for software supply chain attestations. An attestation is authenticated metadata about one or more software artifacts, structured in four independent but interconnected layers:

**Envelope**: Handles authentication and serialization, containing minimally a statement and signature that identifies the attestor.

**Statement**: Binds the attestation to particular subjects and unambiguously identifies predicate types. Must contain subject and predicate fields.

**Subject**: Identifies which artifacts the predicate applies to, typically through cryptographic digests.

**Predicate**: Contains arbitrary metadata about the subject with type-specific schemas.

### Attestation Bundle (Optional)
A collection mechanism for grouping multiple related or unrelated attestations together, enabling comprehensive documentation of complex supply chain processes.

## GitHub Artifact Attestations

### SLSA Integration
GitHub Artifact Attestations simplify the journey to SLSA Level 3 compliance by enabling secure, automated build verification within GitHub Actions workflows. The service creates cryptographically signed claims establishing build provenance, including workflow associations, repository information, commit SHA, and triggering events.

### Implementation Requirements
Setting up attestations requires minimal workflow changes: adding the `actions/attest-build-provenance@v2` action after artifact builds. Required permissions include `id-token: write`, `contents: read`, and `attestations: write` in the workflow configuration.

### Compliance Levels
Generating build provenance automatically achieves SLSA Level 1. Using GitHub Artifact Attestations on GitHub-hosted runners reaches SLSA Level 2 by default, with straightforward progression to Level 3 through additional hardening measures.

## Verification in CI/CD

### Native GitHub Verification
GitHub provides multiple verification methods including GitHub CLI (`gh attestation verify`), Kubernetes Admission Controllers for automated verification, and offline verification capabilities through downloaded attestations.

### CI/CD Integration Patterns
Attestations can verify Terraform plans before application, validate Ansible/Salt configurations before deployment, authenticate containers before Kubernetes deployment, and integrate with GitOps workflows using tools like Flux.

### Security Considerations
Attestation generation alone provides no security benefit; verification is essential for realizing security advantages. The verification process ensures signed artifacts remain authentic and unmodified throughout the supply chain.

### Verification Tools
The SLSA verifier (`slsa-framework/slsa-verifier`) provides standalone verification capabilities for SLSA-compliant builders, supporting various attestation formats and signature schemes including Sigstore's cosign for comprehensive supply chain verification.

## Best Practices for Implementation

Organizations should start with SLSA Level 1 to establish basic provenance tracking, then progress through higher levels as security requirements demand. Automated verification should be integrated into deployment pipelines to ensure attestations are checked before artifact deployment. Regular monitoring and validation of attestation integrity helps maintain supply chain security over time.

## References

- [SLSA Official Specification](https://slsa.dev/)
- [GitHub Artifact Attestations Documentation](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)
- [in-toto Attestation Framework Specification](https://github.com/in-toto/attestation)
- [SLSA Verifier Tool](https://github.com/slsa-framework/slsa-verifier)
- [GitHub Actions Attest Build Provenance](https://github.com/actions/attest-build-provenance)
- [SLSA v1.0 Build Level 3 Implementation Guide](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-and-reusable-workflows-to-achieve-slsa-v1-build-level-3)
- [in-toto ITE-6 Generalized Link Format](https://github.com/in-toto/ITE/pull/15)
- [Sigstore Cosign Bundle Verification](https://blog.sigstore.dev/cosign-verify-bundles/)
- [Supply Chain Security with SLSA Framework](https://blog.kubesimplify.com/supply-chain-security-using-slsa-part-2-the-framework)