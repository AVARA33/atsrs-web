const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'app-copper-theme-v6243.css'), 'utf8');
const greenCss = fs.readFileSync(path.join(root, 'css', 'dark-green-text-standard-v58140.css'), 'utf8');

test('V6260 keeps the expanded vacancy company heading in copper', () => {
  assert.match(html, /data-atsrs-build="V6265"/);
  assert.match(html, /app-copper-theme-v6243\.css\?v=6264/);
  assert.match(html, /dark-green-text-standard-v58140\.css\?v=6258/);
  assert.match(css, /\.job-detail-dialog \.job-detail-kicker[\s\S]*?color:#C06D45!important[\s\S]*?-webkit-text-fill-color:#C06D45!important/);
  assert.doesNotMatch(greenCss, /\.job-detail-kicker/);
});
