# DOCX Support Examples

This directory contains examples demonstrating Provenance Passport support for Microsoft Word DOCX files.

## Files

- `sample.docx` - Original DOCX document
- `test-sample.docx` - DOCX with embedded passport via OOXML custom parts
- `test-sample.docx.passport.json` - Passport sidecar file

## DOCX Embedding Strategy

Provenance Passport uses a dual strategy for DOCX files:

1. **C2PA embedding** (preferred) - If `c2patool` supports DOCX files
2. **OOXML custom parts** (fallback) - Embeds passport in `customXml/passport.json`

## Commands

### Create a passport
```bash
pp wrap --in sample.docx --out sample.docx --run "echo 'Processing DOCX'" --step "DOCX example processing" --sign example-key.pem
```

### Embed passport into DOCX
```bash
pp embed sample.docx --passport sample.docx.passport.json
```

### Verify embedded passport
```bash
pp verify sample.docx
```

## Expected Behavior

### OOXML Custom Parts Embedding
- Creates `customXml/passport.json` inside the DOCX file
- Adds relationship in `word/_rels/document.xml.rels`
- Uses `hash_binding: "bytes"` (file content changes when embedded)
- Verification detects "DOCX custom XML parts" as source

### Hash Binding Considerations

Since OOXML custom parts modify the file content, the SHA-256 hash changes:
- Original hash is preserved in the passport for verification
- File verification will show hash mismatch (expected behavior)
- Signature verification validates the passport integrity
- Use `--json` output to see detailed verification results

## Testing

To test the complete workflow:

```bash
# 1. Create original passport
pp wrap --in sample.docx --out sample.docx --run "echo test" --step "test" --sign example-key.pem

# 2. Embed passport
pp embed sample.docx --passport sample.docx.passport.json

# 3. Verify (will show hash mismatch due to embedding)
pp verify sample.docx

# 4. Check verification source
pp verify sample.docx --json | grep passport_source
# Should show: "passport_source": "docx-custom"
```

## File Structure

After embedding, the DOCX contains:
```
test-sample.docx
├── [Content_Types].xml
├── _rels/
│   └── .rels
├── docProps/
│   ├── core.xml
│   └── app.xml
├── word/
│   ├── document.xml
│   └── _rels/
│       └── document.xml.rels (updated with relationship)
└── customXml/
    └── passport.json (embedded passport)
```

## Interoperability

DOCX files with embedded custom parts:
- Open normally in Microsoft Word
- Custom parts are preserved during editing (implementation dependent)
- Can be verified by any Provenance Passport CLI installation
- Compatible with Office 365 and other OOXML-compliant applications