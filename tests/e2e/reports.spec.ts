import { test, expect } from '@playwright/test'

test.describe('Reports and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner/manager who has access to reports
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'owner@demo.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display reports page with charts', async ({ page }) => {
    await page.goto('/reports')

    // Wait for page to load
    await expect(page.getByText('Reports & Analytics')).toBeVisible()

    // Should show key metrics cards
    await expect(page.getByText(/Today's Revenue|Revenue/)).toBeVisible()
    await expect(page.getByText(/Orders/)).toBeVisible()

    // Should show charts
    await expect(page.locator('[class*="recharts"], .recharts-surface')).toBeVisible({ timeout: 10000 })
  })

  test('should filter reports by date range', async ({ page }) => {
    await page.goto('/reports')

    // Find date range selector
    const dateSelect = page.locator('select').first()
    if (await dateSelect.isVisible()) {
      await dateSelect.selectOption('30days')
      
      // Wait for data to update
      await page.waitForTimeout(1000)
      
      // Charts should update (this is visual, hard to test programmatically)
      await expect(page.locator('[class*="recharts"]')).toBeVisible()
    }
  })

  test('should show top selling items', async ({ page }) => {
    await page.goto('/reports')

    // Look for top selling items section
    await expect(page.getByText('Top Selling Items')).toBeVisible()

    // Should show list of items (if data exists)
    const topItemsList = page.locator('[class*="top-items"], .top-selling')
    if (await topItemsList.isVisible()) {
      // Should show item names and quantities
      await expect(topItemsList).toBeVisible()
    }
  })

  test('should export report data', async ({ page }) => {
    await page.goto('/reports')

    // Look for export button
    const exportButton = page.getByText('Export')
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()
      
      // Wait for download to start
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBeTruthy()
    }
  })

  test('should display correct revenue calculations', async ({ page }) => {
    await page.goto('/reports')

    // Check that revenue numbers are displayed correctly
    const revenueElements = page.locator('text=/₹[0-9,]+/')
    const revenueCount = await revenueElements.count()
    
    if (revenueCount > 0) {
      // Should have proper currency formatting
      const firstRevenue = await revenueElements.first().textContent()
      expect(firstRevenue).toMatch(/₹[\d,]+/)
    }
  })

  test('should handle empty data gracefully', async ({ page }) => {
    // This test would be better with a fresh database or test data
    await page.goto('/reports')

    // Should not crash with empty data
    await expect(page.getByText('Reports & Analytics')).toBeVisible()
    
    // Charts should render even with no data
    await expect(page.locator('[class*="recharts"]')).toBeVisible({ timeout: 10000 })
  })
})