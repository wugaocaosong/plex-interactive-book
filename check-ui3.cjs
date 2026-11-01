const { chromium } = require('playwright-core')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\lenovo\\.agent-browser\\browsers\\chrome-156.0.8078.47\\chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const fs = require('fs')
  const log = []
  await page.goto('http://127.0.0.1:5190/read/chapter_sorting/sorting_algorithm', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  log.push('stage_cards=' + (await page.locator('.book-host .adventure-card').count()))
  log.push('measure_cards=' + (await page.locator('.measurement-area .adventure-card').count()))
  log.push('visible_cards=' + (await page.locator('.adventure-card:visible').count()))
  await page.screenshot({ path: 'E:\\数字教材\\.shot_sorting.png' })
  fs.writeFileSync('E:\\数字教材\\.probe_check3.txt', log.join('\n'), 'utf8')
  await browser.close()
})().catch((e) => {
  require('fs').writeFileSync('E:\\数字教材\\.probe_check3.txt', 'FATAL ' + e.message, 'utf8')
})
