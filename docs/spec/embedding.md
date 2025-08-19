# Provenance Passport C2PA Embedding

This document describes how Provenance Passport receipts are embedded into media files using the Coalition for Content Provenance and Authenticity (C2PA) standard.

## Overview

Provenance Passport supports two methods for storing cryptographic receipts:

1. **Sidecar files** - Traditional `.passport.json` files stored alongside artifacts
2. **C2PA embedding** - Receipts embedded directly into media files using C2PA manifests

C2PA embedding provides several advantages:
- Self-contained provenance (no separate files needed)
- Industry standard format supported by major platforms
- Tamper-evident through cryptographic binding
- Interoperability with other C2PA tools

## Supported File Types

C2PA embedding is supported for media file types that can contain metadata:

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png) 
- WebP (.webp)
- AVIF (.avif)

### Video  
- MP4 (.mp4)
- MOV (.mov)
- WebM (.webm)

### Documents
- PDF (.pdf)
- DOCX (.docx) - Uses pointer-based fallback when C2PA is unavailable

### Audio
- MP3 (.mp3)
- WAV (.wav)
- FLAC (.flac)

**Note**: Plain text files, source code, and other non-media formats require sidecar files as they cannot contain embedded metadata.

## DOCX Pointer-Based Fallback

For DOCX files when C2PA embedding is not available, Provenance Passport uses a pointer-based approach that stores a minimal reference in the OOXML custom parts and relies on external receipt storage.

### Why Pointer Approach is Required

OOXML format (used by DOCX) has limitations when C2PA is not supported:
- Large embedded JSON receipts can cause compatibility issues with older Office versions
- Some document processors may strip or corrupt large custom XML parts
- Network-based verification allows for centralized receipt management

### Pointer Schema

Instead of embedding the full receipt, a minimal pointer is stored in `customXml/provenance-passport.json`:

```json
{
  "version": "0.1",
  "type": "provenance-passport-pointer",
  "sha256": "abc123...",
  "manifest_url": null
}
```

### Verification Process

When verifying a DOCX with a pointer:

1. **Sidecar lookup**: Look for `<basename>.passport.json` next to the DOCX file
2. **Manifest fallback**: If `--manifest <url>` is provided, fetch `GET ${url}/{sha256}`
3. **Warning on missing**: Return warning status if neither is found

### Hash Verification

For pointer-based fallback:
- **No bytes hash comparison** is performed on the DOCX file itself
- Hash verification only applies to sidecar files and C2PA embedded receipts
- The pointer's SHA256 is used for manifest URL construction only

## C2PA Manifest Structure

When embedding a Provenance Passport, the following assertions are added to the C2PA manifest:

```json
{
  "claim_generator": "provenancepass-cli/0.1.0",
  "claim_generator_info": [
    "https://provenancepass.com",
    "Provenance Passport CLI - Cryptographic provenance for digital artifacts"
  ],
  "title": "Provenance Passport for [artifact-name]",
  "format": "[mime-type]",
  "assertions": {
    "com.provenancepassport.receipt": { 
      // Complete Provenance Passport JSON
    },
    "com.provenancepassport.version": "0.1",
    "com.provenancepassport.hash_binding": "c2pa-claim"
  }
}
```

### Custom Assertion Namespace

Provenance Passport uses the assertion namespace `com.provenancepassport.*`:

- **`com.provenancepassport.receipt`** - The complete passport JSON including signature, artifact metadata, steps, and policy checks
- **`com.provenancepassport.version`** - The Provenance Passport specification version (currently "0.1")  
- **`com.provenancepassport.hash_binding`** - Set to "c2pa-claim" to indicate the passport is bound to the C2PA claim rather than raw file bytes

## Hash Binding Modes

Provenance Passport supports two hash binding modes:

### 1. Bytes Binding (`hash_binding: "bytes"`)
Used for sidecar files. The passport signature covers the raw file bytes.

### 2. C2PA Claim Binding (`hash_binding: "c2pa-claim"`)
Used for embedded passports. The passport signature covers the artifact hash, but verification relies on C2PA's cryptographic binding to the file content.

When embedding a passport, the `hash_binding` field is automatically updated to `"c2pa-claim"`.

## CLI Usage

### Embedding a Passport

```bash
# Embed an existing passport into a media file
pp embed image.jpg --passport image.jpg.passport.json

# Re-sign and embed (useful if the passport needs updating)
pp embed image.jpg --passport image.jpg.passport.json --sign signing-key.pem
```

The embed command:
1. Validates the passport format
2. Optionally re-signs with a new key
3. Updates `hash_binding` to "c2pa-claim"
4. Creates a C2PA manifest with the passport
5. Embeds the manifest into the file using `c2patool`

### Verification Priority

The `pp verify` command checks for provenance in this order:

1. **C2PA manifest** - Look for `com.provenancepassport.receipt` assertion
2. **Sidecar file** - Fall back to `.passport.json` or `.pp` files

```bash
# Verify embedded or sidecar passport
pp verify image.jpg

# JSON output shows the source
pp verify image.jpg --json
# "passport_source": "c2pa" or "sidecar"
```

## Platform Compatibility

### Metadata Preservation
Some platforms strip metadata from uploaded media:

- **Social media** - Facebook, Instagram, Twitter often remove EXIF and embedded data
- **Messaging apps** - WhatsApp, Telegram may compress and strip metadata  
- **Image optimization** - CDNs and optimization services may remove C2PA manifests

### Mitigation Strategies

1. **Visible watermarks** - Add a small visual indicator that the file has provenance
2. **Short fingerprints** - Display truncated signature hashes in image corners
3. **Multi-modal storage** - Maintain both embedded and external provenance records
4. **Platform APIs** - Use platform-specific APIs that preserve metadata when available

### Visible Short Fingerprint Option

For files that may lose embedded metadata, consider adding a visible short fingerprint:

```bash
# Future enhancement (not yet implemented)
pp embed image.jpg --passport image.jpg.passport.json --watermark --fingerprint-corner bottom-right
```

This would add a small text overlay showing:
- PP logo or identifier  
- Truncated signature hash (first 8 characters)
- QR code linking to verification URL

## Dependencies

C2PA embedding requires the `c2patool` binary:

### Installation Options

```bash
# npm (recommended)
npm install -g c2patool

# Homebrew (macOS)
brew install c2patool

# Direct download
# https://github.com/contentauth/c2patool/releases
```

### Fallback Behavior

If `c2patool` is not available:
- `pp embed` will fail with installation instructions
- `pp verify` will silently fall back to sidecar file verification

## Interoperability

Files with embedded Provenance Passports can be verified using:

### C2PA Tools
- **Adobe Content Credentials** - View provenance in Adobe apps
- **Truepic Lens** - Mobile verification app
- **Project Origin** - Browser extension and verification tools

### API Access
The passport data can be extracted using any C2PA library:

```javascript
// Example using @contentauth/c2pa-js
import { getManifest } from '@contentauth/c2pa-js';

const manifest = await getManifest(imageBuffer);
const passport = manifest.assertions['com.provenancepassport.receipt'];
```

## Security Considerations

### Trust Model
- C2PA provides cryptographic binding between manifest and media content
- Provenance Passport provides cryptographic signatures over provenance metadata
- Combined, they offer strong tamper evidence for both content and provenance

### Key Management
- Embedded passports use the same Ed25519 keys as sidecar files
- Key revocation is checked via the standard revocation list
- C2PA and PP cryptographic chains are independent but complementary

### Attack Vectors
- **Manifest stripping** - Attackers can remove C2PA manifests (detectable)
- **Re-compression** - Media optimization may remove manifests (not malicious)
- **Key compromise** - Standard cryptographic key management practices apply

## Future Enhancements

### Planned Features
- Visible watermarking with short fingerprints
- Batch embedding for multiple files
- Integration with CI/CD pipelines
- Support for additional C2PA assertion types

### Standards Evolution
- Monitor C2PA specification updates
- Align with emerging provenance standards
- Maintain compatibility with existing tools

## Examples

See `/examples/artifacts/` for sample files demonstrating:
- Original media files
- Sidecar passports  
- C2PA embedded files
- Tampered files for testing

Each example includes verification commands and expected outputs.