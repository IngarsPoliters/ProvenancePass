# Web Viewer Guide

*Verify provenance passports with drag-and-drop using the web viewer at [viewer.provenancepass.com](https://viewer.provenancepass.com).*

## 🌐 Using the Web Viewer

### Quick Verification

1. **Visit** [viewer.provenancepass.com](https://viewer.provenancepass.com)
2. **Drag & drop** any file onto the viewer
3. **View results** instantly with detailed verification info

The viewer works entirely in your browser - no files are uploaded to servers!

### Supported File Types

| Format | Detection Method | Notes |
|--------|------------------|-------|
| **Images** | C2PA → Sidecar | JPEG, PNG, WebP, AVIF, TIFF |
| **Video** | C2PA → Sidecar | MP4, MOV, WebM, AVI |
| **Audio** | C2PA → Sidecar | MP3, WAV, FLAC, M4A |
| **Documents** | C2PA → Sidecar | PDF |
| **Office Docs** | DOCX Parts → Sidecar | DOCX, PPTX, XLSX |
| **Archives** | Sidecar only | ZIP, TAR, 7Z |
| **Code/Text** | Sidecar only | Any file with `.passport.json` |

## 🔍 Verification Priority Order

The viewer checks for provenance in this exact order:

### 1. C2PA Embedded (Highest Priority)
```
🏷️ C2PA Metadata Found
✅ Passport embedded in file metadata
🔧 Uses c2patool via WebAssembly
```

**Advantages:**
- ✅ Cannot be separated from file
- ✅ Travels with file when shared
- ✅ Supported by major platforms (Adobe, etc.)

**Limitations:**  
- ❌ Not all file formats support C2PA
- ❌ Some tools strip metadata

### 2. DOCX Custom Parts (Office Documents)
```
📄 Office Document Detected
🔍 Checking custom XML parts...
✅ Passport found in document structure
```

**How it works:**
- Passport stored as custom XML part in OOXML container
- Survives most editing operations
- Compatible with Office 365, LibreOffice, etc.

### 3. Sidecar Files (Universal Fallback)
```
📋 Sidecar Detection
🔍 Looking for: document.pdf.passport.json
✅ Passport file found alongside original
```

**Requirements:**
- Both files must be present
- Exact naming: `original-file.ext.passport.json`
- Works with any file type

## 🛡️ Revocation Checking

### Default Behavior
The viewer automatically checks for revoked keys using:
```
https://data.provenancepass.com/revocations.json
```

### Custom Revocation Lists

#### For Organizations
Host your own revocation list to control which keys are trusted:

```json
{
  "version": "1.0",
  "last_updated": "2024-08-19T15:30:00Z",
  "authority": "Your Organization",
  "feed_url": "https://your-org.com/revocations.json",
  "revoked_keys": [
    {
      "key_id": "compromised-key-abc123",
      "revoked_at": "2024-08-15T10:00:00Z",
      "reason": "Key compromise - employee departure",
      "details": "Former employee's signing key"
    },
    {
      "key_id": "expired-key-def456", 
      "revoked_at": "2024-08-10T00:00:00Z",
      "reason": "Key rotation",
      "details": "Scheduled quarterly rotation"
    }
  ],
  "signature": "base64-encoded-signature-of-above-data",
  "signed_with": "revocation-authority-public-key"
}
```

#### Hosting Your Revocation List

**1. Static Hosting (Simple)**
```bash
# Upload to your web server
scp revocations.json user@yourserver.com:/var/www/html/

# Or use cloud storage
aws s3 cp revocations.json s3://your-bucket/revocations.json --acl public-read
```

**2. API Endpoint (Dynamic)**
```javascript
// Express.js example
app.get('/revocations.json', (req, res) => {
  // Query your database for revoked keys
  const revokedKeys = await getRevokedKeysFromDB();
  
  const revocationList = {
    version: "1.0",
    last_updated: new Date().toISOString(),
    authority: "Your Organization",
    feed_url: "https://your-api.com/revocations.json",
    revoked_keys: revokedKeys
  };
  
  // Sign the revocation list
  const signature = await signRevocationList(revocationList);
  revocationList.signature = signature;
  
  res.json(revocationList);
});
```

**3. ProvenancePass Data Service (Recommended)**
```bash
# Use the included data service Docker container
docker run -p 8080:80 \
  -v /path/to/your/revocations.json:/usr/share/nginx/html/revocations.json \
  provenancepass/data-service
```

#### CORS Configuration
Your revocation endpoint must include CORS headers:

```nginx
# Nginx example
location = /revocations.json {
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "*" always;
    add_header Cache-Control "public, max-age=300, must-revalidate";
    
    if ($request_method = OPTIONS) {
        return 204;
    }
    
    try_files $uri =404;
}
```

### Signed Revocation Lists

For enhanced security, sign your revocation lists:

```bash
# Generate revocation authority key
pp keygen --out-file revocation-authority-key.pem

# Sign revocation list
node scripts/sign-revocations.mjs \
  --input revocations.json \
  --key revocation-authority-key.pem \
  --output revocations.signed.json
```

Distribute the public key to verify revocation list signatures:
```bash
pp fingerprint --keyfile revocation-authority-key.pem.pub
# Output: abc123def456...
```

Users can then verify with:
```bash
pp verify document.pdf \
  --revocations https://your-org.com/revocations.signed.json \
  --revocation-pubkey abc123def456...
```

## 🎨 Viewer Interface Details

### Verification Results Display

#### ✅ Successful Verification
```
🔐 Provenance Passport - VERIFIED

📊 File Information:
• Name: document.pdf
• Size: 1.2 MB  
• SHA-256: a1b2c3d4e5f6...

🏷️ Passport Details:
• Source: C2PA embedded
• Signature: Valid (Ed25519)
• Key ID: key-abc123...
• Created: 2024-08-19 15:30:00 UTC
• Key Status: ✅ Active

🛡️ Security Checks:
✅ Digital signature valid
✅ File integrity confirmed  
✅ Key not revoked
✅ Timestamp reasonable
```

#### ❌ Verification Failed
```
❌ Provenance Verification FAILED

📊 File Information:
• Name: suspicious.pdf
• Size: 1.8 MB

⚠️ Issues Found:
❌ Invalid signature
❌ File hash mismatch
❌ Key revoked on 2024-08-15

🛡️ Security Recommendation:
This file may have been tampered with or signed
with a compromised key. Do not trust this file.
```

#### ⚠️ Warning States
```
⚠️ Provenance Passport - WARNING

📊 File Information:
• Name: legacy.pdf
• Size: 0.8 MB

⚠️ Warnings:
⚠️ No passport found
⚠️ Cannot verify provenance

💡 Recommendations:
• Ask sender to create provenance passport
• Use 'pp wrap' command to add provenance
• Consider file authenticity carefully
```

### Batch Verification

Drop multiple files to verify them all:

```
📁 Batch Verification Results (3 files)

✅ document.pdf - Verified (C2PA)
✅ image.png - Verified (Sidecar) 
❌ suspicious.zip - Failed (Invalid signature)

Summary: 2/3 files verified successfully
```

## 🔧 Advanced Features

### URL Parameters

Configure the viewer via URL parameters:

```bash
# Custom revocation URL
https://viewer.provenancepass.com?revocations=https://your-org.com/revocations.json

# Skip revocation checks
https://viewer.provenancepass.com?skip-revocations=true

# Debug mode (shows technical details)
https://viewer.provenancepass.com?debug=true

# Combine parameters
https://viewer.provenancepass.com?revocations=https://your-org.com/revocations.json&debug=true
```

### Browser Compatibility

| Browser | C2PA Support | Sidecar Support | Notes |
|---------|--------------|-----------------|-------|
| Chrome 90+ | ✅ Full | ✅ Full | Recommended |
| Firefox 88+ | ✅ Full | ✅ Full | Full support |
| Safari 14+ | ✅ Full | ✅ Full | iOS/macOS |
| Edge 90+ | ✅ Full | ✅ Full | Chromium-based |
| IE 11 | ❌ None | ❌ None | Not supported |

### Offline Usage

The viewer works offline after first load:
- Service worker caches application
- Can verify previously cached revocation lists
- C2PA and sidecar verification work fully offline
- Revocation checks require internet connection

## 🏗️ Self-Hosting the Viewer

### Docker Deployment
```bash
# Use the official viewer container
docker run -p 8080:80 provenancepass/viewer

# With custom configuration
docker run -p 8080:80 \
  -e VITE_DEFAULT_REVOCATIONS_URL=https://your-org.com/revocations.json \
  provenancepass/viewer
```

### Build from Source
```bash
git clone https://github.com/IngarsPoliters/ProvenancePass.git
cd ProvenancePass/packages/viewer

# Configure environment
echo "VITE_DEFAULT_REVOCATIONS_URL=https://your-org.com/revocations.json" > .env.local

# Build and serve
npm install
npm run build
npm run preview
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name viewer.your-org.com;
    
    root /var/www/viewer/dist;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Considerations

### Privacy Protection
- **No file uploads** - All verification happens in browser
- **Local processing** - Files never leave your device
- **Network requests** - Only for revocation list fetching
- **No tracking** - No analytics or user tracking

### Trust Model
```
🔑 Trust Chain:
1. You trust the signing key holder
2. You trust the revocation authority  
3. You trust the revocation list endpoint
4. You trust the viewer application

🛡️ Verification:
• Digital signatures (Ed25519)
• File integrity (SHA-256)
• Key revocation status
• Timestamp validation
```

### Threat Protection

| Threat | Protection | Details |
|--------|------------|---------|
| **File tampering** | SHA-256 hash | Detects any file modification |
| **Signature forgery** | Ed25519 crypto | Cryptographically secure signatures |
| **Key compromise** | Revocation lists | Invalidate compromised keys |
| **Replay attacks** | Timestamps | Detect stale signatures |
| **MitM attacks** | HTTPS required | Secure transport layer |

## 🚨 Troubleshooting

### Common Issues

#### "No passport found"
```
⚠️ No provenance passport found for this file.

Solutions:
1. Check for sidecar file: filename.ext.passport.json
2. Verify C2PA metadata exists: pp inspect filename.ext
3. Create passport: pp wrap --file filename.ext
```

#### "C2PA parsing failed"  
```
❌ Failed to parse C2PA metadata.

Possible causes:
• File metadata corrupted
• Unsupported C2PA version
• Browser compatibility issue

Try:
• Use different browser (Chrome/Firefox recommended)
• Check file with: c2patool filename.ext --detailed
• Verify with CLI: pp verify filename.ext
```

#### "Revocation check failed"
```
⚠️ Could not verify key revocation status.

Network issues:
• Check internet connection
• Try custom revocation URL
• Skip revocations temporarily: ?skip-revocations=true

CORS issues:
• Revocation endpoint needs CORS headers
• Use HTTPS for revocation URLs
• Contact your IT administrator
```

#### "Invalid signature"
```
❌ Digital signature verification failed.

Possible causes:
• File modified after signing
• Wrong public key used
• Corrupted passport file
• Clock skew issues

Debug steps:
1. pp verify filename.ext --verbose
2. Check file hash matches passport
3. Verify key fingerprint
4. Check system clock accuracy
```

### Performance Issues

#### Large Files
- Files over 100MB may be slow to process
- Consider using CLI for bulk operations
- Browser memory limits may apply

#### Many Files
- Batch verification processes sequentially
- Use CLI for parallel processing of many files
- Consider server-side verification for bulk operations

### Browser Developer Tools

Enable debug mode for technical details:
```
https://viewer.provenancepass.com?debug=true
```

This shows:
- Detailed verification steps
- Network requests and responses
- Cryptographic operation details
- Performance timing information

## 📱 Mobile Usage

The viewer works on mobile devices:

### Mobile Browsers
- **iOS Safari**: Full support for all features
- **Android Chrome**: Full support for all features  
- **Mobile Firefox**: Full support for all features

### Mobile Limitations
- File picker limitations on some devices
- Large file processing may be slower
- Limited storage for offline caching

### Tips for Mobile
- Use WiFi for large files
- Enable desktop site if needed
- Share files via cloud storage links

---

*Need help getting started? Check the [quickstart guide](./get-started.md) or learn about [CI/CD integration](./ci.md)!* 🔐