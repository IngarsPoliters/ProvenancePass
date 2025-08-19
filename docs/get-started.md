# Get Started with Provenance Passport

*Get up and running with cryptographic provenance in 5 minutes.*

## 🚀 Quick Install

```bash
# One-time usage (recommended)
npx @provenancepass/cli@latest --help

# Or install globally
npm install -g @provenancepass/cli
```

## 📋 5-Minute Walkthrough

### Step 1: Generate a Signing Key

```bash
# Create your cryptographic identity
pp keygen --out-file my-signing-key.pem

# View your public key fingerprint
pp fingerprint --keyfile my-signing-key.pem
```

**Output:**
```
✅ Generated Ed25519 key pair
📁 Private key: my-signing-key.pem  
🔑 Public key: my-signing-key.pem.pub
🆔 Key fingerprint: a1b2c3d4e5f6...
```

### Step 2: Create Your First Passport

```bash
# Wrap an existing file with provenance
echo "Hello, provenance!" > sample.txt
pp wrap --file sample.txt --keyfile my-signing-key.pem --output sample.txt.passport.json
```

**Output:**
```
🔐 Creating provenance passport for: sample.txt
✅ Passport created: sample.txt.passport.json
📊 File hash: sha256:a1b2c3d4...
🆔 Key ID: key-a1b2c3d4e5f6...
📅 Created: 2024-08-19T15:30:00Z
```

### Step 3: Embed in C2PA (Optional)

For images, videos, and PDFs, you can embed the passport directly into the file:

```bash
# Create a sample image (or use your own)
convert -size 800x600 xc:lightblue sample.png

# Embed the passport into C2PA metadata
pp embed --file sample.png --passport sample.txt.passport.json --output sample-signed.png
```

**Output:**
```
🏷️ Embedding passport into C2PA metadata...
✅ Embedded provenance in: sample-signed.png
📏 Original: 12.3 KB → Embedded: 14.1 KB (+1.8 KB)
🔍 Verify with: pp verify sample-signed.png
```

### Step 4: Verify Provenance

```bash
# Verify the sidecar passport
pp verify sample.txt

# Verify the embedded C2PA file  
pp verify sample-signed.png

# Verify with revocation checking
pp verify sample-signed.png \
  --revocations https://data.provenancepass.com/revocations.json
```

**Output:**
```
🔍 Verifying: sample-signed.png
✅ Passport found: C2PA embedded
✅ Signature valid: Ed25519
✅ Key status: Active (not revoked)
🆔 Key ID: key-a1b2c3d4e5f6...
📅 Created: 2024-08-19T15:30:00Z
👤 Identity: my-signing-key.pem
📊 File integrity: ✅ Hash matches

🎉 Verification successful!
```

### Step 5: Bulk Operations

```bash
# Wrap multiple files
pp wrap --glob "assets/**/*.{png,jpg,pdf}" --keyfile my-signing-key.pem

# Verify entire directories
pp verify --glob "assets/**/*" --json > verification-report.json
```

## 🛠 Common Workflows

### Build Pipeline Integration

```bash
# 1. Generate build artifacts
npm run build

# 2. Wrap the entire build output
pp wrap --run "npm run build" --keyfile ./ci-signing-key.pem --output-dir ./signed-build

# 3. Verify everything before deployment
pp verify --glob "signed-build/**/*" --revocations https://your-org.com/revocations.json
```

### Document Signing

```bash
# Sign important documents
pp wrap --file contract.pdf --keyfile legal-key.pem
pp embed --file contract.pdf --passport contract.pdf.passport.json --output contract-signed.pdf

# Verify later
pp verify contract-signed.pdf
```

### Command Execution Tracking

```bash
# Track what commands produced your artifacts
pp wrap --run "python train.py --model gpt" --keyfile ml-key.pem --output-dir ./model-output

# Creates passport with:
# - Command executed
# - Exit code and timing  
# - Environment snapshot
# - Output file hashes
```

## 📖 Key Concepts

### **Passport Structure**
A provenance passport contains:
- **Digital signature** (Ed25519 cryptography)
- **File hash** (SHA-256 integrity)
- **Timestamp** (when created)
- **Key identifier** (who signed it)
- **Metadata** (command, environment, etc.)

### **Storage Methods**
1. **Sidecar files** - `document.pdf.passport.json` (universal)
2. **C2PA embedded** - Inside file metadata (images, videos, PDFs)
3. **DOCX custom parts** - Within Office document structure

### **Verification Process**
1. **Find passport** - C2PA → DOCX → Sidecar priority
2. **Verify signature** - Ed25519 cryptographic validation
3. **Check integrity** - SHA-256 hash comparison
4. **Revocation check** - Query revocation lists (optional)

## 🚨 Important Security Notes

### Key Management
```bash
# ❌ DON'T: Use the same key everywhere
pp keygen --out-file universal-key.pem  # Risky!

# ✅ DO: Use different keys for different purposes
pp keygen --out-file ci-build-key.pem    # For CI/CD
pp keygen --out-file document-key.pem    # For documents
pp keygen --out-file release-key.pem     # For releases
```

### Revocation Lists
```bash
# Always verify with revocation checking in production
pp verify document.pdf \
  --revocations https://data.provenancepass.com/revocations.json \
  --revocation-pubkey a1b2c3d4e5f6...  # Pubkey to verify revocation list
```

### Key Storage
- **Local development**: Store keys in `~/.config/provenancepass/`
- **CI/CD**: Use encrypted secrets (GitHub Secrets, etc.)
- **Production**: Use HSMs or key management services
- **Never**: Commit keys to version control

## 🔧 Configuration

### Global Config
```bash
# Set default signing key
pp config set signing-key ~/.config/provenancepass/default-key.pem

# Set default revocation URL
pp config set revocations-url https://your-org.com/revocations.json

# View all settings
pp config list
```

### Environment Variables
```bash
export PP_SIGNING_KEY="~/.config/provenancepass/key.pem"
export PP_REVOCATIONS_URL="https://data.provenancepass.com/revocations.json"
export PP_OUTPUT_FORMAT="json"  # json, yaml, table
```

## 📚 Next Steps

- **[CI/CD Integration](./ci.md)** - GitHub Actions, Jenkins, etc.
- **[Web Viewer Guide](./viewer.md)** - Drag-drop verification
- **[Embedding Spec](./spec/embedding.md)** - Technical details
- **[Trust Bundles](./spec/trust-bundles.md)** - Key distribution

## ❓ Troubleshooting

### "Command not found: pp"
```bash
# If installed globally but not in PATH
npm list -g @provenancepass/cli

# Use npx instead
npx @provenancepass/cli@latest keygen --out-file key.pem
```

### "Invalid signature" 
```bash
# Check if file was modified after signing
pp inspect document.pdf.passport.json

# Verify with verbose output
pp verify document.pdf --verbose
```

### "c2patool not found"
```bash
# Install c2patool for C2PA operations
# Linux:
wget https://github.com/contentauth/c2patool/releases/latest/download/c2patool-linux-intel
chmod +x c2patool-linux-intel && sudo mv c2patool-linux-intel /usr/local/bin/c2patool

# macOS:
brew install c2patool

# Windows: Download from GitHub releases
```

### Performance Issues
```bash
# For large directories, use specific globs
pp verify --glob "**/*.pdf" --glob "**/*.png"  # Instead of **/*

# Use JSON output for programmatic processing
pp verify --glob "assets/**/*" --json | jq '.summary'
```

## 💡 Tips & Best Practices

1. **Start small** - Wrap a few files manually before automation
2. **Test verification** - Always verify immediately after wrapping
3. **Use specific globs** - Avoid `**/*` for large directories
4. **Version your keys** - Include dates in key filenames
5. **Document your process** - Keep notes about what keys sign what
6. **Automate verification** - Add to your CI/CD pipelines
7. **Monitor revocations** - Regularly check revocation lists

---

*Ready to secure your digital supply chain? Try the [Web Viewer](https://viewer.provenancepass.com) or integrate with [GitHub Actions](./ci.md)!* 🔐