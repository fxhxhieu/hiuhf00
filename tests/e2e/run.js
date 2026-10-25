/* Chạy các bộ kiểm thử trình duyệt (tests/e2e/suites) trên ứng dụng thật.
 *
 *   cd tests/e2e && npm install        (chỉ cần puppeteer-core, không tải trình duyệt)
 *   node tests/e2e/run.js [tên-bộ...]
 *
 * Cần Chrome hoặc Edge. Tự tìm trình duyệt ở các đường dẫn phổ biến; hoặc đặt biến CHROME_PATH.
 * Mỗi bộ chạy trong một ngữ cảnh trình duyệt sạch (localStorage trống). Máy chủ thử mô phỏng GitHub Pages
 * (Cache-Control: max-age=600). Biến E2E_REDUCED=1 chạy với "giảm chuyển động" của hệ điều hành. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SUITES = path.join(__dirname, 'suites');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };

function findBrowser() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
  return c.find((p) => p && fs.existsSync(p));
}

function startServer() {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__e2e.html') {
      const name = u.searchParams.get('suite');
      res.setHeader('Content-Type', TYPES['.html']);
      return res.end(index.replace('</body>', `<script src="/__suite/${name}.js"></script></body>`));
    }
    const isSuite = u.pathname.startsWith('/__suite/');
    const file = isSuite ? path.join(SUITES, path.basename(u.pathname)) : path.join(ROOT, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!isSuite && (!file.startsWith(ROOT) || file.startsWith(path.join(ROOT, 'tests')))) { res.statusCode = 403; return res.end('403'); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('404'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'max-age=600');
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  let puppeteer;
  try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('Thiếu puppeteer-core. Chạy: cd tests/e2e && npm install'); process.exit(2); }
  const exe = findBrowser();
  if (!exe) { console.error('Không tìm thấy Chrome hoặc Edge. Hãy đặt biến CHROME_PATH.'); process.exit(2); }
  const want = process.argv.slice(2);
  const suites = fs.readdirSync(SUITES).filter((f) => f.endsWith('.js') && (!want.length || want.some((w) => f.indexOf(w) >= 0))).map((f) => f.replace(/\.js$/, ''));
  const server = await startServer();
  const port = server.address().port;
  const args = ['--no-first-run', '--disable-gpu'];
  if (!process.env.E2E_REDUCED) args.push('--force-prefers-no-reduced-motion');
  if (process.env.CI) args.push('--no-sandbox');
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args });
  let pass = 0, fail = 0, errs = 0;
  for (const name of suites) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 480, height: 900 });
    await page.goto(`http://127.0.0.1:${port}/__e2e.html?suite=${name}`, { waitUntil: 'load' });
    let out = null;
    try {
      await page.waitForFunction(() => document.title === 'DONE', { timeout: 180000, polling: 250 });
      out = await page.evaluate(() => JSON.parse(document.getElementById('out').textContent));
    } catch (e) { out = { checks: [['FAIL', 'bộ kiểm thử không chạy xong', e.message]], errors: [] }; }
    const bad = out.checks.filter((c) => c[0] !== 'PASS');
    pass += out.checks.length - bad.length; fail += bad.length; errs += out.errors.length;
    console.log(`${bad.length || out.errors.length ? '✗' : '✓'} ${name}: ${out.checks.length - bad.length}/${out.checks.length} đạt${out.errors.length ? `, ${out.errors.length} lỗi JS` : ''}`);
    bad.forEach((c) => console.log('    FAIL', c[1], c[2] ? '-> ' + c[2] : ''));
    out.errors.forEach((e) => console.log('    LỖI', e));
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`\nTổng: ${pass} đạt, ${fail} lỗi kiểm tra, ${errs} lỗi JS`);
  process.exit(fail || errs ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
