import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const manifest=JSON.parse(readFileSync('web/public/book/manifest.json','utf8'))
for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1440,height:1000}]){
  test(`all book sections preserve content and fit at ${viewport.width}px`,async({page})=>{
    test.setTimeout(600000)
    await page.setViewportSize(viewport)
    await page.goto('/read/title')
    const report:any[]=[];const errors:string[]=[]
    page.on('pageerror',error=>errors.push(error.message))
    for(const section of manifest.pages.filter((s:any)=>s.kind!=='cover'&&s.id!=='contents')){
      await page.evaluate(route=>{const link=document.createElement('a');link.href=route;document.body.append(link);link.click();link.remove()},section.route)
      await expect(page.locator('.reader')).toHaveAttribute('data-section',section.id)
      await expect(page.locator('.book-holder')).not.toHaveClass(/loading/)
      await expect(page.locator('.reader-error')).toHaveCount(0)
      const result=await page.evaluate(()=>{
        const source=document.querySelector('.source-stage')!
        const leaves=[...document.querySelectorAll<HTMLElement>('.book-host .leaf-content')]
        const normalize=(value:string|null)=>value?.replace(/\s+/g,'')||''
        const missing:string[]=[]
        for(const block of [...source.children] as HTMLElement[]){
          const id=block.dataset.block
          const copies=leaves.flatMap(leaf=>[...leaf.children] as HTMLElement[]).filter(node=>node.dataset.block===id)
          if(!copies.length){missing.push(`${id}: missing`);continue}
          if(copies.some(copy=>copy.classList.contains('expanded-block')))continue
          if(normalize(copies.map(copy=>copy.textContent).join(''))!==normalize(block.textContent))missing.push(`${id}: text differs`)
        }
        return {leaves:leaves.length,missing,orphanHeadings:leaves.slice(0,-1).filter(leaf=>/^H[1-6]$/.test(leaf.lastElementChild?.tagName||'')).map(leaf=>leaf.lastElementChild?.textContent),overflow:leaves.filter(leaf=>leaf.scrollHeight>leaf.clientHeight+2||leaf.scrollWidth>leaf.clientWidth+2).map(leaf=>({height:leaf.clientHeight,scroll:leaf.scrollHeight,width:leaf.clientWidth,scrollWidth:leaf.scrollWidth,block:leaf.firstElementChild?.getAttribute('data-block')})),brokenImages:[...source.querySelectorAll('img')].filter(img=>!img.naturalWidth).map(img=>img.src),mathErrors:source.querySelectorAll('.katex-error').length}
      })
      report.push({id:section.id,...result})
    }
    mkdirSync('output/validation',{recursive:true})
    writeFileSync(`output/validation/pagination-${viewport.width}.json`,JSON.stringify(report,null,2))
    expect(report.filter(r=>r.missing.length||r.orphanHeadings.length||r.overflow.length||r.brokenImages.length||r.mathErrors)).toEqual([])
    expect(errors).toEqual([])
    console.log(`Audited ${report.length} sections / ${report.reduce((n,r)=>n+r.leaves,0)} leaves at ${viewport.width}px`)
  })
}
