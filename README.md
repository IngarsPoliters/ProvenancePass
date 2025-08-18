# Provenance Passport

Verifiable digital provenance for artifacts, enabling cryptographic proof of authenticity, integrity, and supply chain transparency across documents, binaries, and other digital assets.

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