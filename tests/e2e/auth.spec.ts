import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login with different user roles', async ({ page }) => {
    await page.goto('/auth/login')

    // Test owner login
    await page.fill('input[name="email"]', 'owner@demo.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome back')).toBeVisible()

    // Check that owner has access to all menu items
    await page.click('text=Menu')
    await expect(page.getByText('Menu Management')).toBeVisible()
    await expect(page.getByText('Add Menu Item')).toBeVisible()

    // Logout
    await page.click('button:has-text("Sign Out")')
    await expect(page).toHaveURL('/auth/login')
  })

  test('should restrict access based on user role', async ({ page }) => {
    await page.goto('/auth/login')

    // Test waiter login
    await page.fill('input[name="email"]', 'waiter@demo.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')

    // Waiter should not see Reports in sidebar
    await expect(page.getByText('Reports')).not.toBeVisible()

    // Waiter should not see Inventory in sidebar
    await expect(page.getByText('Inventory')).not.toBeVisible()

    // But should see POS
    await expect(page.getByText('POS')).toBeVisible()
  })

  test('should handle login errors gracefully', async ({ page }) => {
    await page.goto('/auth/login')

    // Test with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.getByText(/failed to sign in/i)).toBeVisible()
    await expect(page).toHaveURL('/auth/login')
  })

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/auth/login')

    // Test empty form submission
    await page.click('button[type="submit"]')

    // Should show validation errors
    await expect(page.getByText('Invalid email address')).toBeVisible()
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible()

    // Test invalid email format
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Invalid email address')).toBeVisible()

    // Test short password
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', '123')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/auth/login')

    const passwordInput = page.locator('input[name="password"]')
    const toggleButton = page.locator('button:has(svg)')

    await passwordInput.fill('testpassword')

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click toggle to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})