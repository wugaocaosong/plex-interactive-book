const { chromium } = require('playwright-core')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\lenovo\\.agent-browser\\browsers\\chrome-156.0.8078.47\\chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const log = []
  page.on('console', (m) => { if (m.type() === 'error') log.push('CONSOLE_ERR ' + m.text().slice(0, 200)) })
  await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const card = await page.locator('.adventure-card').first()
  log.push('adventure_card=' + (await card.count()))
  if (await card.count()) {
    log.push('card_text=' + (await card.innerText()).replace(/\n/g, ' | ').slice(0, 160))
  }
  const btn = page.locator('.adventure-start').first()
  log.push('adventure_btn=' + (await btn.count()))

  const term = page.locator('.glossary-term').first()
  log.push('terms=' + (await page.locator('.glossary-term').count()))
  if (await term.count()) {
    log.push('first_term=' + (await term.innerText()))
    await term.hover()
    await page.waitForTimeout(700)
    const tip = page.locator('.term-tip').first()
    log.push('term_tip=' + (await tip.count()))
    if (await tip.count()) log.push('tip_text=' + (await tip.innerText()).replace(/\n/g, ' | ').slice(0, 200))
  }
  await page.screenshot({ path: 'E:\\数字教材\\.shot_graph.png', fullPage: false })
  require('fs').writeFileSync('E:\\数字教材\\.probe_check.txt', log.join('\n'), 'utf8')
  await browser.close()
})().catch((e) => {
  require('fs').writeFileSync('E:\\数字教材\\.probe_check.txt', 'FATAL ' + e.message, 'utf8')
})
