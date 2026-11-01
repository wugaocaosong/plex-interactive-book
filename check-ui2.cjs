const { chromium } = require('playwright-core')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\lenovo\\.agent-browser\\browsers\\chrome-156.0.8078.47\\chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const fs = require('fs')
  const log = []
  const write = () => fs.writeFileSync('E:\\数字教材\\.probe_check2.txt', log.join('\n'), 'utf8')
  for (const route of ['chapter_sorting/sorting_algorithm', 'chapter_searching/binary_search']) {
    try {
      await page.goto('http://127.0.0.1:5190/read/' + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      log.push('== ' + route)
      log.push('adventure=' + (await page.locator('.adventure-card').count()))
      const t = page.locator('.adventure-card h2').first()
      if (await t.count()) log.push('title=' + (await t.innerText()))
    } catch (e) {
      log.push('== ' + route + ' ERROR ' + e.message.slice(0, 120))
    }
    write()
  }
  await browser.close()
  write()
})().catch((e) => {
  require('fs').writeFileSync('E:\\数字教材\\.probe_check2.txt', 'FATAL ' + e.message, 'utf8')
})
