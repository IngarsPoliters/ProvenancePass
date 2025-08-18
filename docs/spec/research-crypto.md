# Cryptography Libraries and Signing Patterns Research

## Ed25519 Libraries

### @noble/ed25519 (TypeScript/JavaScript)
@noble/ed25519 is the fastest 4KB JavaScript implementation of ed25519 EDDSA signatures, compliant with RFC8032, FIPS 186-5 & ZIP215. The library provides strong unforgeability under chosen message attacks (SUF-CMA) and non-repudiation capabilities with only 400 lines of pure ESM code.

Key features include zero dependencies to minimize security risks, transparent releases built on GitHub CI with commit signature verification, and both synchronous and asynchronous API methods. The library supports three main operations: `getPublicKey(privateKey)`, `sign(message, privateKey)`, and `verify(signature, message, publicKey)`.

Installation is straightforward with `npm i @noble/ed25519`, and the library is widely adopted with 400+ projects in the npm registry using it. Version 2.x features improved security and a smaller attack surface, reduced 4x to just over 300 lines from the previous version.

### PyNaCl (Python)
PyNaCl provides Ed25519 signatures through elliptic-curve cryptography carefully engineered for high performance without compromising security. The library offers significant performance advantages: only 273,364 cycles for signature verification and 87,548 cycles for signing on Intel Nehalem/Westmere CPUs.

Security features include a 2^128 security level comparable to NIST P-256 and RSA with ~3000-bit keys. The implementation avoids conditional branches based on secret data, making it immune to side-channel attacks through branch prediction. Ed25519 signatures are compact at only 512 bits (64 bytes) with 256-bit (32 bytes) keys.

Unlike ECDSA, Ed25519 operates deterministically, computing signature nonces from a hash of the signing key's seed and the message rather than relying on entropy sources. PyNaCl is recommended over the older python-ed25519 library, offering 10-20x performance improvements while being well-maintained by the PyCA team.

## Canonical JSON Signing Patterns

### JSON Web Signature (JWS) Approach
JSON Web Signature (JWS) represents content secured with digital signatures or MACs using JSON-based data structures. The specification uses base64url encoding for three components: protected header, payload, and signature, typically concatenated with period separators.

JWS allows white space in JSON representations and performs no canonicalization before encoding. For applications requiring consistent output from multiple parties, conventions should be defined for canonical representation of case-insensitive elements like DNS names.

### Advanced Canonicalization Patterns
For sophisticated canonicalization requirements, the W3C's JSON Web Signature 2020 suite uses the RDF Dataset Normalization Algorithm to transform input documents into canonical form before hashing and signing with detached signature algorithms.

String comparison in JWS processing treats StringOrURI values as case-sensitive with no transformations or canonicalizations applied. Applications requiring deterministic canonical forms should implement additional normalization layers beyond basic JWS processing.

### Implementation Considerations
Processing JWS requires comparing known strings to JSON object members and values. The signature covers both the protected header and payload to ensure integrity. Applications may need custom canonicalization for specific use cases while maintaining JWS compatibility.

## Revocation Strategies

### Certificate Revocation Lists (CRLs)
CRLs are lists maintained by Certificate Authorities (CAs) containing certificates revoked before their expiration dates. Each entry includes the certificate's serial number, revocation date, and optionally the reason for revocation and time limits for the revocation period.

CRLs are published periodically (often within 24 hours) or immediately after certificate revocation. The effectiveness of CRLs depends on certificate consumers checking these lists, though many skip verification due to performance concerns in authentication processes.

### Online Certificate Status Protocol (OCSP)
OCSP provides real-time certificate status checking but is declining in usage due to privacy and performance concerns. The trend is returning to CRLs despite their delayed propagation characteristics.

### Revocation Triggers
Common reasons for certificate revocation include private key compromise, CA compromise, employee departure (affiliation change), certificate supersession, and cessation of operations. Immediate revocation is critical when private keys are compromised to prevent exploitation.

### Implementation Challenges
Revocation systems face trade-offs between timeliness of revocation discovery and resource usage. While CAs must issue CRLs, certificate consumers discretionarily choose whether to check revocation status, balancing security against performance requirements.

### Best Practices
Effective revocation strategies include regular key rotation and renewal cycles, comprehensive certificate lifecycle management procedures, and immediate revocation processes for compromised keys. Organizations should establish clear procedures for certificate issuance, renewal, and revocation to maintain PKI integrity.

### Alternative Approaches
Soft binding mechanisms, such as content fingerprints and imperceptible watermarks, can provide revocation recovery when traditional PKI revocation fails. These approaches are particularly relevant for content provenance systems where embedded signatures may be stripped.

## References

- [@noble/ed25519 GitHub Repository](https://github.com/paulmillr/noble-ed25519)
- [@noble/ed25519 NPM Package](https://www.npmjs.com/package/@noble/ed25519)
- [PyNaCl Digital Signatures Documentation](https://pynacl.readthedocs.io/en/latest/signing/)
- [RFC 7515 - JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515)
- [JSON Web Signature 2020 W3C Specification](https://www.w3.org/community/reports/credentials/CG-FINAL-lds-jws2020-20220721/)
- [Certificate Revocation List - NIST Definition](https://www.techtarget.com/searchsecurity/definition/Certificate-Revocation-List)
- [Public Key Infrastructure Overview - Entrust](https://www.entrust.com/resources/learn/what-is-pki)
- [Understanding Digital Signatures - CISA](https://www.cisa.gov/news-events/news/understanding-digital-signatures)
- [PKI Digital Signature Guide - SecureW2](https://www.securew2.com/blog/pki-digital-signature)