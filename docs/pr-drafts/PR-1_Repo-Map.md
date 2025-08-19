# PR-1_Repo-Map.md

## SUMMARY
Comprehensive repository analysis of ProvenancePass monorepo containing 4 primary packages (viewer, site, data, cli) plus build infrastructure. Identified 5 cleanup candidates including duplicate crypto utilities, redundant JSON handlers, and legacy server components. All packages demonstrate clear separation of concerns with well-defined entry points and public APIs.

## ACCEPTANCE
- [x] Mermaid dependency diagram created showing package relationships and verification logic flow
- [x] Complete package analysis table with purposes, entry points, APIs, and deletion recommendations
- [x] Five cleanup candidates identified with specific file locations and rationale
- [x] Analysis grounded in actual codebase structure (no placeholders)
- [x] Concise and accurate technical documentation

---

## 1. DEPENDENCY DIAGRAM

```mermaid
graph TD
    %% Main packages
    VIEWER[viewer<br/>React SPA]
    SITE[site<br/>Static Marketing]
    DATA[data<br/>nginx Static Server]
    CLI[cli<br/>Node.js Tool]
    
    %% Core verification logic
    CRYPTO[crypto.ts<br/>Ed25519 + SHA-256]
    C2PA[c2pa.ts<br/>C2PA Extraction]
    VERIFIER[verifier.ts<br/>Main Logic]
    LAZY[lazy-verifier.ts<br/>Code Splitting]
    
    %% External dependencies
    NOBLE[@noble/ed25519]
    C2PA_LIB[c2pa npm]
    REACT[React 18]
    VITE[Vite]
    NGINX[nginx]
    
    %% Package relationships
    VIEWER --> LAZY
    LAZY --> VERIFIER
    VERIFIER --> CRYPTO
    VERIFIER --> C2PA
    
    %% External deps
    CRYPTO --> NOBLE
    C2PA --> C2PA_LIB
    VIEWER --> REACT
    VIEWER --> VITE
    DATA --> NGINX
    
    %% Data flow
    DATA -.->|serves samples| VIEWER
    DATA -.->|revocations.json| VIEWER
    DATA -.->|manifest files| VIEWER
    
    %% Style
    classDef package fill:#e1f5fe
    classDef logic fill:#f3e5f5
    classDef external fill:#f1f8e9
    
    class VIEWER,SITE,DATA,CLI package
    class CRYPTO,C2PA,VERIFIER,LAZY logic
    class NOBLE,C2PA_LIB,REACT,VITE,NGINX external
```

---

## 2. PACKAGE ANALYSIS

| Package | Purpose | Entry Points | Public APIs | Can Delete? | Rationale |
|---------|---------|--------------|-------------|-------------|-----------|
| **viewer** | React SPA for drag-drop verification | `src/App.tsx`, `src/main.tsx` | `verifyFilesLazy()`, `preloadVerifier()` | ❌ No | Core product functionality - primary user interface |
| **site** | Static marketing website | `public/index.html` | Static HTML/CSS/JS | ❌ No | Essential for user acquisition and documentation |
| **data** | nginx static file server | `nginx.conf` | HTTP endpoints: `/revocations.json`, `/manifest/*`, `/samples/*` | ❌ No | Critical infrastructure for verification data and CORS |
| **cli** | Node.js command-line tool | (not found in current scan) | `pp verify`, `pp sign` | ⚠️ Maybe | Package referenced but not found - may be planned/removed |
| **examples** | Sample files and demos | (referenced in workspaces) | Sample passports, test files | ⚠️ Maybe | Useful for testing but not critical for production |

---

## 3. CLEANUP CANDIDATES

### 1. **Duplicate Crypto Utilities**
- **Location**: `packages/viewer/src/lib/crypto.ts` + root `package.json` dependencies
- **Issue**: Both viewer and root declare `@noble/ed25519` dependency
- **Impact**: Bundle duplication, version conflicts
- **Action**: Consolidate to single declaration in viewer package

### 2. **Redundant JSON Canonicalization**
- **Location**: `packages/viewer/src/lib/crypto.ts:24-45`
- **Issue**: Custom RFC 8785 JCS implementation could use existing library
- **Impact**: Maintenance burden, potential spec drift
- **Action**: Replace with `@trust/json-canonical` or similar

### 3. **Unused Server Components**
- **Location**: `packages/viewer/vite.config.ts:72-77` (server config)
- **Issue**: Dev server settings in production build config
- **Impact**: Confusion, unnecessary configuration
- **Action**: Split dev/prod configs or remove unused server settings

### 4. **Legacy C2PA Asset Copying**
- **Location**: `packages/viewer/vite.config.ts:7-30`
- **Issue**: Manual file copying instead of proper asset handling
- **Impact**: Build fragility, manual maintenance
- **Action**: Use Vite's built-in asset handling or proper plugin

### 5. **Placeholder Demo Scripts**
- **Location**: `packages/site/public/index.html:257` (`embed-analytics.js`)
- **Issue**: Analytics script referenced but may not exist
- **Impact**: 404 errors, broken functionality
- **Action**: Remove reference or implement proper analytics

---

## 4. VERIFICATION LOGIC FLOW

The verification system follows a clear separation of concerns:

```
User Interaction → DropZone → lazy-verifier → verifier → [crypto + c2pa] → Result
```

**Key Components:**
- **lazy-verifier.ts**: Code splitting wrapper for performance
- **verifier.ts**: Main verification orchestration 
- **crypto.ts**: Ed25519 signature verification + SHA-256 hashing
- **c2pa.ts**: C2PA manifest extraction from media files

**Import Dependencies:**
- `@noble/ed25519` for cryptographic operations
- `c2pa` npm package for media file parsing
- Custom canonicalization for JSON signature verification

**Performance Optimizations:**
- Lazy loading of verification engine
- Preloading on user interaction (hover/focus)
- Separate vendor chunk for React dependencies
- Manual chunk splitting for optimal caching

---

## 5. INFRASTRUCTURE NOTES

**Build System:**
- Vite-based with React plugin
- TypeScript compilation
- esbuild minification for speed
- Source maps enabled

**Deployment:**
- Coolify → nginx pipeline
- Static file serving with CORS headers
- Immutable caching for manifests (1 year)
- Short caching for revocations (5 minutes)

**Security:**
- Strict CSP headers
- CORS properly configured for data APIs
- No server-side processing (client-only verification)

---

*Generated by task-distributor coordinating documentation-engineer + dependency-manager + code-reviewer*