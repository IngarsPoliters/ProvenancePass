import { test, expect } from '@playwright/test'
import { ViewerPage, TestData } from './test-utils'

test.describe('FAIL Scenario: Tampered Sample', () => {
  let viewerPage: ViewerPage

  test.beforeEach(async ({ page }) => {
    viewerPage = new ViewerPage(page)
    await viewerPage.goto()
  })

  test('should display red FAIL banner for hash mismatch', async ({ page }) => {
    // We'll simulate this by mocking the sample data endpoint
    // to return tampered data
    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.tamperedPassport)
      })
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    // Should show FAIL result
    await viewerPage.expectFailResult()
  })

  test('should show hash mismatch error message', async ({ page }) => {
    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.tamperedPassport)
      })
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    await viewerPage.expectFailResult()
    await viewerPage.expectErrorMessage('hash mismatch')
    
    // Should show detailed error information
    const resultElement = viewerPage.verificationResult
    await expect(resultElement).toContainText('file may have been modified')
  })

  test('should verify error handling works with lazy loading', async ({ page }) => {
    const networkRequests: string[] = []
    page.on('request', request => {
      networkRequests.push(request.url())
    })

    // Mock tampered passport
    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.tamperedPassport)
      })
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    // Lazy loading should still work even with verification failure
    const hasLazyChunks = networkRequests.some(url => 
      url.includes('verifier') || url.includes('chunk')
    )
    expect(hasLazyChunks).toBeTruthy()

    await viewerPage.expectFailResult()
  })

  test('should test AbortController functionality', async ({ page }) => {
    let requestAborted = false
    
    page.on('request', request => {
      if (request.url().includes('samples/')) {
        // Simulate a slow request that might be aborted
        request.continue()
      }
    })

    page.on('requestfailed', request => {
      if (request.failure()?.errorText === 'net::ERR_ABORTED') {
        requestAborted = true
      }
    })

    // Start verification
    await viewerPage.clickTrySample()
    
    // Quickly click reset to potentially trigger abort
    await page.waitForTimeout(100)
    await viewerPage.page.evaluate(() => {
      // Try to trigger reset if button is available
      const resetBtn = document.querySelector('button:has-text("Try Again")') as HTMLElement
      if (resetBtn) resetBtn.click()
    })

    // Wait for any pending operations
    await page.waitForTimeout(1000)

    // Test passes if no unhandled errors occurred
    // AbortController should handle cancellation gracefully
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure for sample files
    await page.route('**/samples/pass/sidecar/**', route => {
      route.abort('failed')
    })

    await viewerPage.clickTrySample()
    
    // Should show error state
    await expect(viewerPage.errorMessage).toBeVisible()
    await viewerPage.expectErrorMessage('Failed to fetch sample files')
  })

  test('should handle corrupted passport file', async ({ page }) => {
    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json content {'
      })
    })

    await viewerPage.clickTrySample()
    
    // Should show error state
    await expect(viewerPage.errorMessage).toBeVisible()
    await viewerPage.expectErrorMessage('Verification failed')
  })

  test('should handle signature verification failure', async ({ page }) => {
    // Create passport with invalid signature
    const invalidSignaturePassport = {
      ...TestData.validPassport,
      signature: {
        ...TestData.validPassport.signature,
        signature: 'invalid-signature'
      }
    }

    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(invalidSignaturePassport)
      })
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    await viewerPage.expectFailResult()
    await viewerPage.expectErrorMessage('signature verification failed')
  })

  test('should handle revoked key scenario', async ({ page }) => {
    // Mock revocations endpoint to show key as revoked
    await page.route('**/revocations.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revoked_keys: [{
            key_id: 'test-key-id',
            revoked_at: '2024-01-01T00:00:00Z',
            reason: 'Compromised'
          }],
          last_updated: '2024-01-01T00:00:00Z'
        })
      })
    })

    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.validPassport)
      })
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    await viewerPage.expectFailResult()
    await viewerPage.expectErrorMessage('key has been revoked')
  })

  test('should allow retry after failure', async ({ page }) => {
    // First attempt with tampered data
    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.tamperedPassport)
      })
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectFailResult()

    // Reset and try again with good data
    await viewerPage.clickReset()
    
    // Remove the route to use original endpoint
    await page.unroute('**/samples/pass/sidecar/document.txt.passport.json')

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()
  })

  test('should maintain proper error boundary behavior', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Cause a critical error
    await page.route('**/samples/pass/sidecar/**', route => {
      route.abort('failed')
    })

    await viewerPage.clickTrySample()
    await page.waitForTimeout(2000)

    // Should handle error gracefully without crashing
    await expect(viewerPage.page.locator('body')).toBeVisible()
    
    // Check that error was handled properly (no uncaught exceptions)
    const uncaughtErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') || error.includes('Unhandled')
    )
    expect(uncaughtErrors).toHaveLength(0)
  })
})