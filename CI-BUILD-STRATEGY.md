# CI/CD Build Strategy for ProvenancePass

## Overview

This document describes the GitHub Actions CI/CD pipeline designed for the ProvenancePass monorepo, optimized for Coolify deployment and efficient artifact generation.

## Architecture

### Package Structure
- **viewer**: React + Vite application with bundle size validation
- **site**: Static marketing site with nginx
- **data**: Static JSON API with nginx

### Build Matrix Strategy

The CI pipeline uses a matrix strategy to build only packages that have changes:

```yaml
matrix:
  include:
    - app: viewer
      build_script: "pnpm -w build:viewer"
      artifact_path: "packages/viewer/dist"
      bundle_check: true
    - app: site  
      build_script: "pnpm -w build:site"
      artifact_path: "packages/site/public"
    - app: data
      build_script: "pnpm -w build:data"
      artifact_path: "packages/data/public"
```

## Build Process

### 1. Change Detection
- Uses `dorny/paths-filter` to detect which packages have changes
- Only builds packages that have been modified
- Supports both push and pull request triggers

### 2. Package-Specific Builds

#### Viewer Package
- Runs `pnpm -F @passport/viewer build`
- Includes bundle size validation (120KB gzip limit)
- Runs unit tests before building
- Generates optimized production bundle

#### Site Package
- Copies static files from `static/` to `public/`
- No transpilation or bundling required
- Ready for nginx serving

#### Data Package
- Static JSON files, no build process
- Files are already in `public/` directory
- Includes nginx configuration for CORS and caching

### 3. Quality Gates

#### Bundle Size Validation
- Viewer package enforces 120KB gzipped bundle limit
- Validation script analyzes initial load size
- Fails build if limit exceeded

#### E2E Testing
- Runs Playwright tests for viewer package
- Only executes if viewer package changed
- Uses built artifacts for testing

## Artifact Strategy

### Coolify-Ready Artifacts

Each package generates deployment-ready artifacts:

```
coolify-artifacts/
├── viewer/
│   ├── index.html
│   ├── assets/
│   ├── build-info.json
│   └── (no Dockerfile - static files)
├── site/
│   ├── index.html
│   ├── static/
│   ├── nginx.conf
│   ├── Dockerfile
│   └── build-info.json
└── data/
    ├── manifest/
    ├── samples/
    ├── revocations.json
    ├── nginx.conf
    ├── Dockerfile
    ├── health.json
    └── build-info.json
```

### Build Metadata

Each artifact includes build information:

```json
{
  "app": "viewer",
  "version": "0.1.0",
  "commit": "sha256...",
  "branch": "main",
  "build_time": "2025-01-19T10:30:00Z",
  "workflow_run": "123456789"
}
```

### Artifact Naming

- Pattern: `{app}-build-{commit-sha}`
- Retention: 30 days for build artifacts, 7 days for build info
- Compression: Level 6 for optimal size/speed balance

## Integration with Coolify

### Deployment Compatibility

1. **Static Assets**: All artifacts are ready for direct nginx serving
2. **Health Checks**: Each package includes `/healthz` endpoint
3. **CORS Headers**: Properly configured for cross-origin access
4. **Caching**: Optimized cache headers for different content types

### Container Strategy

- **Viewer**: Can be served directly by Coolify static hosting
- **Site**: Uses custom nginx container with optimized config
- **Data**: Uses nginx with specific CORS and caching rules

## Performance Optimizations

### Build Efficiency
- Only builds changed packages
- Parallel execution where possible
- Cached dependencies via pnpm
- Frozen lockfile for reproducible builds

### Bundle Optimization
- Viewer enforces strict size limits
- Tree-shaking and code splitting
- Compression at artifact level
- Immutable caching for static assets

## Monitoring and Validation

### Build Health
- Bundle size tracking
- Build time monitoring
- Artifact size validation
- E2E test results

### Cache Strategy
```nginx
# Manifest files (immutable)
Cache-Control: public, max-age=31536000, immutable

# Revocation data (short cache)
Cache-Control: public, max-age=300, must-revalidate

# Sample files (daily cache)
Cache-Control: public, max-age=86400
```

## Usage

### Triggering Builds

```bash
# Manual build for specific package
pnpm -w build:viewer
pnpm -w build:site
pnpm -w build:data

# Full build
pnpm build
```

### Local Development

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run development servers
pnpm dev

# Run tests
pnpm test
pnpm test:e2e
```

### Deployment

1. Push changes to main/develop
2. CI builds changed packages
3. Artifacts uploaded to GitHub
4. Coolify pulls artifacts for deployment
5. Health checks verify deployment

## Security Considerations

- No secrets in build artifacts
- CORS properly configured
- Content Security Policy headers
- Immutable artifact references
- Signed container images (future)

## Future Enhancements

1. **Container Signing**: Sign container images for supply chain security
2. **Artifact Attestation**: Generate SLSA attestations
3. **Performance Budgets**: Track and enforce performance metrics
4. **Dependency Scanning**: Automated vulnerability scanning
5. **Multi-Environment**: Support staging/production variants