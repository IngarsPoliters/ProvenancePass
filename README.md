# Provenance Passport

Verifiable digital provenance for artifacts, enabling cryptographic proof of authenticity, integrity, and supply chain transparency across documents, binaries, and other digital assets.

## 🚀 Quick Start

**[🌐 Open Web Viewer](https://viewer.provenancepass.com/)** • **[📖 GitHub Repository](https://github.com/IngarsPoliters/ProvenancePass)** • **[📚 Documentation](https://provenancepass.com/docs/)**

### CLI Quickstart

```bash
# Install the CLI
npm install -g @provenancepass/cli

# Verify a file with revocation checking
pp verify document.pdf \
  --revocations https://data.provenancepass.com/revocations.json
```

## Architecture

- **`@passport/cli`** - TypeScript CLI & Node SDK for creating and verifying provenance records
- **`@passport/viewer`** - Web-based drag-drop verifier for interactive validation
- **`verify-passport`** - GitHub Action for automated CI/CD verification
- **`provenance-passport`** - Python wrapper for broader ecosystem integration
- **`@passport/manifest-store`** - Optional API service for receipt storage by SHA-256

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development mode
pnpm dev
```

## License

Apache-2.0