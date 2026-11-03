import { test, expect } from '@playwright/test';

for (const width of [390, 820, 1440]) {
  test(`search popover navigation and unavailable model at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    // Deliberately unavailable network: verify fallback, not model accuracy.
    await page.route(/https:\/\/(huggingface\.co|cdn-lfs\.|cdn\.jsdelivr\.net)/, route => route.abort());
    await page.goto('/read/chapter_searching/binary_search');
    await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
    const input = page.getByRole('textbox', { name: '搜索全书内容', exact: true });
    await input.fill('链表');
    const results = page.locator('.smart-search-popover');
    await expect(results.locator('.smart-search-hit').first()).toBeVisible();
    const bounds = (await results.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await results.locator('.smart-search-hit').first().click();
    await expect(page.locator('.book-host .annotation-search:visible').first()).toBeVisible();
    await input.focus();
    await expect(results).toBeVisible();
    await results.getByRole('button', { name: '下一个', exact: true }).click();
    await expect(results).toHaveCount(0);
    await input.fill('先进先出');
    await results.getByRole('tab', { name: /AI 模糊查找/ }).click();
    await expect(results.locator('.smart-search-message[role=alert]')).toContainText('暂时不可用', { timeout: 60000 });
    await expect(results).toContainText('预设知识关联');
    await results.getByRole('tab', { name: /精确查找/ }).click();
    await input.fill('链表');
    await expect(results.locator('.smart-search-hit').first()).toBeVisible();
    await input.press('Escape');
    await expect(results).toHaveCount(0);
    await expect(page.getByRole('slider', { name: '拖动调整书籍宽度' })).toBeVisible();
  });
}
