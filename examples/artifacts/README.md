# Example Artifacts with Provenance

This directory contains example files demonstrating Provenance Passport functionality with C2PA embedding.

## Files

### Original Files
- `sample.png` - A sample image file
- `sample.pdf` - A sample PDF document
- `sample.txt` - A simple text file

### Passports (Sidecar Files)
- `sample.png.passport.json` - Provenance passport for the PNG image
- `sample.pdf.passport.json` - Provenance passport for the PDF document
- `sample.txt.passport.json` - Provenance passport for the text file

### C2PA Embedded Files
- `sample-stamped.png` - PNG with embedded C2PA manifest containing the passport
- `sample-stamped.pdf` - PDF with embedded C2PA manifest containing the passport

### Tampered Files (for testing)
- `sample-tampered.png` - Modified PNG that should fail verification
- `sample-tampered.pdf` - Modified PDF that should fail verification

## Usage Examples

### Generate a new key
```bash
pp keygen --out signing-key.pem
```

### Verify sidecar passport
```bash
pp verify sample.png
```

### Verify C2PA embedded passport
```bash
pp verify sample-stamped.png
```

### Embed a passport into a file
```bash
pp embed sample.png --passport sample.png.passport.json
```

### Verify tampered files (should fail)
```bash
pp verify sample-tampered.png
```

## C2PA Support

Files with C2PA manifests can be verified using tools that support the C2PA standard:
- Adobe Content Credentials
- Truepic Lens
- Project Origin tools

The Provenance Passport data is stored in the C2PA manifest under the assertion namespace:
- `com.provenancepassport.receipt` - The complete passport JSON
- `com.provenancepassport.version` - The PP specification version
- `com.provenancepassport.hash_binding` - Set to "c2pa-claim" for embedded passports