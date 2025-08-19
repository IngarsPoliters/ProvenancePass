# Provenance Passport Conformance Tests

*Comprehensive test suite validating Provenance Passport specification compliance.*

## Overview

This conformance suite ensures implementations correctly handle the Provenance Passport v0.1 specification through:

- **Schema Validation**: JSON Schema compliance testing
- **Signature Verification**: Ed25519 cryptographic validation
- **Canonicalization**: JCS (RFC 8785) correctness
- **Test Vectors**: Known-good and known-bad examples
- **Edge Cases**: Boundary conditions and error handling

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Structure

```
conformance/
├── src/
│   ├── schema/           # Schema validation tests
│   ├── signatures/       # Cryptographic verification tests  
│   ├── canonicalization/ # JCS canonicalization tests
│   └── utils/           # Test utilities and helpers
├── test-vectors/
│   ├── valid/           # Valid passport examples
│   ├── invalid/         # Invalid passport examples
│   └── edge-cases/      # Boundary condition tests
└── fixtures/
    ├── keys/            # Test cryptographic keys
    └── artifacts/       # Sample files for testing
```

## Test Categories

### Schema Validation (`src/schema/`)
- Required field presence validation
- Field type and format validation
- Value constraint validation
- Optional field handling
- Schema evolution testing

### Signature Verification (`src/signatures/`)
- Ed25519 signature validation
- Public key format verification
- Signature generation testing
- Invalid signature detection
- Key rotation scenarios

### Canonicalization (`src/canonicalization/`)
- JCS (RFC 8785) implementation testing
- Unicode normalization
- Object key ordering
- Number representation
- String escaping

### Integration Tests (`src/integration/`)
- End-to-end passport creation
- Full verification workflows
- Multi-step processing chains
- Cross-implementation compatibility

## Test Vectors

### Valid Passports
- **Minimal**: Required fields only
- **Complete**: All optional fields included
- **With Inputs**: Multi-input provenance chain
- **With Steps**: Processing step documentation
- **With Review**: Human review information
- **With Policies**: Policy validation results

### Invalid Passports
- **Missing Required Fields**: Various required field omissions
- **Invalid Formats**: Malformed timestamps, hashes, signatures
- **Invalid Values**: Out-of-range values, wrong types
- **Cryptographic Failures**: Invalid signatures, wrong keys

### Edge Cases
- **Large Files**: Handling of large artifact hashes
- **Unicode Content**: International character handling
- **Extreme Timestamps**: Past/future timestamp boundaries
- **Long Chains**: Deep provenance chain testing

## Running Specific Tests

```bash
# Schema validation only
npm test -- src/schema

# Signature tests only
npm test -- src/signatures

# Specific test file
npm test -- src/schema/required-fields.test.ts

# Run with pattern matching
npm test -- --grep "signature"

# Debug mode with verbose output
npm test -- --reporter=verbose
```

## Adding New Tests

### 1. Create Test Vector

```typescript
// test-vectors/valid/my-test.json
{
  "version": "0.1",
  "artifact": {
    "sha256": "a1b2c3d4...",
    "mime": "text/plain",
    "created_at": "2024-08-19T15:30:00Z"
  },
  "signature": {
    "algo": "ed25519", 
    "public_key": "1234567890abcdef...",
    "signature": "fedcba0987654321..."
  }
}
```

### 2. Create Test Case

```typescript
// src/schema/my-feature.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassport } from '../utils/validation';
import testVector from '../../test-vectors/valid/my-test.json';

describe('My Feature', () => {
  it('should validate correctly', () => {
    const result = validatePassport(testVector);
    expect(result.valid).toBe(true);
  });
});
```

### 3. Update Documentation

Document the test case purpose and expected behavior in comments and README.

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Conformance Tests
on: [push, pull_request]

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd conformance && npm ci
      - run: cd conformance && npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          directory: ./conformance/coverage
```

### Test Reports

- **JUnit XML**: `test-results/junit.xml` for CI integration
- **JSON Results**: `test-results/results.json` for analysis
- **Coverage HTML**: `coverage/index.html` for detailed coverage
- **Console Output**: Verbose test execution logs

## Implementation Testing

### CLI Implementation
```bash
# Test CLI against conformance vectors
pp verify test-vectors/valid/*.json

# Validate CLI output format
pp wrap --file fixtures/sample.txt --output test.passport.json
npm test -- --grep "CLI output format"
```

### Web Viewer Testing
```bash
# Generate test files for viewer
npm run generate-viewer-tests

# Run viewer conformance (requires browser)
npm run test:browser
```

### GitHub Action Testing
```bash
# Test action with conformance vectors
echo "test-file" > test.txt
# Use action to create and verify passport
# Validate against conformance requirements
```

## Performance Benchmarks

### Signature Performance
- Ed25519 signature generation: < 1ms
- Ed25519 signature verification: < 1ms
- Large file hashing: < 10ms per MB
- Schema validation: < 1ms per passport

### Memory Usage
- Passport validation: < 1MB RAM
- Large file processing: < 100MB RAM
- Batch processing: Linear memory usage

## Specification Compliance

This test suite validates compliance with:
- **Provenance Passport v0.1**: Complete specification coverage
- **RFC 8785**: JSON Canonicalization Scheme
- **RFC 8032**: Ed25519 signature algorithm
- **RFC 3339**: Date/time format validation
- **JSON Schema Draft 2020-12**: Schema validation

## Contributing

### Adding Test Cases
1. Identify specification requirement needing coverage
2. Create appropriate test vector(s)  
3. Write test case with clear assertions
4. Verify test runs correctly
5. Update documentation

### Reporting Issues
- **Specification Ambiguities**: Requirements unclear in spec
- **Implementation Bugs**: Incorrect test behavior
- **Missing Coverage**: Untested specification areas
- **Performance Issues**: Slow test execution

### Test Quality Guidelines
- **Clear Intent**: Each test validates specific requirement
- **Good Names**: Descriptive test and file names
- **Isolated**: Tests don't depend on each other
- **Deterministic**: Same input always produces same result
- **Fast**: Individual tests complete quickly

---

For questions about conformance testing, create an issue in the main repository or contact the specification team.