const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('js/product-experience.js', 'utf8');
const css = fs.readFileSync('css/product-experience.css', 'utf8');
const loader = fs.readFileSync('js/route-feature-loader.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(runtime, /pdfPages\.replaceChildren\(renderedPages\)/,
  'the old PDF must remain visible until the sharp rerender is ready');
assert.match(runtime, /function previewPdfScale\(nextScale\)/,
  'zoom controls must resize the visible PDF immediately');
assert.match(runtime, /\},40\);/,
  'the sharp PDF rerender must start without the old 250ms lag');
assert.match(runtime, /Math\.max\.apply\(null,viewports\.map/,
  'Fit must account for every page size');
assert.match(runtime, /Math\.min\(availableWidth\/widest,availableHeight\/tallest\)/,
  'Fit must keep the complete page inside the viewport');
assert.match(css, /\.file-preview-pdf-status\{[^}]*position:absolute[^}]*clip-path:inset\(50%\)/,
  'render progress must remain accessible without moving or appearing beside controls');
assert.match(loader, /product-experience\.js\?v=453/,
  'the browser must receive the updated PDF preview runtime');
assert.match(index, /product-experience\.css\?v=6097/,
  'the browser must receive the stable toolbar layout');
assert.match(index, /route-feature-loader\.js\?v=6074/,
  'the browser must receive the loader with the new preview runtime');

console.log('File preview Fit stability contracts passed');
