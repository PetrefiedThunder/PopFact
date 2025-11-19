/**
 * Performance Testing Utilities for PopFact
 * 
 * Ensures the overlay doesn't slow down the host page
 */

import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  timeToFirstPaint: number;
  overlayLoadTime: number;
  domContentLoaded: number;
  totalLoadTime: number;
}

/**
 * Measure time to first paint of the PopFact overlay
 */
export async function measureOverlayFirstPaint(page: Page): Promise<number> {
  // Get navigation timing
  const timing = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      // Wait for overlay to appear
      const checkOverlay = () => {
        const overlay = document.getElementById('popfact-overlay');
        if (overlay) {
          const now = performance.now();
          resolve(now);
        } else {
          requestAnimationFrame(checkOverlay);
        }
      };
      checkOverlay();
    });
  });
  
  return timing;
}

/**
 * Measure complete page load performance metrics
 */
export async function measurePagePerformance(page: Page): Promise<PerformanceMetrics> {
  // Wait for load event
  await page.waitForLoadState('load');
  
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const overlayElement = document.getElementById('popfact-overlay');
    
    // Get time when overlay was created
    let overlayTime = 0;
    if (overlayElement) {
      const overlayMark = performance.getEntriesByName('popfact-overlay-created')[0];
      overlayTime = overlayMark ? overlayMark.startTime : performance.now();
    }
    
    return {
      timeToFirstPaint: perfData.responseStart - perfData.fetchStart,
      overlayLoadTime: overlayTime,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      totalLoadTime: perfData.loadEventEnd - perfData.fetchStart,
    };
  });
  
  return metrics;
}

/**
 * Check if overlay loads within acceptable time threshold
 */
export async function checkOverlayPerformance(
  page: Page, 
  maxTimeMs: number = 200
): Promise<{ passed: boolean; actualTime: number }> {
  const startTime = Date.now();
  
  try {
    await page.waitForSelector('#popfact-overlay', { timeout: maxTimeMs });
    const actualTime = Date.now() - startTime;
    
    return {
      passed: actualTime <= maxTimeMs,
      actualTime,
    };
  } catch (error) {
    return {
      passed: false,
      actualTime: Date.now() - startTime,
    };
  }
}

/**
 * Measure ticker animation performance (FPS)
 */
export async function measureTickerFPS(page: Page, durationMs: number = 2000): Promise<number> {
  const fps = await page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      function countFrame() {
        frameCount++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const fps = (frameCount / elapsed) * 1000;
          resolve(fps);
        }
      }
      
      requestAnimationFrame(countFrame);
    });
  }, durationMs);
  
  return fps;
}

/**
 * Check memory usage impact of the extension
 */
export async function measureMemoryImpact(page: Page): Promise<{
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}> {
  const memory = await page.evaluate(() => {
    const perf = performance as any;
    if (perf.memory) {
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      };
    }
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };
  });
  
  return memory;
}
