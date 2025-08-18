# C2PA Research and Implementation Guide

## Overview of C2PA

The Coalition for Content Provenance and Authenticity (C2PA) is a formal standards development organization under the Linux Foundation's Joint Development Foundation, founded through an alliance between Adobe, Arm, Intel, Microsoft, and Truepic. C2PA addresses the prevalence of misleading information online by developing technical standards for certifying the source and history (provenance) of media content.

C2PA manifests, also known as Content Credentials, function as "nutrition labels" for digital content. These manifests contain verifiable information about who produced content, when it was created, which tools were used, and what modifications have been made throughout its lifecycle. Each asset is cryptographically hashed and signed to create a tamper-evident record that exposes any changes to the asset or its metadata.

## Manifest Embedding in File Formats

### PNG Files
C2PA manifests are embedded in PNG files using an ancillary, private, not safe to copy chunk type of 'caBX'. The specification recommends that the 'caBX' chunk precede the 'IDAT' chunks to ensure proper handling by image processing tools.

### JPEG Files
For JPEG files, C2PA manifests are stored in APP11 marker segments. Since a single marker segment in JPEG-1 cannot exceed 64K bytes, multiple APP11 segments are often required. These segments must be constructed per the JPEG-1 standard, written in sequential order, and remain contiguous.

### PDF and OOXML/DOCX Files
PDF files can embed C2PA manifests through incremental updates, allowing multiple manifests to coexist. DOCX files, being ZIP-based OOXML packages, store C2PA data as additional parts within the package structure, maintaining compatibility with existing document processors.

## Sidecars and Remote Stores

When embedding isn't feasible or when metadata has been stripped, C2PA supports "soft bindings" through sidecar files and remote manifest stores. These mechanisms use content fingerprints (perceptual hashes) or imperceptible watermarks to link assets with their corresponding manifests stored externally.

## C2PA Toolchain

### c2patool
The primary command-line interface for working with C2PA manifests and media assets. Originally a separate project, c2patool has been integrated into the c2pa-rs repository as of December 2024. It can read existing manifests, add new ones, and validate content credentials across supported file formats.

### c2pa-rs
The core Rust implementation providing the foundational library for C2PA functionality. This repository now houses the c2patool project and serves as the primary SDK for Rust-based applications requiring C2PA support.

### c2pa-node (JavaScript/Node.js)
Node.js bindings that enable JavaScript applications to integrate C2PA functionality. The implementation requires the Rust toolchain for building native components and provides API access to C2PA features for web and server applications.

## Common Metadata Stripping Pitfalls

### Platform Limitations
Most social media platforms routinely strip metadata from uploaded images, including C2PA manifests. This occurs during content processing, resizing, or format conversion. Legacy platforms and non-C2PA capable tools may remove or corrupt manifest data during distribution.

### Tool Compatibility
Image processing tools like ImageMagick can inadvertently strip C2PA metadata during format conversions (e.g., WebP to JPEG). Simple actions such as taking screenshots or using web-based conversion tools will remove all associated C2PA data.

### Security Vulnerabilities
Malicious actors can deliberately strip C2PA manifests and substitute their own, creating false provenance claims. This represents a fundamental limitation of embedded metadata approaches and highlights the importance of soft binding mechanisms for critical use cases.

### Format-Specific Challenges
The size of manifest stores can be significantly larger than the original asset, particularly for smaller images. Different embedding mechanisms across formats create varying levels of resilience to metadata preservation during processing workflows.

## References

- [C2PA Coalition Official Site](https://c2pa.org/)
- [Content Authenticity Initiative - How it Works](https://contentauthenticity.org/how-it-works)
- [C2PA Technical Specification](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)
- [C2PA Implementation Guidance](https://spec.c2pa.org/specifications/specifications/2.2/guidance/Guidance.html)
- [c2patool GitHub Repository](https://github.com/contentauth/c2patool)
- [CAI Open Source SDK Documentation](https://opensource.contentauthenticity.org/docs/introduction/)
- [C2PA Soft Binding API Specification](https://spec.c2pa.org/specifications/specifications/2.2/softbinding/Decoupled.html)
- [AWS MediaConvert C2PA Manifest Guide](https://docs.aws.amazon.com/mediaconvert/latest/ug/c2pa-manifest.html)
- [C2PA in ChatGPT Images - OpenAI Documentation](https://help.openai.com/en/articles/8912793-c2pa-in-chatgpt-images)