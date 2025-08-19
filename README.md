# Provenance Passport

Verifiable digital provenance for artifacts, enabling cryptographic proof of authenticity, integrity, and supply chain transparency across documents, binaries, and other digital assets.

## 🚀 Quick Start

**[🌐 Open Web Viewer](https://viewer.provenancepass.com/)** • **[📖 GitHub Repository](https://github.com/IngarsPoliters/ProvenancePass)** • **[📚 Documentation](https://provenancepass.com/docs/)**

### CLI Quickstart

```bash
# One-time usage (recommended)
npx @provenancepass/cli@latest verify document.pdf \
  --revocations https://data.provenancepass.com/revocations.json

# Or install globally
npm install -g @provenancepass/cli
pp verify document.pdf \
  --revocations https://data.provenancepass.com/revocations.json
```

## Architecture

- **`@provenancepass/cli`** - TypeScript CLI & Node SDK for creating and verifying provenance records
- **`@provenancepass/viewer`** - Web-based drag-drop verifier for interactive validation
- **`verify-passport`** - GitHub Action for automated CI/CD verification
- **`provenance-passport`** - Python wrapper for broader ecosystem integration
- **`@provenancepass/manifest-store`** - Optional API service for receipt storage by SHA-256

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