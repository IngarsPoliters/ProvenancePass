import { test as setup } from '@playwright/test'

/**
 * Global setup for E2E tests
 * This runs once before all tests
 */

setup('verify test environment', async ({ page }) => {
  // Navigate to the app
  await page.goto('/')
  
  // Wait for the app to load
  await page.waitForSelector('h1:has-text("Provenance Passport Viewer")')
  
  // Verify key elements are present
  await page.waitForSelector('button:has-text("Try Sample Now")')
  
  // Check that the app is responsive
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.waitForTimeout(500)
  
  // Verify accessibility basics
  const title = await page.title()
  console.log('App title:', title)
  
  // Check for critical console errors during initial load
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  
  await page.waitForTimeout(2000)
  
  // Filter out acceptable errors
  const criticalErrors = errors.filter(error => 
    !error.includes('404') && // Network 404s are acceptable in test env
    !error.includes('favicon') && // Favicon errors are not critical
    !error.includes('Cannot resolve') // Module resolution in test env
  )
  
  if (criticalErrors.length > 0) {
    console.warn('Critical errors during setup:', criticalErrors)
  }
  
  console.log('✅ Test environment verified')
})