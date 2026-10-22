import { test, expect, type Page } from '@playwright/test'

async function ready(page: Page) {
  await expect(page.locator('.book-host .book-leaf').first()).toBeAttached()
  await expect(page.locator('.book-holder')).not.toHaveClass(/loading/)
}
async function edge(page: Page, direction: 'next'|'previous') {
  const box = (await page.locator('.book-host').boundingBox())!
  const x = direction === 'next' ? box.x + box.width - 8 : box.x + 8
  const y = box.y + box.height - 45
  await page.mouse.move(x, y)
  await page.mouse.down()
  return { x, y, box }
}

for (const width of [1440, 820, 390]) {
  test(`mouse folds, completes, reverses and cancels pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height:1000 })
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
    await page.goto('/read/chapter_searching/binary_search');await ready(page)
    const number = page.locator('.page-navigation>span')
    const initial = await number.textContent()
    const start = await edge(page,'next')
    await page.mouse.move(start.x - 110,start.y - 25,{ steps:12 })
    await expect(page.locator('.book-host')).toHaveClass(/is-dragging/)
    await expect.poll(()=>page.locator('.book-host .stf__item').evaluateAll(nodes=>nodes.some(node=>/rotate/.test((node as HTMLElement).style.transform)))).toBe(true)
    await page.screenshot({path:`output/playwright/drag-fold-${width}.png`})
    // Return to the same edge: the sheet must settle back without changing location.
    await page.mouse.move(start.x - 9,start.y,{steps:8});await page.mouse.up()
    await page.waitForTimeout(600);await expect(number).toHaveText(initial!)

    const forward = await edge(page,'next')
    await page.mouse.move(forward.box.x - 15,forward.y - 20,{steps:25});await page.mouse.up()
    await expect(number).not.toHaveText(initial!)
    await page.waitForTimeout(600)
    const back = await edge(page,'previous')
    await page.mouse.move(back.box.x + back.box.width + 15,back.y - 20,{steps:25});await page.mouse.up()
    await expect(number).toHaveText(initial!)
    await page.waitForTimeout(600)

    const cancel = await edge(page,'next')
    await page.mouse.move(cancel.box.x - 15,cancel.y - 20,{steps:25})
    await page.keyboard.press('Escape');await page.mouse.up()
    await page.waitForTimeout(600);await expect(number).toHaveText(initial!)
    await expect(page.locator('.book-host')).not.toHaveClass(/is-dragging/)
    // Body text still uses the browser's native selection, never a page turn.
    const paragraph = page.locator('.book-host .book-leaf:visible p').first()
    const p = (await paragraph.boundingBox())!
    await page.mouse.move(p.x+5,p.y+12);await page.mouse.down()
    await page.mouse.move(p.x+Math.min(190,p.width-10),p.y+12,{steps:10});await page.mouse.up()
    expect(await page.evaluate(()=>getSelection()?.toString().length)).toBeGreaterThan(0)
    await expect(number).toHaveText(initial!)
    expect(errors).toEqual([])
  })
}

test('cover drag opens only one section and edge drag crosses section boundaries',async({page})=>{
  await page.goto('/')
  const cover=page.locator('.cover-book');await expect(cover).toBeVisible()
  const box=(await cover.boundingBox())!
  await page.mouse.move(box.x+box.width-20,box.y+box.height*.6);await page.mouse.down()
  await page.mouse.move(box.x+box.width*.2,box.y+box.height*.6,{steps:20});await page.mouse.up()
  await ready(page);await expect(page.locator('.section-heading h1')).toHaveText('扉页')
  const initial=await page.locator('.reader').getAttribute('data-section')
  const drag=await edge(page,'next')
  await page.mouse.move(drag.box.x-15,drag.y,{steps:25});await page.mouse.up()
  await expect(page.locator('.reader')).not.toHaveAttribute('data-section',initial!)
  await ready(page);await expect(page.locator('.section-heading h1')).toHaveText('版权与来源')
  const back=await edge(page,'previous')
  await page.mouse.move(back.box.x+back.box.width+15,back.y,{steps:25});await page.mouse.up()
  await expect(page.locator('.reader')).toHaveAttribute('data-section',initial!)
})

test('reduced motion supports drag and paper interactions still open their panels',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/read/chapter_searching/binary_search');await ready(page)
  const before=await page.locator('.page-navigation>span').textContent()
  const drag=await edge(page,'next')
  await page.mouse.move(drag.box.x-15,drag.y,{steps:20});await page.mouse.up()
  await expect(page.locator('.page-navigation>span')).not.toHaveText(before!)
  const block=await page.locator('.source-stage .code-example').first().getAttribute('data-block')
  await page.evaluate(hash=>{location.hash=hash!},block)
  await page.locator('.book-host').getByRole('button',{name:'查看 / 运行'}).filter({visible:true}).first().click()
  await expect(page.getByRole('dialog',{name:'代码实验室'})).toBeVisible()
  await expect(page.locator('.book-host')).not.toHaveClass(/is-dragging/)
})
