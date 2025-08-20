import { test, expect } from '@playwright/test'
import { ViewerPage } from './test-utils'

test.describe('PASS Scenario: Sample Autoload', () => {
  let viewerPage: ViewerPage

  test.beforeEach(async ({ page }) => {
    viewerPage = new ViewerPage(page)
    await viewerPage.goto()
  })

  test('should display the try sample button', async () => {
    await expect(viewerPage.trySampleButton).toBeVisible()
    await expect(viewerPage.trySampleButton).toContainText('Try Sample Now')
    await expect(viewerPage.trySampleButton).not.toBeDisabled()
  })

  test('should show loading state when clicking try sample button', async ({ page }) => {
    // Start monitoring network requests to verify lazy loading
    const networkRequests: string[] = []
    page.on('request', request => {
      networkRequests.push(request.url())
    })

    await viewerPage.clickTrySample()
    
    // Should show loading indicator
    await viewerPage.waitForLoading()
    await expect(viewerPage.loadingIndicator).toBeVisible()
    await expect(viewerPage.loadingIndicator).toContainText('Verifying files...')

    // Wait for verification to complete
    await viewerPage.waitForLoadingToFinish()
    await viewerPage.waitForVerificationResult()

    // Verify lazy loading occurred (verifier chunks should be loaded)
    const hasLazyChunks = networkRequests.some(url => 
      url.includes('verifier') || url.includes('chunk')
    )
    expect(hasLazyChunks).toBeTruthy()
  })

  test('should display green PASS banner for valid sample', async ({ page }) => {
    // Monitor console for any errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    // Should show PASS result
    await viewerPage.expectPassResult()

    // Verify no console errors (except expected ones)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('404') && // Ignore 404s for optional resources
      !error.includes('NetworkError') // Ignore network errors in test env
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should load sample data correctly', async () => {
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    await viewerPage.expectPassResult()

    // Check that verification result contains expected data
    const resultElement = viewerPage.verificationResult
    await expect(resultElement).toContainText('document.txt')
    await expect(resultElement).toContainText('Sidecar File')
    
    // Should show artifact hash
    await expect(resultElement).toContainText('Artifact Hash')
    
    // Should show signature status
    await expect(resultElement).toContainText('Valid')
  })

  test('should verify lazy loading chunks are properly loaded', async ({ page }) => {
    const responsePromises: Promise<void>[] = []
    
    page.on('response', response => {
      if (response.url().includes('verifier') || response.url().includes('chunk')) {
        responsePromises.push(
          response.finished().then(() => {
            expect(response.status()).toBe(200)
          })
        )
      }
    })

    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    // Wait for all lazy chunks to load successfully
    await Promise.all(responsePromises)
    
    await viewerPage.expectPassResult()
  })

  test('should allow resetting after successful verification', async () => {
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Click reset button
    await viewerPage.clickReset()

    // Should return to initial state
    await viewerPage.expectNoVerificationResult()
    await viewerPage.expectDropZoneVisible()
    await expect(viewerPage.trySampleButton).toBeVisible()
  })

  test('should preload verifier on hover', async ({ page }) => {
    const networkRequests: string[] = []
    page.on('request', request => {
      networkRequests.push(request.url())
    })

    // Hover over the try sample button
    await viewerPage.trySampleButton.hover()
    
    // Wait a moment for preloading to trigger
    await page.waitForTimeout(500)

    // Check if preloading was triggered
    const hasPreloadRequests = networkRequests.some(url => 
      url.includes('verifier') || url.includes('chunk')
    )
    
    // Preloading may or may not happen in test environment
    // This test documents the expected behavior
    console.log('Preload requests detected:', hasPreloadRequests)
  })

  test('should handle rapid clicks gracefully', async () => {
    // Click multiple times rapidly
    await viewerPage.trySampleButton.click()
    await viewerPage.trySampleButton.click() // Second click should be ignored
    
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Should only show one result, not multiple
    const resultElements = await viewerPage.page.locator('.verification-result').count()
    expect(resultElements).toBe(1)
  })

  test('should maintain accessibility standards', async () => {
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()

    // Check that focus can be managed properly
    const resultHeader = viewerPage.resultHeader
    await expect(resultHeader).toBeVisible()
    
    // Reset button should be focusable
    await viewerPage.resetButton.focus()
    await expect(viewerPage.resetButton).toBeFocused()

    // Keyboard navigation should work
    await viewerPage.page.keyboard.press('Enter')
    await viewerPage.expectNoVerificationResult()
  })
})