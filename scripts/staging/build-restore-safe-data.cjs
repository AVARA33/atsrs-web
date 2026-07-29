#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const prefix = 'INSERT INTO "public"."atsrs_workspace_data" ';

function dataKey(line) {
  const match = line.match(
    /^INSERT INTO "public"\."atsrs_workspace_data" \([^)]+\) VALUES \('[^']*', '[^']*', '([^']*)'/,
  );
  if (!match) throw new Error('Could not parse workspace data_key');
  return match[1];
}

function priority(line) {
  const key = dataKey(line);
  if (/_personal_profile$/.test(key)) return 10;
  if (/_company_personnel$/.test(key)) return 20;
  if (/_company_projects$/.test(key)) return 30;
  if (/_personal_certs$/.test(key)) return 40;
  if (/_project_personnel$/.test(key)) return 50;
  return 90;
}

const stripWorkspace = (text) =>
  text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(prefix))
    .join('\n');

function transformSql(raw, expectedWorkspaceStatements = 17) {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const workspaceLines = lines.filter((line) => line.startsWith(prefix));
  if (workspaceLines.length !== expectedWorkspaceStatements) {
    throw new Error(
      `Expected ${expectedWorkspaceStatements} workspace rows, found ${workspaceLines.length}`,
    );
  }

  const orderedWorkspaceLines = workspaceLines
    .map((line, index) => ({ line, index, priority: priority(line) }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map((item) => item.line);

  const firstIndex = lines.findIndex((line) => line.startsWith(prefix));
  const nonWorkspaceLines = lines.filter((line) => !line.startsWith(prefix));
  const beforeCount = lines
    .slice(0, firstIndex)
    .filter((line) => !line.startsWith(prefix)).length;
  const safeLines = [
    ...nonWorkspaceLines.slice(0, beforeCount),
    ...orderedWorkspaceLines,
    ...nonWorkspaceLines.slice(beforeCount),
  ];
  const safe = safeLines.join(newline);

  const rawMultiset = workspaceLines.map(sha256).sort();
  const safeMultiset = orderedWorkspaceLines.map(sha256).sort();
  if (JSON.stringify(rawMultiset) !== JSON.stringify(safeMultiset)) {
    throw new Error('Workspace INSERT multiset changed');
  }
  if (stripWorkspace(raw) !== stripWorkspace(safe)) {
    throw new Error('Non-workspace SQL changed');
  }

  const categories = {};
  for (const line of orderedWorkspaceLines) {
    const rank = String(priority(line));
    categories[rank] = (categories[rank] || 0) + 1;
  }
  return {
    output: safe,
    workspaceStatements: workspaceLines.length,
    statementMultisetSha256: sha256(rawMultiset.join('\n')),
    nonWorkspaceSqlSha256: sha256(stripWorkspace(raw)),
    dependencyPriorityCounts: categories,
  };
}

if (require.main === module) {
  const [sourcePath, outputPath, manifestPath] = process.argv.slice(2);
  if (!sourcePath || !outputPath || !manifestPath) {
    throw new Error(
      'Usage: node build-restore-safe-data.cjs <raw.sql> <restore-safe.sql> <manifest.json>',
    );
  }
  if (fs.existsSync(outputPath) || fs.existsSync(manifestPath)) {
    throw new Error('Refusing to overwrite an existing restore-safe artifact');
  }
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const result = transformSql(raw);
  fs.writeFileSync(outputPath, result.output, { encoding: 'utf8', flag: 'wx' });
  const manifest = {
    format: 1,
    operation: 'whole-statement dependency ordering only',
    sourcePath,
    sourceSha256: sha256(raw),
    restoreSafePath: outputPath,
    restoreSafeSha256: sha256(result.output),
    workspaceStatements: result.workspaceStatements,
    statementMultisetSha256: result.statementMultisetSha256,
    nonWorkspaceSqlSha256: result.nonWorkspaceSqlSha256,
    dependencyPriorityCounts: result.dependencyPriorityCounts,
    sourceUnchanged: fs.readFileSync(sourcePath, 'utf8') === raw,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  process.stdout.write(
    `${JSON.stringify({
      workspaceStatements: manifest.workspaceStatements,
      sourceSha256: manifest.sourceSha256,
      restoreSafeSha256: manifest.restoreSafeSha256,
      sourceUnchanged: manifest.sourceUnchanged,
    })}\n`,
  );
}

module.exports = { dataKey, priority, sha256, stripWorkspace, transformSql };
