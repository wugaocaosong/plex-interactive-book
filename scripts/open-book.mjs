import { spawn } from 'node:child_process';
import { openSync, closeSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { get } from 'node:http';

const root = resolve(import.meta.dirname, '..');
const url = 'http://127.0.0.1:5192/';
function available() {
  return new Promise(resolve => {
    const req = get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(res.statusCode === 200 && body.includes('PLEX')));
      res.on('error', () => resolve(false));
    });
    req.setTimeout(1000, () => req.destroy());
    req.on('error', () => resolve(false));
  });
}
if (!existsSync(resolve(root, 'web/.vitepress/dist/index.html'))) {
  console.error('The built book is missing: ' + root);
  process.exit(1);
}
if (!await available()) {
  const out = openSync(resolve(root, 'preview-server.log'), 'a');
  const err = openSync(resolve(root, 'preview-server-error.log'), 'a');
  try {
    const child = spawn(process.execPath, [resolve(root, 'scripts/serve-dist.mjs'), '--port', '5192'], {
      cwd: root, detached: true, windowsHide: true, stdio: ['ignore', out, err],
    });
    child.on('error', error => console.error(error.message));
    child.unref();
  } finally { closeSync(out); closeSync(err); }
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await available()) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) {
    console.error('Could not start the book. See ' + resolve(root, 'preview-server-error.log'));
    process.exit(1);
  }
}
console.log('Book ready: ' + url);
if (!process.argv.includes('--check-only')) {
  const browser = spawn('cmd.exe', ['/d', '/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' });
  browser.on('error', error => console.error(error.message));
  browser.unref();
}
