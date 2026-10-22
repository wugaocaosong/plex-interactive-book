import { defineConfig } from '@playwright/test'
const port=Number(process.env.PLEX_TEST_PORT||5190)
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PLEX_TEST_PORT must be an integer from 1024 to 65535')
const baseURL=`http://127.0.0.1:${port}`
const mode=process.env.PLEX_TEST_PREVIEW==='1'?'preview':'dev'
export default defineConfig({
 testDir: './tests/browser', timeout: 120000, expect: {timeout:15000}, workers:1,
 use: {baseURL,headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE},viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:`npm run ${mode} -- --port ${port}`,url:baseURL,reuseExistingServer:!process.env.CI&&process.env.PLEX_TEST_REUSE!=='0',timeout:120000}
})
