import { Page, expect } from '@playwright/test'

/**
 * Test utilities for E2E testing of the Provenance Passport Viewer
 */

export class ViewerPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/')
    await this.waitForPageLoad()
  }

  async waitForPageLoad() {
    // Wait for the main heading to be visible
    await this.page.waitForSelector('h1:has-text("Provenance Passport Viewer")')
    // Wait for the try sample button to be visible
    await this.page.waitForSelector('button:has-text("Try Sample Now")')
  }

  // Selectors for key elements
  get trySampleButton() {
    return this.page.locator('button:has-text("Try Sample Now")')
  }

  get dropZone() {
    return this.page.locator('.dropzone')
  }

  get loadingIndicator() {
    return this.page.locator('.loading')
  }

  get verificationResult() {
    return this.page.locator('.verification-result')
  }

  get resultHeader() {
    return this.page.locator('.result-header h3')
  }

  get resultIcon() {
    return this.page.locator('.result-icon')
  }

  get errorMessage() {
    return this.page.locator('.error')
  }

  get resetButton() {
    return this.page.locator('button:has-text("Verify Another File")')
  }

  // Actions
  async clickTrySample() {
    await this.trySampleButton.click()
  }

  async waitForVerificationResult() {
    await this.page.waitForSelector('.verification-result', { timeout: 30000 })
  }

  async waitForLoading() {
    await this.page.waitForSelector('.loading')
  }

  async waitForLoadingToFinish() {
    await this.page.waitForSelector('.loading', { state: 'hidden', timeout: 30000 })
  }

  async clickReset() {
    await this.resetButton.click()
  }

  // Assertions
  async expectPassResult() {
    await expect(this.verificationResult).toHaveClass(/pass/)
    await expect(this.resultHeader).toContainText('VERIFICATION PASSED')
    await expect(this.resultIcon).toContainText('✅')
  }

  async expectFailResult() {
    await expect(this.verificationResult).toHaveClass(/fail/)
    await expect(this.resultHeader).toContainText('VERIFICATION FAILED')
    await expect(this.resultIcon).toContainText('❌')
  }

  async expectWarningResult() {
    await expect(this.verificationResult).toHaveClass(/warning/)
    await expect(this.resultHeader).toContainText('VERIFICATION WARNING')
    await expect(this.resultIcon).toContainText('⚠️')
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message)
  }

  async expectNoVerificationResult() {
    await expect(this.verificationResult).not.toBeVisible()
  }

  async expectDropZoneVisible() {
    await expect(this.dropZone).toBeVisible()
  }

  // File upload helpers
  async uploadFiles(files: Array<{ name: string, content: string, mimeType?: string }>) {
    // Create file inputs for testing
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    
    // Trigger file chooser (we'll need to add a hidden input for this)
    await this.page.evaluate(() => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.style.display = 'none'
      input.id = 'test-file-input'
      document.body.appendChild(input)
      input.click()
    })

    const fileChooser = await fileChooserPromise
    
    // Convert files to browser files
    const browserFiles = files.map(file => ({
      name: file.name,
      mimeType: file.mimeType || 'text/plain',
      buffer: Buffer.from(file.content)
    }))

    await fileChooser.setFiles(browserFiles)
  }

  // Drag and drop simulation
  async simulateFileDrop(files: Array<{ name: string, content: string, mimeType?: string }>) {
    // This is a simplified version - real drag/drop testing would be more complex
    // For now, we'll use the file upload mechanism
    await this.uploadFiles(files)
  }

  // Wait for lazy loading to complete
  async waitForLazyLoadingComplete() {
    // Wait for network requests to settle (indicating lazy chunks loaded)
    await this.page.waitForLoadState('networkidle', { timeout: 10000 })
  }

  // Check for memory leaks by monitoring console errors
  async expectNoMemoryLeaks() {
    const errors: string[] = []
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Allow some time for async operations to complete
    await this.page.waitForTimeout(1000)

    // Filter out expected errors and check for memory-related issues
    const memoryErrors = errors.filter(error => 
      error.includes('memory') || 
      error.includes('leak') || 
      error.includes('AbortError')
    )

    expect(memoryErrors).toHaveLength(0)
  }
}

// Test data generators
export const TestData = {
  validPassport: {
    artifact: {
      name: 'test-document.txt',
      mime: 'text/plain',
      byte_size: 12,
      sha256: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      hash_binding: 'bytes' as const,
      created_at: '2024-01-01T00:00:00Z'
    },
    steps: [],
    policy_checks: [],
    signature: {
      algo: 'ed25519',
      public_key: 'test-public-key',
      signature: 'test-signature',
      key_id: 'test-key-id'
    }
  },

  tamperedPassport: {
    artifact: {
      name: 'test-document.txt',
      mime: 'text/plain',
      byte_size: 12,
      sha256: 'invalid-hash',
      hash_binding: 'bytes' as const,
      created_at: '2024-01-01T00:00:00Z'
    },
    steps: [],
    policy_checks: [],
    signature: {
      algo: 'ed25519',
      public_key: 'test-public-key',
      signature: 'test-signature',
      key_id: 'test-key-id'
    }
  },

  testFileContent: 'hello world!'
}

// Helper to wait for network requests
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle')
}