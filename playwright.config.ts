import { defineConfig } from '@playwright/test'
export default defineConfig({
 testDir: './tests/browser', timeout: 120000, expect: {timeout:15000}, workers:1,
 use: {baseURL:'http://127.0.0.1:5190',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE},viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run dev',url:'http://127.0.0.1:5190',reuseExistingServer:true,timeout:120000}
})
