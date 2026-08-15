const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const installer = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'operations', 'Install-AtsrsOperationsTasks.ps1'),
  'utf8'
);

test('production operations tasks run without visible PowerShell windows', () => {
  assert.match(installer, /-NonInteractive/);
  assert.match(installer, /-WindowStyle Hidden/);
  assert.match(installer, /\$hiddenPowerShellArguments -File/);
});
