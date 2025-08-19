#!/bin/bash

# generate.sh - Generate reproducible test vectors for Provenance Passport
# Creates examples with sidecar files, C2PA embedding, and DOCX pointers

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLES_DIR="$(dirname "$SCRIPT_DIR")"
ARTIFACTS_DIR="$EXAMPLES_DIR/artifacts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"
}

success() {
    echo -e "${GREEN}✓${NC} $*"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

error() {
    echo -e "${RED}✗${NC} $*"
}

# Check prerequisites
check_prereqs() {
    log "Checking prerequisites..."
    
    if ! command -v pp >/dev/null 2>&1; then
        error "ProvenancePass CLI (pp) not found in PATH"
        echo "Install with: npm install -g @provenancepass/cli"
        exit 1
    fi
    
    if ! command -v c2patool >/dev/null 2>&1; then
        warning "c2patool not found - C2PA embedding will be skipped"
        echo "Install from: https://github.com/contentauth/c2patool/releases"
    fi
    
    success "Prerequisites checked"
}

# Generate test signing key
generate_key() {
    local key_path="$1"
    local key_id="$2"
    
    if [[ -f "$key_path" ]]; then
        log "Using existing key: $key_path"
        return
    fi
    
    log "Generating test signing key: $key_id"
    pp keygen --out "$key_path"
    success "Generated key: $key_path"
}

# Create sample files for testing
create_sample_files() {
    local dir="$1"
    
    log "Creating sample files in $dir"
    
    # Text file
    echo "This is a test document for provenance verification." > "$dir/document.txt"
    
    # PDF (placeholder - would need actual PDF generation)
    echo "PDF placeholder content" > "$dir/document.pdf"
    
    # Create a simple image file (1x1 PNG)
    printf '\x89PNG\x0d\x0a\x1a\x0a\x00\x00\x00\x0dIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > "$dir/image.png"
    
    # Simple DOCX (minimal valid OOXML structure)
    mkdir -p "$dir/temp_docx"
    cat > "$dir/temp_docx/[Content_Types].xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
EOF
    
    mkdir -p "$dir/temp_docx/_rels"
    cat > "$dir/temp_docx/_rels/.rels" << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
EOF
    
    mkdir -p "$dir/temp_docx/word"
    cat > "$dir/temp_docx/word/document.xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:r>
                <w:t>Sample document for provenance testing</w:t>
            </w:r>
        </w:p>
    </w:body>
</w:document>
EOF
    
    # Create DOCX file
    (cd "$dir/temp_docx" && zip -r ../document.docx . >/dev/null 2>&1)
    rm -rf "$dir/temp_docx"
    
    success "Created sample files"
}

# Generate sidecar passports
generate_sidecar() {
    local dir="$1"
    local key_path="$2"
    
    log "Generating sidecar passports in $dir"
    
    # Create the correct directory structure: examples/out/pass/sidecar/
    mkdir -p "$dir/pass/sidecar"
    cp "$dir"/*.{txt,pdf,png,docx} "$dir/pass/sidecar/" 2>/dev/null || true
    
    for file in "$dir/pass/sidecar"/*; do
        if [[ -f "$file" ]]; then
            log "Creating passport for $(basename "$file")"
            # Use a no-op command to create sidecar without actual processing
            pp wrap --in "$file" --out "$file" --sign "$key_path" --step "Test vector generation" --run "true"
            
            if [[ -f "$file.passport.json" ]]; then
                success "Created: $file.passport.json"
                
                # Verify the file immediately after creation
                log "Verifying $(basename "$file")..."
                if pp verify "$file" --fail-on-missing --revocations https://data.provenancepass.com/revocations.json; then
                    success "Verification PASSED: $(basename "$file")"
                else
                    error "Verification FAILED: $(basename "$file")"
                    return 1
                fi
            else
                error "Failed to create passport for $(basename "$file")"
                return 1
            fi
        fi
    done
}

# Generate C2PA embedded files
generate_c2pa() {
    local dir="$1"
    local key_path="$2"
    
    if ! command -v c2patool >/dev/null 2>&1; then
        warning "Skipping C2PA generation - c2patool not available"
        return
    fi
    
    log "Generating C2PA embedded files in $dir"
    
    mkdir -p "$dir/pass/c2pa"
    
    # Copy supported formats for C2PA
    cp "$dir/image.png" "$dir/pass/c2pa/" 2>/dev/null || true
    cp "$dir/document.pdf" "$dir/pass/c2pa/" 2>/dev/null || true
    
    for file in "$dir/pass/c2pa"/*; do
        if [[ -f "$file" ]]; then
            log "Embedding C2PA passport in $(basename "$file")"
            
            # First create a sidecar passport
            pp wrap --in "$file" --out "$file" --sign "$key_path" --step "C2PA preparation" --run "true"
            
            # Then embed it
            if pp embed "$file" --passport "$file.passport.json"; then
                success "Embedded C2PA: $file"
                # Remove the sidecar since we have it embedded
                rm "$file.passport.json"
            else
                warning "Failed to embed C2PA in $file"
            fi
        fi
    done
}

# Generate DOCX with pointers
generate_docx_pointer() {
    local dir="$1"
    local key_path="$2"
    
    log "Generating DOCX pointer files in $dir"
    
    mkdir -p "$dir/pass/docx"
    cp "$dir/document.docx" "$dir/pass/docx/"
    
    local docx_file="$dir/pass/docx/document.docx"
    
    # Create passport and embed as pointer
    pp wrap --in "$docx_file" --out "$docx_file" --sign "$key_path" --step "DOCX pointer generation" --run "true"
    
    if pp embed "$docx_file" --passport "$docx_file.passport.json"; then
        success "Created DOCX with pointer: $docx_file"
        
        # Create sidecar file for pointer resolution
        local basename=$(basename "$docx_file" .docx)
        local sidecar_path="$dir/pass/docx/$basename.passport.json"
        cp "$docx_file.passport.json" "$sidecar_path"
        success "Created sidecar for pointer: $sidecar_path"
    else
        warning "Failed to create DOCX pointer"
    fi
}

# Generate tampered files for FAIL test cases
generate_tampered() {
    local dir="$1"
    
    log "Generating tampered files for FAIL test cases"
    
    mkdir -p "$dir/tampered"
    
    # Copy files with valid passports
    cp "$dir/pass/sidecar/document.txt" "$dir/tampered/"
    cp "$dir/pass/sidecar/document.txt.passport.json" "$dir/tampered/"
    
    # Tamper with the file content
    echo "This is a TAMPERED test document for provenance verification." > "$dir/tampered/document.txt"
    
    success "Created tampered file: $dir/tampered/document.txt"
}

# Generate orphaned files (no passports)
generate_orphaned() {
    local dir="$1"
    
    log "Generating orphaned files for WARNING test cases"
    
    mkdir -p "$dir/orphaned"
    
    echo "This file has no provenance passport." > "$dir/orphaned/orphan.txt"
    cp "$dir/image.png" "$dir/orphaned/orphan.png"
    
    success "Created orphaned files"
}

# Generate test vectors with expected outputs
generate_test_outputs() {
    local dir="$1"
    
    log "Generating expected test outputs"
    
    local output_dir="$dir/expected"
    mkdir -p "$output_dir"
    
    # Test valid sidecar
    if pp verify "$dir/pass/sidecar/document.txt" --json > "$output_dir/sidecar-pass.json" 2>/dev/null; then
        success "Generated: sidecar-pass.json"
    fi
    
    # Test tampered file
    if pp verify "$dir/tampered/document.txt" --json > "$output_dir/tampered-fail.json" 2>/dev/null || true; then
        success "Generated: tampered-fail.json"
    fi
    
    # Test orphaned file
    if pp verify "$dir/orphaned/orphan.txt" --json > "$output_dir/orphaned-warning.json" 2>/dev/null || true; then
        success "Generated: orphaned-warning.json"
    fi
    
    # Test C2PA if available
    if [[ -f "$dir/pass/c2pa/image.png" ]]; then
        if pp verify "$dir/pass/c2pa/image.png" --json > "$output_dir/c2pa-pass.json" 2>/dev/null; then
            success "Generated: c2pa-pass.json"
        fi
    fi
    
    # Test DOCX pointer
    if [[ -f "$dir/pass/docx/document.docx" ]]; then
        if pp verify "$dir/pass/docx/document.docx" --json > "$output_dir/docx-pass.json" 2>/dev/null; then
            success "Generated: docx-pass.json"
        fi
    fi
}

# Main execution
main() {
    log "Starting test vector generation"
    
    # Clean and create artifacts directory
    rm -rf "$ARTIFACTS_DIR"
    mkdir -p "$ARTIFACTS_DIR"
    
    check_prereqs
    
    # Generate test signing key
    local key_path="$ARTIFACTS_DIR/test-signing-key.pem"
    generate_key "$key_path" "test-key-001"
    
    # Create sample files
    create_sample_files "$ARTIFACTS_DIR"
    
    # Generate different embedding types
    generate_sidecar "$ARTIFACTS_DIR" "$key_path"
    generate_c2pa "$ARTIFACTS_DIR" "$key_path"
    generate_docx_pointer "$ARTIFACTS_DIR" "$key_path"
    
    # Generate failure cases
    generate_tampered "$ARTIFACTS_DIR"
    generate_orphaned "$ARTIFACTS_DIR"
    
    # Generate expected outputs
    generate_test_outputs "$ARTIFACTS_DIR"
    
    # Create summary
    cat > "$ARTIFACTS_DIR/README.md" << EOF
# Test Vector Artifacts

Generated on: $(date)

## Directory Structure

- \`pass/sidecar/\` - Files with .passport.json sidecar files (PASS)
- \`pass/c2pa/\` - Files with C2PA embedded passports (PASS)
- \`pass/docx/\` - DOCX files with pointer-based passports (PASS)
- \`tampered/\` - Files with valid passports but tampered content (FAIL)
- \`orphaned/\` - Files without any passports (WARNING)
- \`expected/\` - Expected JSON outputs for verification
- \`test-signing-key.pem\` - Test signing key used for all passports

## Verification

Run verification on all test vectors:

\`\`\`bash
# Verify all files
pp verify --glob "**/*" --json

# Verify specific categories
pp verify --glob "pass/sidecar/*" --json
pp verify --glob "pass/c2pa/*" --json
pp verify --glob "pass/docx/*" --json
pp verify --glob "tampered/*" --json
pp verify --glob "orphaned/*" --json
\`\`\`

## Expected Results

- **pass/sidecar/***: All PASS
- **pass/c2pa/***: All PASS (if c2patool available)
- **pass/docx/***: All PASS
- **tampered/***: All FAIL (hash mismatch)
- **orphaned/***: All WARNING (no passport found)
EOF
    
    success "Test vector generation complete!"
    log "Artifacts created in: $ARTIFACTS_DIR"
    log "Run './examples/scripts/tamper.sh' to create additional failure test cases"
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi