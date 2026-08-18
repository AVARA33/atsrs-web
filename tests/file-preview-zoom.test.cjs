const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const runtimePath = path.join(root, 'js', 'product-experience.js');
const runtime = fs.readFileSync(runtimePath, 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routeLoader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');

const instrumented = runtime.replace(
  /\}\)\(\);\s*$/,
  'globalThis.__atsrsZoomTest={fitZoomScale:fitZoomScale,steppedZoomScale:steppedZoomScale,scaleToZoomPercent:scaleToZoomPercent};})();'
);

assert.notEqual(instrumented, runtime, 'preview runtime should be instrumentable for focused zoom tests');

const sandbox = {
  console,
  document: {
    activeElement: null,
    body: { classList: { add() {}, remove() {} } },
    getElementById() { return null; },
    addEventListener() {},
  },
  window: { addEventListener() {} },
  requestAnimationFrame(callback) { callback(); },
  setTimeout,
  clearTimeout,
};
sandbox.globalThis = sandbox;
vm.runInNewContext(instrumented, sandbox, { filename: runtimePath });

const zoom = sandbox.__atsrsZoomTest;
assert.equal(zoom.fitZoomScale(1.349), 1.3, 'Fit 134.9% snaps down to 130%');
assert.equal(zoom.fitZoomScale(1.889), 1.8, 'Fit 188.9% opens slightly zoomed out at 180%');
assert.equal(zoom.fitZoomScale(1.4), 1.4, 'an exact 140% fit remains 140%');
assert.equal(zoom.fitZoomScale(0.49), 0.5, 'Fit respects the 50% minimum');
assert.equal(zoom.fitZoomScale(3.25), 3, 'Fit respects the 300% maximum');
assert.equal(zoom.steppedZoomScale(1.3, 1), 1.4, 'Zoom In advances by exactly 10%');
assert.equal(zoom.steppedZoomScale(1.3, -1), 1.2, 'Zoom Out decreases by exactly 10%');
assert.equal(zoom.steppedZoomScale(1.8, -1), 1.7, 'Zoom Out from a fitted 180% moves to 170%');
assert.equal(zoom.steppedZoomScale(3, 1), 3, 'Zoom In stops at 300%');
assert.equal(zoom.steppedZoomScale(0.5, -1), 0.5, 'Zoom Out stops at 50%');
assert.equal(zoom.scaleToZoomPercent(1.34), 130, 'displayed zoom uses a standard 10% level');

assert.doesNotMatch(runtime, /changePdfZoom\(1(?:\.12|\/1\.12|\.2|\/1\.2)\)/);
assert.doesNotMatch(runtime, /changeImageZoom\(1(?:\.12|\/1\.12|\.2|\/1\.2)\)/);
assert.match(index, /route-feature-loader\.js\?v=58152/, 'the browser must refresh the loader that selects preview assets');
assert.match(routeLoader, /product-experience\.js\?v=448/, 'the refreshed loader must request the snapped-zoom runtime');

console.log('File preview zoom contracts passed');
