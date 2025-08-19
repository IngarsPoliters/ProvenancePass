#!/bin/bash

# tamper.sh - Create tampered files for testing FAIL scenarios
# Flips bytes, corrupts signatures, and creates various failure conditions

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

usage() {
    cat << EOF
Usage: $0 [OPTIONS] <target_directory>

Create tampered versions of files for testing failure scenarios.

OPTIONS:
    -h, --help          Show this help message
    -o, --output DIR    Output directory for tampered files (default: target/tampered)
    -t, --type TYPE     Tampering type: byte|signature|json|all (default: all)
    -v, --verbose       Verbose output

EXAMPLES:
    $0 examples/artifacts                    # Tamper all files
    $0 -t byte examples/artifacts           # Only flip bytes
    $0 -o /tmp/test examples/artifacts      # Custom output directory

TAMPERING TYPES:
    byte        Flip random bytes in files
    signature   Corrupt passport signatures
    json        Malform JSON structure
    all         Apply all tampering types
EOF
}

# Flip a random byte in a file
flip_byte() {
    local file="$1"
    local output="$2"
    
    if [[ ! -f "$file" ]]; then
        error "File not found: $file"
        return 1
    fi
    
    # Copy original file
    cp "$file" "$output"
    
    # Get file size
    local size=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null || echo "0")
    
    if [[ "$size" -eq 0 ]]; then
        warning "Empty file or could not get size: $output"
        return 1
    fi
    
    # Choose random position (avoid very end to prevent truncation issues)
    local pos=$((RANDOM % (size - 1)))
    
    # Read byte at position
    local original_byte=$(xxd -s "$pos" -l 1 -p "$output")
    
    # Flip a bit (XOR with 0x01)
    local new_byte=$(printf "%02x" $((0x${original_byte} ^ 0x01)))
    
    # Write flipped byte back
    echo "$new_byte" | xxd -r -p | dd of="$output" bs=1 seek="$pos" count=1 conv=notrunc 2>/dev/null
    
    log "Flipped byte at position $pos: 0x$original_byte -> 0x$new_byte in $(basename "$output")"
}

# Corrupt a JSON passport signature
corrupt_signature() {
    local passport_file="$1"
    local output="$2"
    
    if [[ ! -f "$passport_file" ]]; then
        error "Passport file not found: $passport_file"
        return 1
    fi
    
    # Copy original passport
    cp "$passport_file" "$output"
    
    # Check if it's a valid JSON passport
    if ! jq -e '.signature.signature' "$output" >/dev/null 2>&1; then
        warning "Not a valid passport JSON: $passport_file"
        return 1
    fi
    
    # Corrupt the signature by changing a few characters
    local corrupted_sig="deadbeef$(jq -r '.signature.signature' "$output" | cut -c9-)"
    
    # Update the signature in place
    jq --arg sig "$corrupted_sig" '.signature.signature = $sig' "$output" > "${output}.tmp" && mv "${output}.tmp" "$output"
    
    log "Corrupted signature in $(basename "$output")"
}

# Malform JSON structure
malform_json() {
    local passport_file="$1"
    local output="$2"
    local malform_type="${3:-syntax}"
    
    if [[ ! -f "$passport_file" ]]; then
        error "Passport file not found: $passport_file"
        return 1
    fi
    
    case "$malform_type" in
        "syntax")
            # Create syntax error by removing closing brace
            head -n -1 "$passport_file" > "$output"
            log "Created JSON syntax error in $(basename "$output")"
            ;;
        "structure")
            # Remove required field
            jq 'del(.signature)' "$passport_file" > "$output"
            log "Removed required field from $(basename "$output")"
            ;;
        "type")
            # Change field type
            jq '.artifact.sha256 = 12345' "$passport_file" > "$output"
            log "Changed field type in $(basename "$output")"
            ;;
        *)
            error "Unknown malform type: $malform_type"
            return 1
            ;;
    esac
}

# Create expired passport (modify timestamp)
create_expired() {
    local passport_file="$1"
    local output="$2"
    
    if [[ ! -f "$passport_file" ]]; then
        error "Passport file not found: $passport_file"
        return 1
    fi
    
    # Set created_at to far in the future (or past, depending on policy)
    local future_date="2099-12-31T23:59:59Z"
    jq --arg date "$future_date" '.artifact.created_at = $date' "$passport_file" > "$output"
    
    log "Created future-dated passport in $(basename "$output")"
}

# Tamper with files in a directory
tamper_directory() {
    local input_dir="$1"
    local output_dir="$2"
    local tamper_type="$3"
    
    log "Tampering files from $input_dir to $output_dir (type: $tamper_type)"
    
    mkdir -p "$output_dir"
    
    # Find all files to tamper with
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$input_dir" -type f -not -name ".*" -print0)
    
    if [[ ${#files[@]} -eq 0 ]]; then
        warning "No files found in $input_dir"
        return 0
    fi
    
    local count=0
    
    for file in "${files[@]}"; do
        local relative_path="${file#$input_dir/}"
        local output_file="$output_dir/$relative_path"
        local output_subdir=$(dirname "$output_file")
        
        mkdir -p "$output_subdir"
        
        local filename=$(basename "$file")
        local extension="${filename##*.}"
        
        case "$tamper_type" in
            "byte"|"all")
                if [[ "$filename" != *.passport.json ]]; then
                    local tampered_file="$output_subdir/tampered-$filename"
                    if flip_byte "$file" "$tampered_file"; then
                        success "Byte-tampered: $relative_path -> tampered-$filename"
                        ((count++))
                    fi
                fi
                ;;&
            "signature"|"all")
                if [[ "$filename" == *.passport.json ]]; then
                    local sig_tampered="$output_subdir/sig-tampered-$filename"
                    if corrupt_signature "$file" "$sig_tampered"; then
                        success "Signature-tampered: $relative_path -> sig-tampered-$filename"
                        ((count++))
                    fi
                fi
                ;;&
            "json"|"all")
                if [[ "$filename" == *.passport.json ]]; then
                    # Create multiple JSON malformations
                    for malform in syntax structure type; do
                        local json_tampered="$output_subdir/json-$malform-$filename"
                        if malform_json "$file" "$json_tampered" "$malform"; then
                            success "JSON-tampered ($malform): $relative_path -> json-$malform-$filename"
                            ((count++))
                        fi
                    done
                    
                    # Create expired passport
                    local expired_file="$output_subdir/expired-$filename"
                    if create_expired "$file" "$expired_file"; then
                        success "Expired passport: $relative_path -> expired-$filename"
                        ((count++))
                    fi
                fi
                ;;
        esac
    done
    
    success "Created $count tampered files"
}

# Create comprehensive test scenarios
create_test_scenarios() {
    local output_dir="$1"
    
    log "Creating comprehensive test scenarios"
    
    local scenarios_dir="$output_dir/scenarios"
    mkdir -p "$scenarios_dir"
    
    # Scenario 1: Valid file with missing passport
    echo "Valid content" > "$scenarios_dir/valid-no-passport.txt"
    
    # Scenario 2: Valid file with valid passport (for comparison)
    echo "Valid content" > "$scenarios_dir/valid-with-passport.txt"
    if command -v pp >/dev/null 2>&1; then
        # Try to create passport if CLI is available
        pp wrap "$scenarios_dir/valid-with-passport.txt" --sign "$output_dir/../test-signing-key.pem" --output "$scenarios_dir/valid-with-passport.txt.passport.json" 2>/dev/null || \
        warning "Could not create valid passport - pp CLI not available or no signing key"
    fi
    
    # Scenario 3: File with passport but wrong content
    echo "Different content" > "$scenarios_dir/wrong-content.txt"
    if [[ -f "$scenarios_dir/valid-with-passport.txt.passport.json" ]]; then
        cp "$scenarios_dir/valid-with-passport.txt.passport.json" "$scenarios_dir/wrong-content.txt.passport.json"
    fi
    
    # Create README for scenarios
    cat > "$scenarios_dir/README.md" << EOF
# Test Scenarios

## Files

1. **valid-no-passport.txt** - File without any passport (WARNING expected)
2. **valid-with-passport.txt** - File with valid passport (PASS expected)
3. **wrong-content.txt** - File with passport for different content (FAIL expected)

## Verification

\`\`\`bash
pp verify --glob "scenarios/*" --json
\`\`\`

## Expected Results

- valid-no-passport.txt: WARNING (no passport found)
- valid-with-passport.txt: PASS (if passport was created)
- wrong-content.txt: FAIL (hash mismatch)
EOF
    
    success "Created test scenarios in $scenarios_dir"
}

# Main execution
main() {
    local target_dir=""
    local output_dir=""
    local tamper_type="all"
    local verbose=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -o|--output)
                output_dir="$2"
                shift 2
                ;;
            -t|--type)
                tamper_type="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                target_dir="$1"
                shift
                ;;
        esac
    done
    
    # Validate arguments
    if [[ -z "$target_dir" ]]; then
        error "Target directory is required"
        usage
        exit 1
    fi
    
    if [[ ! -d "$target_dir" ]]; then
        error "Target directory does not exist: $target_dir"
        exit 1
    fi
    
    if [[ -z "$output_dir" ]]; then
        output_dir="$target_dir/tampered"
    fi
    
    if [[ ! "$tamper_type" =~ ^(byte|signature|json|all)$ ]]; then
        error "Invalid tamper type: $tamper_type"
        usage
        exit 1
    fi
    
    log "Starting tampering process"
    log "Target: $target_dir"
    log "Output: $output_dir"
    log "Type: $tamper_type"
    
    # Create output directory
    mkdir -p "$output_dir"
    
    # Tamper with files
    tamper_directory "$target_dir" "$output_dir" "$tamper_type"
    
    # Create additional test scenarios
    create_test_scenarios "$output_dir"
    
    # Create summary
    cat > "$output_dir/README.md" << EOF
# Tampered Files for Testing

Generated on: $(date)
Source: $target_dir
Type: $tamper_type

## Directory Structure

- **tampered-*** - Files with flipped bytes (content tampering)
- **sig-tampered-*** - Passports with corrupted signatures
- **json-syntax-*** - Passports with JSON syntax errors
- **json-structure-*** - Passports missing required fields
- **json-type-*** - Passports with wrong field types
- **expired-*** - Passports with future timestamps
- **scenarios/** - Comprehensive test scenarios

## Usage

These files are designed to test FAIL and WARNING scenarios:

\`\`\`bash
# Verify tampered files (should fail)
pp verify --glob "$output_dir/**/*" --json

# Test specific tampering types
pp verify --glob "$output_dir/tampered-*" --json
pp verify --glob "$output_dir/sig-tampered-*" --json
pp verify --glob "$output_dir/json-*" --json
\`\`\`

## Expected Results

- **tampered-*** files: FAIL (hash mismatch)
- **sig-tampered-*** files: FAIL (signature verification failed)
- **json-*** files: FAIL (invalid passport format)
- **scenarios/wrong-content.txt**: FAIL (hash mismatch)
- **scenarios/valid-no-passport.txt**: WARNING (no passport found)
EOF
    
    success "Tampering complete!"
    log "Tampered files created in: $output_dir"
    log "Use 'pp verify --glob \"$output_dir/**/*\" --json' to test all tampered files"
}

# Check for required tools
check_tools() {
    local missing=()
    
    if ! command -v xxd >/dev/null 2>&1; then
        missing+=("xxd")
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        missing+=("jq")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_tools
    main "$@"
fi