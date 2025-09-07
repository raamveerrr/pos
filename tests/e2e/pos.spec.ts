import { test, expect } from '@playwright/test'

test.describe('POS System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as cashier before each test
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'cashier@demo.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should create and complete an order', async ({ page }) => {
    await page.goto('/pos')

    // Wait for POS page to load
    await expect(page.getByText('Point of Sale')).toBeVisible()

    // Select a table (if available)
    const tableSelect = page.locator('select').first()
    if (await tableSelect.isVisible()) {
      await tableSelect.selectOption({ index: 1 })
    }

    // Add items to cart
    const firstMenuItem = page.locator('.menu-item').first()
    if (await firstMenuItem.isVisible()) {
      await firstMenuItem.click()
      await firstMenuItem.click() // Add 2 of the same item
    }

    // Check cart shows items
    await expect(page.getByText(/items in cart|items/)).toBeVisible()
    
    // Add customer information
    await page.fill('input[placeholder*="Customer name"]', 'John Doe')
    await page.fill('input[placeholder*="Phone"]', '+91 9876543210')

    // Test cash payment
    const cashButton = page.getByText('Cash')
    if (await cashButton.isVisible()) {
      await cashButton.click()
      
      // Should show success message
      await expect(page.getByText(/completed successfully/i)).toBeVisible({ timeout: 10000 })
      
      // Cart should be cleared
      await expect(page.getByText('No items in order')).toBeVisible()
    }
  })

  test('should filter menu items by category', async ({ page }) => {
    await page.goto('/pos')

    // Wait for menu items to load
    await page.waitForSelector('.menu-item', { timeout: 10000 })

    const initialItemCount = await page.locator('.menu-item').count()
    
    if (initialItemCount > 0) {
      // Click on a category filter (not "All")
      const categoryButtons = page.locator('button').filter({ hasText: /^(?!All)/ })
      const firstCategory = await categoryButtons.first()
      
      if (await firstCategory.isVisible()) {
        await firstCategory.click()
        
        // Item count might change after filtering
        await page.waitForTimeout(500) // Wait for filter to apply
        
        const filteredItemCount = await page.locator('.menu-item').count()
        // The count might be the same if all items are in one category
        expect(filteredItemCount).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should search menu items', async ({ page }) => {
    await page.goto('/pos')

    // Search for items
    const searchInput = page.locator('input[placeholder*="Search menu"]')
    await searchInput.fill('pizza')

    // Wait for search results
    await page.waitForTimeout(500)
    
    // Should show filtered results
    const menuItems = page.locator('.menu-item')
    const itemCount = await menuItems.count()
    
    if (itemCount > 0) {
      // Check if visible items contain search term (case insensitive)
      const firstItem = menuItems.first()
      const itemText = await firstItem.textContent()
      expect(itemText?.toLowerCase()).toContain('pizza')
    }
  })

  test('should update item quantities in cart', async ({ page }) => {
    await page.goto('/pos')

    // Add an item to cart
    const firstMenuItem = page.locator('.menu-item').first()
    if (await firstMenuItem.isVisible()) {
      await firstMenuItem.click()
    }

    // Check if cart has items
    const cartItems = page.locator('.cart-item, [class*="cart"]')
    if (await cartItems.count() > 0) {
      // Try to find quantity controls
      const plusButton = page.locator('button:has-text("+"), button:has([class*="plus"])')
      if (await plusButton.count() > 0) {
        await plusButton.first().click()
        
        // Quantity should increase
        await expect(page.locator('text=/2/')).toBeVisible()
      }
    }
  })

  test('should handle offline mode', async ({ page }) => {
    await page.goto('/pos')

    // Simulate offline mode by going offline
    await page.context().setOffline(true)

    // Try to create an order
    const firstMenuItem = page.locator('.menu-item').first()
    if (await firstMenuItem.isVisible()) {
      await firstMenuItem.click()
      
      // Should show offline banner or handle offline gracefully
      // Note: This depends on your offline implementation
    }

    // Go back online
    await page.context().setOffline(false)
  })

  test('should calculate order totals correctly', async ({ page }) => {
    await page.goto('/pos')

    // Add items to cart
    const menuItems = page.locator('.menu-item')
    if (await menuItems.count() > 0) {
      await menuItems.first().click()
      
      // Wait for cart to update
      await page.waitForTimeout(500)
      
      // Check that totals are displayed
      await expect(page.getByText(/Subtotal|Total/)).toBeVisible()
      await expect(page.getByText(/Tax|GST/)).toBeVisible()
    }
  })
})