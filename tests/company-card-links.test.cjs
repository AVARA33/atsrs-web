const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const employersSource = fs.readFileSync('js/employers.js', 'utf8');
const companyLinksSource = fs.readFileSync('js/company-directory-links.js', 'utf8');

function readVerifiedCompanies() {
  const match = employersSource.match(/var verified = (\{[\s\S]*?\n    \}),\n    companyLogos/);
  assert.ok(match, 'verified company directory must remain readable by the audit');
  return vm.runInNewContext(`(${match[1]})`);
}

test('all current production companies have safe company-card destinations', () => {
  const context = { window: {} };
  vm.runInNewContext(companyLinksSource, context);
  const linksByCompany = context.window.atsrsCompanyDirectoryLinks;
  const currentCompanies = [
    'Saudi Aramco', 'SABIC', 'stc', 'NEOM', "Ma'aden",
    'Avery Dennison', 'Catch22', 'Eurofins',
    'Eurofins USA Environment Testing', 'Fairmont (Accor)', 'Intuitive',
    'JACOBS DOUWE EGBERTS', 'Jetstar Airways Pty Ltd',
    'Qantas Group / Qantas Airways Limited', 'SEEK',
    'Senior Aerospace Thermal Engineering', 'ServiceNow', 'SGS', 'SIXT USA',
    'Svitzer', 'Taylor and Francis', 'TOMRA', 'Version 1'
  ];

  currentCompanies.forEach((company) => {
    const links = linksByCompany[company];
    assert.ok(links, `${company} must have a company-card link mapping`);
    ['website', 'careers', 'contact', 'about'].forEach((kind) => {
      assert.match(links[kind], /^https:\/\//, `${company} ${kind} must be HTTPS`);
      assert.doesNotMatch(links[kind], /\?$/, `${company} ${kind} must not end in an empty query`);
    });
  });
});

test('every rendered verified company has four safe destinations after directory merging', () => {
  const context = { window: {} };
  vm.runInNewContext(companyLinksSource, context);
  const linksByCompany = context.window.atsrsCompanyDirectoryLinks;
  const verifiedCompanies = readVerifiedCompanies();

  Object.entries(verifiedCompanies).forEach(([company, base]) => {
    const merged = { ...base, ...(linksByCompany[company] || {}) };
    ['website', 'careers', 'contact', 'about'].forEach((kind) => {
      assert.match(
        String(merged[kind] || ''),
        /^https:\/\//,
        `${company} ${kind} must be an enabled HTTPS destination`
      );
    });
  });
});

test('every dynamic directory mapping has four safe destinations', () => {
  const context = { window: {} };
  vm.runInNewContext(companyLinksSource, context);

  Object.entries(context.window.atsrsCompanyDirectoryLinks).forEach(([company, links]) => {
    ['website', 'careers', 'contact', 'about'].forEach((kind) => {
      assert.match(
        String(links[kind] || ''),
        /^https:\/\//,
        `${company} ${kind} must be an enabled HTTPS destination`
      );
    });
  });
});

test('company-card actions reject invalid URLs and normalize View jobs matching', () => {
  assert.match(employersSource, /if \(!safeUrl\) return unavailableAction\(label, icon\)/);
  assert.ok(employersSource.includes('!/^https?:\\/\\//i.test(url)'));
  assert.match(employersSource, /parsed\.protocol === "https:" \|\| parsed\.protocol === "http:"/);
  assert.match(employersSource, /normalized\(candidate\.value \|\| candidate\.textContent\) === requested/);
  assert.doesNotMatch(employersSource, /link\.href = url/);
});
