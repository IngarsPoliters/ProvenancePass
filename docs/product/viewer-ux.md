# Provenance Passport Web Viewer UX Guide

## Overview

The Provenance Passport Web Viewer is a browser-based application that allows users to verify the authenticity and provenance of digital files by drag-and-drop. It supports both C2PA-embedded provenance data and sidecar passport files.

## User Interface

### Landing Page
- **Header**: Clear branding and description
- **Drop Zone**: Large, prominent area for file drag-and-drop
- **Instructions**: Guidance on supported file types and formats

### Drop Zone Behavior
- **Idle State**: Dashed border, neutral colors, clear instructions
- **Hover State**: Brightened appearance when mouse hovers
- **Drag Over**: Visual feedback with color change and scale animation
- **Active State**: Shows upload icon and helpful text

## Verification Process

### 1. File Detection Strategy

The viewer uses a hierarchical verification approach:

1. **C2PA First**: Attempts to extract embedded manifests from supported files
2. **DOCX Custom Parts**: For Word documents, checks custom XML parts  
3. **Sidecar Pairing**: Matches files with `.passport.json` or `.pp` files
4. **Standalone Passport**: Accepts direct passport file uploads

### 2. Supported File Types

#### C2PA Supported
- **Images**: JPEG, PNG, WebP, AVIF
- **Documents**: PDF
- **Video**: MP4, QuickTime
- **Audio**: MP3, WAV

#### Sidecar Supported
- **Any file type** with accompanying `.passport.json` or `.pp` file
- **DOCX files** (with custom XML parts fallback)

## Verification Results

### Success State (✅ PASS)
- **Green accent color** and checkmark icon
- **File information**: Name, hash, creation date
- **Passport source**: C2PA, sidecar, or DOCX custom parts
- **Key information**: Key ID and revocation status
- **Processing steps**: Timeline of file operations
- **Policy checks**: Security and compliance validations

### Failure State (❌ FAIL)
- **Red accent color** and X icon
- **Error details**: Specific reason for failure
- **Partial information**: Any data that could be extracted
- **Troubleshooting hints**: Suggestions for resolution

### Warning State (⚠️ WARNING)
- **Orange accent color** and warning icon
- **Missing passport**: No provenance data found
- **Partial verification**: Some checks passed, others failed
- **Guidance**: How to add or find provenance data

## Error States and Handling

### Common Error Scenarios

#### 1. No Passport Found
**Trigger**: File has no embedded or sidecar passport
**Display**: 
- Warning status with orange styling
- Clear message explaining no passport was found
- Suggestions for adding provenance

#### 2. Invalid Signature
**Trigger**: Passport signature doesn't match content
**Display**:
- Fail status with red styling
- "Signature verification failed" message
- Details about hash mismatches if applicable

#### 3. Revoked Key
**Trigger**: Signing key appears in revocation list
**Display**:
- Fail status with red styling
- "Signing key has been revoked" message
- Key ID and revocation details

#### 4. File Modified
**Trigger**: Content hash doesn't match passport
**Display**:
- Fail status with red styling
- "File may have been modified" message
- Expected vs actual hash comparison

#### 5. Network Errors
**Trigger**: Can't fetch revocation list
**Display**:
- Key status shows "unknown" with yellow badge
- Warning note about revocation check failure
- Verification continues with available data

#### 6. Unsupported Format
**Trigger**: File type not supported by C2PA
**Display**:
- Graceful fallback to sidecar detection
- Clear indication of verification method used
- No error shown to user (handled transparently)

### Error Recovery

- **Try Again Button**: Allows users to reset and try different files
- **Multiple File Support**: Can drop both file and passport together
- **Format Guidance**: Helpful text about supported combinations

## User Flows

### Flow 1: C2PA Embedded File
1. User drops PNG/JPEG file with embedded C2PA manifest
2. System extracts Provenance Passport from manifest
3. Displays verification result with "C2PA Embedded Manifest" source
4. Shows all passport metadata and verification status

### Flow 2: Sidecar File Pairing
1. User drops both `document.pdf` and `document.pdf.passport.json`
2. System automatically pairs files by name
3. Verifies PDF against passport data
4. Displays result with "Sidecar File" source

### Flow 3: DOCX Custom Parts
1. User drops Word document with embedded custom XML parts
2. System attempts C2PA first, falls back to custom parts
3. Extracts passport from `/customXml/passport.json`
4. Displays result with "DOCX Custom XML Parts" source

### Flow 4: No Passport Found
1. User drops regular file without provenance
2. System checks all detection methods
3. Shows warning state with guidance
4. Suggests ways to add provenance tracking

## Accessibility Features

### Keyboard Navigation
- **Tab Support**: All interactive elements accessible via keyboard
- **Enter/Space**: Activates file picker when drop zone focused
- **Screen Reader**: Proper ARIA labels and descriptions

### Visual Design
- **High Contrast**: Clear color distinctions for all states
- **Large Targets**: Drop zone and buttons meet touch guidelines
- **Clear Typography**: Readable fonts and appropriate sizing

### Error Communication
- **Multiple Channels**: Visual icons, colors, and text descriptions
- **Plain Language**: Avoid technical jargon in user-facing messages
- **Progressive Disclosure**: Summary first, details on demand

## Performance Considerations

### File Size Limits
- **C2PA Processing**: Handles files up to 100MB efficiently
- **Memory Usage**: Streams large files to avoid browser limits
- **Progressive Loading**: Shows status during processing

### Caching Strategy
- **Revocation Data**: Cached for 5 minutes to reduce API calls
- **C2PA WASM**: Loaded once and reused across verifications
- **Static Assets**: Leverages browser caching for performance

## Security and Privacy

### Client-Side Processing
- **No File Upload**: All verification happens in the browser
- **Local Processing**: Files never leave the user's device
- **Network Calls**: Only for revocation list fetching

### Data Handling
- **Temporary Storage**: File data discarded after verification
- **No Tracking**: No user data collected or stored
- **Transparent Operations**: All verification steps shown to user

## Browser Compatibility

### Minimum Requirements
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **WebAssembly**: Required for C2PA processing
- **File API**: For drag-and-drop functionality
- **Crypto API**: For hash verification

### Graceful Degradation
- **WASM Unavailable**: Falls back to sidecar-only verification
- **Old Browsers**: Shows compatibility warning with upgrade suggestions
- **Network Issues**: Continues verification with local data only

## Deployment and Hosting

### Static Hosting
- **No Server Required**: Fully client-side application
- **CDN Compatible**: Can be served from any static host
- **HTTPS Required**: For security and modern API access

### Configuration
- **Environment Variables**: Revocation URL configurable at build time
- **Base Path**: Supports deployment in subdirectories
- **Asset Optimization**: WASM and worker files properly handled