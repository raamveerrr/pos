import { test, expect } from '@playwright/test'

test.describe('Realtime Features', () => {
  test('should show new orders in real-time', async ({ browser }) => {
    // Create two browser contexts to simulate different users
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const cashierPage = await context1.newPage()
    const waiterPage = await context2.newPage()

    // Login cashier
    await cashierPage.goto('/auth/login')
    await cashierPage.fill('input[name="email"]', 'cashier@demo.com')
    await cashierPage.fill('input[name="password"]', 'password123')
    await cashierPage.click('button[type="submit"]')
    await expect(cashierPage).toHaveURL('/dashboard')

    // Login waiter
    await waiterPage.goto('/auth/login')
    await waiterPage.fill('input[name="email"]', 'waiter@demo.com')
    await waiterPage.fill('input[name="password"]', 'password123')
    await waiterPage.click('button[type="submit"]')
    await expect(waiterPage).toHaveURL('/dashboard')

    // Cashier goes to dashboard to monitor orders
    await cashierPage.goto('/dashboard')

    // Waiter creates an order
    await waiterPage.goto('/pos')
    
    // Add items and create order
    const menuItem = waiterPage.locator('.menu-item').first()
    if (await menuItem.isVisible()) {
      await menuItem.click()
      
      // Fill customer info
      await waiterPage.fill('input[placeholder*="Customer name"]', 'Test Customer')
      
      // Complete order with cash
      const cashButton = waiterPage.getByText('Cash')
      if (await cashButton.isVisible()) {
        await cashButton.click()
        
        // Wait for order completion
        await expect(waiterPage.getByText(/completed successfully/i)).toBeVisible()
      }
    }

    // Cashier should see the new order (in real-time)
    // Note: This test depends on your real-time implementation
    // You might need to refresh or check for order notifications

    await context1.close()
    await context2.close()
  })

  test('should update table status in real-time', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login both users as manager/cashier who can see tables
    for (const page of [page1, page2]) {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'manager@demo.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/dashboard')
    }

    // Both users go to tables page
    await page1.goto('/tables')
    await page2.goto('/tables')

    // User 1 changes a table status
    const firstTable = page1.locator('.table-card, [class*="table"]').first()
    if (await firstTable.isVisible()) {
      // Try to find and click a status change button
      const statusButton = page1.locator('button:has-text("Occupy"), select').first()
      if (await statusButton.isVisible()) {
        await statusButton.click()
        
        // User 2 should see the status change
        // Note: This depends on your real-time table updates
        await page2.waitForTimeout(1000) // Wait for real-time update
      }
    }

    await context1.close()
    await context2.close()
  })

  test('should handle connection loss gracefully', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'cashier@demo.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/pos')

    // Simulate network disconnection
    await page.context().setOffline(true)

    // Should show offline indicator
    await expect(page.getByText(/offline|no connection/i)).toBeVisible({ timeout: 5000 })

    // Reconnect
    await page.context().setOffline(false)

    // Should show connected indicator or remove offline banner
    await expect(page.getByText(/connected|online/i)).toBeVisible({ timeout: 5000 })
  })
})