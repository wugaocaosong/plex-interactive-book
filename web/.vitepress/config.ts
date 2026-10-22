import { defineConfig } from 'vitepress'
export default defineConfig({
  title: '星轨编程 · PLEX',
  description: 'Python 与算法的探索之旅，一本可以动手探索的数字教材。',
  lang: 'zh-CN', cleanUrls: true, lastUpdated: false,
  srcExclude: ['public/**'],
  head: [['meta', { name: 'theme-color', content: '#131315' }], ['link', {rel:'icon',type:'image/svg+xml',href:'/favicon.svg'}]],
  vite: { server: { fs: { allow: ['..'] }, watch: { ignored: ['**/.vitepress/dist/**'] } }, optimizeDeps: { exclude: ['h5p-standalone'] } },
  ignoreDeadLinks: false
})
