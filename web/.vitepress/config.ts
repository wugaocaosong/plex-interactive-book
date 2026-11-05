import { defineConfig } from 'vitepress'
const apiTarget = process.env.PLEX_API_TARGET ?? 'http://127.0.0.1:5100'
const proxy = apiTarget && apiTarget !== 'off' ? {'/api': {target:apiTarget,changeOrigin:true}} : undefined
export default defineConfig({
  title: '星轨编程 · PLEX',
  description: 'Python 与算法的探索之旅，一本可以动手探索的数字教材。',
  lang: 'zh-CN', cleanUrls: true, lastUpdated: false,
  srcExclude: ['public/**'],
  head: [['meta', { name: 'theme-color', content: '#131315' }], ['link', {rel:'icon',type:'image/svg+xml',href:'/favicon.svg'}]],
  vite: { cacheDir: '.vitepress/cache/vite', server: { proxy, fs: { allow: ['..'] }, watch: { ignored: ['**/.vitepress/dist/**'] } }, preview:{proxy}, optimizeDeps: { include: ['@huggingface/transformers', '@orama/orama'], exclude: ['h5p-standalone'] } },
  ignoreDeadLinks: false
})
