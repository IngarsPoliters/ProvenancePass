import { test, expect } from '@playwright/test'
import { ViewerPage } from './test-utils'

test.describe('Integration: Test-Automator + Error-Detective', () => {
  let viewerPage: ViewerPage

  test.beforeEach(async ({ page }) => {
    viewerPage = new ViewerPage(page)
    await viewerPage.goto()
  })

  test('should coordinate error detection with automated testing', async ({ page }) => {
    // Error-Detective: Monitor for errors during automated test execution
    const consoleErrors: string[] = []
    const networkErrors: string[] = []
    const unhandledRejections: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    page.on('requestfailed', request => {
      networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`)
    })

    page.on('pageerror', error => {
      unhandledRejections.push(error.message)
    })

    // Test-Automator: Execute automated verification flow
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Reset and test again to check for cleanup
    await viewerPage.clickReset()
    await viewerPage.expectNoVerificationResult()

    // Try another verification
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Error-Detective: Analyze collected errors
    console.log('Console Errors:', consoleErrors.length)
    console.log('Network Errors:', networkErrors.length)
    console.log('Unhandled Rejections:', unhandledRejections.length)

    // Filter out acceptable errors
    const criticalConsoleErrors = consoleErrors.filter(error => 
      !error.includes('404') && 
      !error.includes('favicon') &&
      !error.includes('DevTools')
    )

    const criticalNetworkErrors = networkErrors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('net::ERR_INTERNET_DISCONNECTED')
    )

    // Test-Automator: Assert no critical errors occurred
    expect(criticalConsoleErrors).toHaveLength(0)
    expect(criticalNetworkErrors).toHaveLength(0)
    expect(unhandledRejections).toHaveLength(0)
  })

  test('should verify AbortController cleanup during rapid interactions', async ({ page }) => {
    // Error-Detective: Track abort signals and cleanup
    const abortEvents: string[] = []
    
    page.on('console', msg => {
      if (msg.text().includes('abort') || msg.text().includes('cancel')) {
        abortEvents.push(msg.text())
      }
    })

    // Test-Automator: Rapid fire interactions to test cleanup
    await viewerPage.clickTrySample()
    
    // Quickly trigger reset before completion (tests abort handling)
    await page.waitForTimeout(100)
    await viewerPage.page.evaluate(() => {
      const resetBtn = document.querySelector('button:has-text("Try Again")')
      if (resetBtn) (resetBtn as HTMLElement).click()
    })

    await page.waitForTimeout(500)
    
    // Try again normally
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Error-Detective: Verify no memory leaks or hanging promises
    await viewerPage.expectNoMemoryLeaks()
  })

  test('should validate lazy loading with error monitoring', async ({ page }) => {
    // Test-Automator: Monitor network requests during lazy loading
    const networkRequests: Array<{ url: string, status: number, type: string }> = []
    
    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        type: response.request().resourceType()
      })
    })

    // Error-Detective: Track any loading errors
    const loadingErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('loading') || 
        msg.text().includes('chunk') ||
        msg.text().includes('import')
      )) {
        loadingErrors.push(msg.text())
      }
    })

    // Test-Automator: Execute verification with lazy loading
    await viewerPage.clickTrySample()
    await viewerPage.waitForLazyLoadingComplete()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Error-Detective: Analyze loading behavior
    const jsRequests = networkRequests.filter(req => 
      req.type === 'script' || req.url.includes('.js')
    )
    const failedRequests = networkRequests.filter(req => req.status >= 400)

    console.log('JS Requests:', jsRequests.length)
    console.log('Failed Requests:', failedRequests.length)
    console.log('Loading Errors:', loadingErrors.length)

    // Test-Automator: Verify successful lazy loading
    expect(jsRequests.length).toBeGreaterThan(0) // Should load JS chunks
    expect(failedRequests).toHaveLength(0) // No failed requests
    expect(loadingErrors).toHaveLength(0) // No loading errors
  })

  test('should coordinate error recovery testing', async ({ page }) => {
    // Error-Detective: Prepare error injection
    let errorInjected = false
    
    await page.route('**/samples/pass/sidecar/document.txt.passport.json', route => {
      if (!errorInjected) {
        errorInjected = true
        route.fulfill({ status: 500, body: 'Server Error' })
      } else {
        route.continue()
      }
    })

    // Test-Automator: Test error scenario
    await viewerPage.clickTrySample()
    await expect(viewerPage.errorMessage).toBeVisible()
    await viewerPage.expectErrorMessage('Failed to fetch sample files')

    // Reset and test recovery
    await page.evaluate(() => {
      const resetBtn = document.querySelector('button:has-text("Try Again")')
      if (resetBtn) (resetBtn as HTMLElement).click()
    })

    // Test-Automator: Verify recovery works
    await viewerPage.clickTrySample()
    await viewerPage.waitForVerificationResult()
    await viewerPage.expectPassResult()

    // Error-Detective: Verify clean recovery
    await viewerPage.expectNoMemoryLeaks()
  })

  test('should validate performance under test automation load', async ({ page }) => {
    // Test-Automator: Performance testing under automation
    const startTime = Date.now()
    
    // Error-Detective: Monitor performance metrics
    const performanceEntries: PerformanceEntry[] = []
    
    page.on('console', msg => {
      if (msg.text().includes('performance') || msg.text().includes('timing')) {
        console.log('Performance:', msg.text())
      }
    })

    // Execute multiple verification cycles
    for (let i = 0; i < 3; i++) {
      await viewerPage.clickTrySample()
      await viewerPage.waitForVerificationResult()
      await viewerPage.expectPassResult()
      await viewerPage.clickReset()
      await page.waitForTimeout(100)
    }

    const totalTime = Date.now() - startTime
    console.log('Total test execution time:', totalTime, 'ms')

    // Test-Automator: Performance assertions
    expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds
    
    // Error-Detective: Verify no performance degradation
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    })

    if (memoryUsage) {
      console.log('Memory usage:', memoryUsage)
      expect(memoryUsage.used / memoryUsage.total).toBeLessThan(0.8) // Less than 80% memory usage
    }
  })
})