import { test,expect } from '@playwright/test'

test('failed Python initialization offers a working retry without blocking reading',async({page,context})=>{
  await page.goto('/read/chapter_searching/binary_search')
  await expect(page.locator('.book-holder')).not.toHaveClass(/loading/)
  const block=await page.locator('.source-stage .code-example').first().getAttribute('data-block')
  await page.evaluate(hash=>location.hash=hash!,block)
  await page.locator('.book-host').getByRole('button',{name:'查看 / 运行'}).filter({visible:true}).first().click()
  await context.route('**/vendor/pyodide/pyodide.mjs',route=>route.abort())
  await page.getByRole('button',{name:'运行 Python',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('Python 初始化失败',{timeout:20000})
  await context.unroute('**/vendor/pyodide/pyodide.mjs')
  await page.getByRole('button',{name:'运行 Python',exact:true}).click()
  await expect(page.getByLabel('运行结果')).toContainText('索引 =  2',{timeout:90000})
  await page.getByRole('button',{name:'关闭',exact:true}).click()
  await page.getByRole('button',{name:'下一页',exact:true}).click()
  await expect(page.locator('.reader-error')).toHaveCount(0)
})
