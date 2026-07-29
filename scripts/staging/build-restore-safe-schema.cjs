const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const TARGET_PREFIX = 'ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();

function dollarTagAt(sql, offset) {
  const match = sql.slice(offset).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
  return match ? match[0] : null;
}

function consumeTopLevelStatement(sql, start) {
  let mode = 'normal';
  let dollarTag = null;
  let blockDepth = 0;

  for (let index = start; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (mode === 'line-comment') {
      if (char === '\n') mode = 'normal';
      continue;
    }
    if (mode === 'block-comment') {
      if (char === '/' && next === '*') {
        blockDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) mode = 'normal';
      }
      continue;
    }
    if (mode === 'single-quote') {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") mode = 'normal';
      continue;
    }
    if (mode === 'double-quote') {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') mode = 'normal';
      continue;
    }
    if (mode === 'dollar-quote') {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        mode = 'normal';
        dollarTag = null;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      mode = 'line-comment';
      index += 1;
    } else if (char === '/' && next === '*') {
      mode = 'block-comment';
      blockDepth = 1;
      index += 1;
    } else if (char === "'") {
      mode = 'single-quote';
    } else if (char === '"') {
      mode = 'double-quote';
    } else if (char === '$') {
      const tag = dollarTagAt(sql, index);
      if (tag) {
        mode = 'dollar-quote';
        dollarTag = tag;
        index += tag.length - 1;
      }
    } else if (char === ';') {
      let end = index + 1;
      if (sql[end] === '\r') end += 1;
      if (sql[end] === '\n') end += 1;
      return end;
    }
  }

  throw new Error('Target ALTER DEFAULT PRIVILEGES statement has no top-level terminator');
}

function transformSql(raw) {
  let output = '';
  let index = 0;
  let lineStart = true;
  let statementStart = true;
  let mode = 'normal';
  let dollarTag = null;
  let blockDepth = 0;
  const removed = [];

  while (index < raw.length) {
    if (
      mode === 'normal' &&
      lineStart &&
      statementStart &&
      raw.startsWith(TARGET_PREFIX, index)
    ) {
      const end = consumeTopLevelStatement(raw, index);
      const text = raw.slice(index, end);
      const firstLine = raw.slice(0, index).split('\n').length;
      removed.push({
        line: firstLine,
        sha256: sha256(text),
        bytes: Buffer.byteLength(text),
        text,
      });
      index = end;
      lineStart = true;
      statementStart = true;
      continue;
    }

    const char = raw[index];
    const next = raw[index + 1];
    output += char;

    if (mode === 'line-comment') {
      if (char === '\n') {
        mode = 'normal';
        lineStart = true;
      } else {
        lineStart = false;
      }
      index += 1;
      continue;
    }
    if (mode === 'block-comment') {
      if (char === '/' && next === '*') {
        output += next;
        blockDepth += 1;
        index += 2;
        lineStart = false;
      } else if (char === '*' && next === '/') {
        output += next;
        blockDepth -= 1;
        index += 2;
        if (blockDepth === 0) mode = 'normal';
        lineStart = false;
      } else {
        lineStart = char === '\n';
        index += 1;
      }
      continue;
    }
    if (mode === 'single-quote') {
      if (char === "'" && next === "'") {
        output += next;
        index += 2;
      } else {
        if (char === "'") mode = 'normal';
        index += 1;
      }
      lineStart = char === '\n';
      continue;
    }
    if (mode === 'double-quote') {
      if (char === '"' && next === '"') {
        output += next;
        index += 2;
      } else {
        if (char === '"') mode = 'normal';
        index += 1;
      }
      lineStart = char === '\n';
      continue;
    }
    if (mode === 'dollar-quote') {
      if (raw.startsWith(dollarTag, index)) {
        const rest = dollarTag.slice(1);
        output += rest;
        index += dollarTag.length;
        mode = 'normal';
        dollarTag = null;
        lineStart = false;
      } else {
        lineStart = char === '\n';
        index += 1;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      output += next;
      mode = 'line-comment';
      index += 2;
      lineStart = false;
    } else if (char === '/' && next === '*') {
      output += next;
      mode = 'block-comment';
      blockDepth = 1;
      index += 2;
      lineStart = false;
    } else if (char === "'") {
      mode = 'single-quote';
      statementStart = false;
      index += 1;
      lineStart = false;
    } else if (char === '"') {
      mode = 'double-quote';
      statementStart = false;
      index += 1;
      lineStart = false;
    } else if (char === '$') {
      const tag = dollarTagAt(raw, index);
      if (tag) {
        output += tag.slice(1);
        mode = 'dollar-quote';
        dollarTag = tag;
        statementStart = false;
        index += tag.length;
        lineStart = false;
      } else {
        statementStart = false;
        index += 1;
        lineStart = false;
      }
    } else {
      if (char === ';') statementStart = true;
      else if (char === '\\' && lineStart && statementStart) statementStart = true;
      else if (!/\s/.test(char)) statementStart = false;
      lineStart = char === '\n';
      index += 1;
    }
  }

  if (mode !== 'normal' && mode !== 'line-comment') {
    throw new Error(`SQL ended inside ${mode}`);
  }
  return { output, removed };
}

function buildManifest(rawPath, safePath, raw, safe, removed) {
  return {
    generated_at: new Date().toISOString(),
    source_artifact: path.resolve(rawPath),
    restore_safe_artifact: path.resolve(safePath),
    raw_sha256: sha256(raw),
    restore_safe_sha256: sha256(safe),
    removed_statement_count: removed.length,
    removal_rule:
      'Only complete top-level statements beginning at column 1 with ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin".',
    reason:
      'Supabase-managed supabase_admin default ACL cannot be replayed by the staging postgres login.',
    removed_statements: removed.map(({ line, sha256: hash, bytes }) => ({
      source_line: line,
      sha256: hash,
      bytes,
    })),
  };
}

if (require.main === module) {
  const [rawPath, safePath, manifestPath] = process.argv.slice(2);
  if (!rawPath || !safePath || !manifestPath) {
    throw new Error('Usage: node build-restore-safe-schema.cjs <raw.sql> <safe.sql> <manifest.json>');
  }
  const raw = fs.readFileSync(rawPath, 'utf8');
  const { output, removed } = transformSql(raw);
  if (removed.length === 0) throw new Error('No eligible supabase_admin default ACL statements found');
  fs.writeFileSync(safePath, output, 'utf8');
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(buildManifest(rawPath, safePath, raw, output, removed), null, 2)}\n`,
    'utf8'
  );
  console.log(`RESTORE_SAFE_SCHEMA_CREATED=${safePath}`);
  console.log(`REMOVED_STATEMENTS=${removed.length}`);
  console.log(`RAW_SHA256=${sha256(raw)}`);
  console.log(`RESTORE_SAFE_SHA256=${sha256(output)}`);
}

module.exports = { TARGET_PREFIX, buildManifest, sha256, transformSql };
