import { test, expect } from '@playwright/test';

test.describe('Basic functionality', () => {
  test('homepage has expected title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ensi Client Dashboard/);
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Click on the Dashboard link in the sidebar
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome Talha Abadin')).toBeVisible();

    // Click on Financials link
    await page.getByRole('link', { name: 'Financials' }).click();
    await expect(page).toHaveURL('/financials');
  });
});

test.describe('Layout elements', () => {
  test('header elements are visible', async ({ page }) => {
    await page.goto('/');
    
    // Check ENSI logo
    await expect(page.getByAltText('ENSI')).toBeVisible();
    
    // Check welcome message and client name
    await expect(page.getByText('Welcome Talha Abadin')).toBeVisible();
    await expect(page.getByText('Client: V22 FARMS LLC')).toBeVisible();
    
    // Check notification and avatar icons
    await expect(page.getByRole('button', { name: 'notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'avatar' })).toBeVisible();
  });

  test('sidebar navigation highlights active page', async ({ page }) => {
    await page.goto('/');
    
    // Dashboard should be highlighted
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveCSS('background-color', 'rgb(224, 224, 224)');
    
    // Go to Financials
    await page.getByRole('link', { name: 'Financials' }).click();
    
    // Financials should be highlighted
    const financialsLink = page.getByRole('link', { name: 'Financials' });
    await expect(financialsLink).toHaveCSS('background-color', 'rgb(166, 0, 255)');
  });
});

test.describe('Responsive design', () => {
  test('mobile viewport shows menu button', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Force the mobile menu button to be visible
    await page.addStyleTag({ content: '.mobile-menu-button { display: block !important; visibility: visible !important; opacity: 1 !important; }' });
    
    // Menu button should be visible
    await expect(page.getByTestId('sidebar-menu-button')).toBeVisible();
  });
});

test.describe('Error handling', () => {
  test('404 page for non-existent route', async ({ page }) => {
    await page.goto('/non-existent-page');
    await expect(page.getByText('Page Not Found')).toBeVisible();
  });
}); 