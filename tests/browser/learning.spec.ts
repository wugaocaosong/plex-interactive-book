import {test,expect} from '@playwright/test'

test('study mode, annotations, settings and persisted drafts share the reader',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/read/chapter_searching/binary_search');await expect(page.locator('.book-holder')).not.toHaveClass(/loading/)
 await page.getByRole('button',{name:'切换阅读模式'}).click();await expect(page.getByLabel('连续正文')).toBeVisible()
 await page.locator('.study-article').first().locator('p[data-block]').first().evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);getSelection()!.removeAllRanges();getSelection()!.addRange(range);el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))})
 await page.getByLabel('批注内容').fill('这里记录二分查找的有序前提');await page.getByRole('button',{name:'保存批注',exact:true}).click()
 await page.getByRole('button',{name:'学习笔记',exact:true}).click();await expect(page.getByLabel('编辑笔记')).toHaveValue('这里记录二分查找的有序前提');await page.getByRole('button',{name:'关闭',exact:true}).click()
 await page.locator('.study-article').first().getByRole('button',{name:'查看 / 运行'}).first().click()
 await expect(page.locator('.study-panel')).toBeVisible();await expect(page.getByLabel('完整示例代码')).toContainText('binary_search')
 await page.getByLabel('完整示例代码').fill('print("持久草稿")');await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.getByLabel('运行结果')).toContainText('持久草稿',{timeout:90000})
 await page.getByRole('button',{name:'关闭',exact:true}).click();await page.reload();await expect(page.getByLabel('连续正文')).toBeVisible()
 await page.locator('.study-article').first().getByRole('button',{name:'查看 / 运行'}).first().click();await expect(page.getByLabel('完整示例代码')).toContainText('持久草稿');await page.getByRole('button',{name:'关闭',exact:true}).click()
 await page.getByRole('button',{name:'切换阅读模式'}).click();await expect(page.locator('.book-holder')).toBeVisible();expect(errors).toEqual([])
})
