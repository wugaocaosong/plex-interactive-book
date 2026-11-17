import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStaticServer } from './serve-dist.mjs';
const root = resolve(import.meta.dirname, '..', 'web/.vitepress/dist');
if (!existsSync(resolve(root, 'index.html'))) {
  console.error('Build missing. Run npm run build in the book folder.');
  process.exit(1);
}
let server;
let port;
for (let candidate = 5192; candidate <= 5199; candidate++) {
  const attempt = createStaticServer(root);
  try {
    await new Promise((resolve, reject) => {
      attempt.once('error', reject);
      attempt.listen(candidate, '127.0.0.1', resolve);
    });
    server = attempt; port = candidate; break;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') {
      console.error('Could not start preview:', error.message);
      process.exit(1);
    }
    console.log(`Port ${candidate} is occupied; trying the next port.`);
  }
}
if (!server) {
  console.error('Ports 5192-5199 are occupied. Close an older preview and retry.');
  process.exit(1);
}
const url = `http://127.0.0.1:${port}/read/chapter_searching/`;
console.log(`\nBook ready: ${url}\nKeep this window open while reading. Press Ctrl+C to stop.\n`);
server.on('error', error => console.error('Preview error:', error.message));
if (!process.argv.includes('--check-only')) {
  const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide: true, stdio: 'ignore' });
  browser.on('error', error => console.error('Open the address above in your browser:', error.message));
  browser.unref();
}
