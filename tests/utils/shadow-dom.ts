/**
 * Shadow DOM Testing Utilities for PopFact
 * 
 * Standard selectors cannot pierce the Shadow DOM.
 * These utilities provide robust ways to interact with our overlay.
 */

import { Page, Locator } from '@playwright/test';

/**
 * Get the PopFact overlay element
 * Note: The overlay is injected directly into the page DOM, not in a shadow root
 */
export function getOverlay(page: Page): Locator {
  return page.locator('#popfact-overlay');
}

/**
 * Get the ticker scroll container
 */
export function getTickerScroll(page: Page): Locator {
  return page.locator('#popfact-ticker-scroll');
}

/**
 * Get the toggle button
 */
export function getToggleButton(page: Page): Locator {
  return page.locator('#popfact-toggle');
}

/**
 * Get all fact check items in the ticker
 */
export function getFactItems(page: Page): Locator {
  return page.locator('.popfact-item');
}

/**
 * Get fact items by verdict category
 */
export function getFactItemsByCategory(page: Page, category: 'true' | 'false' | 'mixed' | 'unverified'): Locator {
  return page.locator(`.popfact-item.${category}`);
}

/**
 * Get the status indicator
 */
export function getStatusIndicator(page: Page): Locator {
  return page.locator('.popfact-status');
}

/**
 * Wait for the overlay to be visible
 */
export async function waitForOverlay(page: Page, timeout: number = 5000): Promise<void> {
  await getOverlay(page).waitFor({ state: 'visible', timeout });
}

/**
 * Wait for a fact check item to appear in the ticker
 */
export async function waitForFactItem(
  page: Page, 
  category?: 'true' | 'false' | 'mixed' | 'unverified',
  timeout: number = 10000
): Promise<void> {
  if (category) {
    await getFactItemsByCategory(page, category).first().waitFor({ state: 'visible', timeout });
  } else {
    await getFactItems(page).first().waitFor({ state: 'visible', timeout });
  }
}

/**
 * Check if overlay is hidden (toggled off)
 */
export async function isOverlayHidden(page: Page): Promise<boolean> {
  const overlay = getOverlay(page);
  const className = await overlay.getAttribute('class');
  return className?.includes('hidden') ?? false;
}

/**
 * Toggle the overlay visibility
 */
export async function toggleOverlay(page: Page): Promise<void> {
  const button = getToggleButton(page);
  await button.click();
}

/**
 * Get text content from a fact item
 */
export async function getFactItemText(item: Locator): Promise<{
  claim: string;
  verdict: string;
  icon: string;
}> {
  const claim = await item.locator('.popfact-claim').textContent() ?? '';
  const verdict = await item.locator('.popfact-verdict').textContent() ?? '';
  const icon = await item.locator('.popfact-item-icon').textContent() ?? '';
  
  return { claim, verdict, icon };
}

/**
 * Wait for loading message to disappear
 */
export async function waitForLoadingToComplete(page: Page, timeout: number = 5000): Promise<void> {
  const loading = page.locator('.popfact-loading');
  await loading.waitFor({ state: 'detached', timeout }).catch(() => {
    // Loading might already be gone, that's ok
  });
}
