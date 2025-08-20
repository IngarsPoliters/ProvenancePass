# E2E Testing for Provenance Passport Viewer

This directory contains end-to-end tests for the Provenance Passport Viewer using [Playwright](https://playwright.dev/).

## Test Scenarios

### 🟢 PASS Scenario (`pass-scenario.spec.ts`)
Tests the happy path where verification succeeds:
- **Sample Autoload**: Click "Try Sample" button and verify green PASS banner
- **Lazy Loading**: Verify that verification chunks load correctly
- **Sample Data**: Ensure sample data loads and displays properly
- **Reset Functionality**: Test ability to verify another file after success
- **Accessibility**: Verify keyboard navigation and focus management
- **Performance**: Check for rapid clicks and preloading behavior

### 🔴 FAIL Scenario (`fail-scenario.spec.ts`)
Tests failure cases where verification fails:
- **Hash Mismatch**: Tampered sample files showing red FAIL banner
- **Invalid Signatures**: Files with corrupted or invalid signatures
- **Revoked Keys**: Files signed with revoked signing keys
- **Network Errors**: Handling of network failures during verification
- **Error Recovery**: Ability to retry after failures
- **AbortController**: Proper cancellation of ongoing verifications

### 🟡 WARNING Scenario (`warning-scenario.spec.ts`)
Tests warning cases where files lack passports:
- **Orphaned Files**: Files uploaded without accompanying passports
- **Missing C2PA**: Images without embedded C2PA manifests
- **Missing Sidecar**: Files without sidecar passport files
- **DOCX without Custom Parts**: DOCX files lacking custom XML parts
- **Recovery**: User guidance and recovery from warning states

## Test Architecture

### Test Utilities (`test-utils.ts`)
- **ViewerPage Class**: Page object model for the viewer interface
- **Test Data**: Mock passport data for various scenarios
- **Helper Functions**: Network monitoring, error detection, accessibility checks

### Setup (`setup.ts`)
Global test setup that:
- Verifies test environment is ready
- Checks for critical console errors
- Validates app responsiveness
- Ensures accessibility baseline

## Key Test Features

### Lazy Loading Validation
Tests verify that:
- Verification chunks are loaded on-demand
- Network requests occur at the right times
- Preloading works on user interaction
- Loading states are properly displayed

### Error Detective Integration
Tests coordinate with error handling to verify:
- Error boundaries catch failures gracefully
- AbortController cancels requests properly
- Memory leaks are prevented
- Console errors are handled appropriately

### Accessibility Testing
Tests ensure:
- Focus management works correctly
- Keyboard navigation is functional
- Screen reader announcements are proper
- Color contrast and visibility are adequate

## Browser Support

Tests run on:
- **Chromium** (Chrome/Edge equivalent)
- **Firefox** 
- **WebKit** (Safari equivalent)

## Running Tests

### Local Development
```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm test:e2e:install

# Run all E2E tests
pnpm test:e2e

# Run tests in UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (visible browser)
pnpm test:e2e:headed

# Run specific test file
pnpm test:e2e pass-scenario

# Run tests for specific browser
pnpm test:e2e --project=chromium
```

### CI/CD Integration
Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Changes to viewer package files

Artifacts are collected:
- **Playwright Report**: Test results and traces
- **Test Results**: Screenshots and videos on failure

## Test Selectors

The tests use stable selectors based on:
- **Component Classes**: `.verification-result`, `.dropzone`, etc.
- **Text Content**: `button:has-text("Try Sample Now")`
- **ARIA Labels**: Accessibility-focused selectors
- **Data Attributes**: Custom test attributes (when needed)

## Error Detection Strategy

Tests monitor for:
- **Console Errors**: JavaScript exceptions and warnings
- **Network Failures**: Failed requests and timeouts
- **Memory Leaks**: Repeated operations causing resource issues
- **Performance Issues**: Slow loading or unresponsive UI

## Mock Strategy

Tests use network interception to:
- **Simulate Failures**: Mock tampered passport files
- **Test Error Handling**: Return 404s or invalid JSON
- **Control Timing**: Test race conditions and cancellation
- **Isolate Components**: Test viewer independently of data service

## Maintenance Notes

### Adding New Tests
1. Follow the existing pattern for test organization
2. Use the `ViewerPage` class for interactions
3. Add appropriate assertions for the scenario
4. Include accessibility and error checking
5. Update this README with new scenarios

### Updating Selectors
When UI changes:
1. Update selectors in `test-utils.ts`
2. Prefer semantic selectors over fragile ones
3. Test across all browsers
4. Verify accessibility impact

### Performance Considerations
- Tests should complete within 60 seconds total
- Individual test timeout: 30 seconds
- Network idle timeout: 10 seconds
- Use `waitForLoadState('networkidle')` for lazy loading

## Troubleshooting

### Common Issues
- **Timeout Errors**: Increase wait times or check network connectivity
- **Selector Failures**: UI changes may require selector updates
- **Flaky Tests**: Add proper wait conditions and error handling
- **CI Failures**: Check browser compatibility and network policies

### Debug Mode
```bash
# Run with debug flag
DEBUG=pw:api pnpm test:e2e

# Generate trace for failed tests
pnpm test:e2e --trace on

# View test results
npx playwright show-report
```

## Integration Points

### With Error Detective
- Tests verify error boundary behavior
- AbortController functionality is validated
- Memory leak detection is included
- Console error monitoring is active

### With Lazy Loading
- Network request monitoring
- Chunk loading verification
- Performance impact measurement
- User experience validation

### With CI/CD Pipeline
- Automated test execution
- Artifact collection
- Failure reporting
- Performance monitoring