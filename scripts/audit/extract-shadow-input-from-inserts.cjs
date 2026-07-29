const fs = require('node:fs');

const [sqlPath, outputPath] = process.argv.slice(2);
if (!sqlPath || !outputPath) {
  throw new Error('Usage: node extract-shadow-input-from-inserts.cjs <dump.sql> <output.json>');
}

const wanted = new Map([
  ['atsrs_workspace_data', 'workspace_data'],
  ['atsrs_workspace_personnel', 'personnel'],
  ['atsrs_personnel_certificates', 'certificates'],
  ['atsrs_workspace_projects', 'projects'],
  ['atsrs_project_personnel', 'assignments'],
]);
const jsonColumns = new Set(['payload', 'metadata']);
const output = Object.fromEntries(Array.from(wanted.values(), (key) => [key, []]));

function splitValues(text) {
  const values = [];
  let start = 0;
  let quoted = false;
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "'") {
      if (quoted && text[index + 1] === "'") {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === '(') {
      depth += 1;
    } else if (!quoted && char === ')') {
      depth -= 1;
    } else if (!quoted && depth === 0 && char === ',') {
      values.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quoted || depth !== 0) throw new Error('Unbalanced SQL value list');
  values.push(text.slice(start).trim());
  return values;
}

function decodeSqlValue(token, column) {
  if (/^NULL$/i.test(token)) return null;
  if (/^(true|false)$/i.test(token)) return token.toLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(token)) return Number(token);
  const match = token.match(/^'(.*)'(?:::[a-zA-Z0-9_."]+)?$/s);
  if (!match) throw new Error(`Unsupported SQL token for ${column}`);
  const value = match[1].replace(/''/g, "'");
  return jsonColumns.has(column) ? JSON.parse(value) : value;
}

const lines = fs.readFileSync(sqlPath, 'utf8').split(/\r?\n/);
for (const line of lines) {
  const match = line.match(
    /^INSERT INTO "public"\."([^"]+)" \((.+)\) VALUES \((.*)\);$/,
  );
  if (!match || !wanted.has(match[1])) continue;
  const columns = Array.from(match[2].matchAll(/"([^"]+)"/g), (item) => item[1]);
  const values = splitValues(match[3]);
  if (columns.length !== values.length) {
    throw new Error(`Column/value mismatch for ${match[1]}`);
  }
  const row = Object.fromEntries(
    columns.map((column, index) => [column, decodeSqlValue(values[index], column)]),
  );
  output[wanted.get(match[1])].push(row);
}

awaitWrite();

function awaitWrite() {
  fs.writeFileSync(outputPath, `${JSON.stringify(output)}\n`, 'utf8');
  console.log(JSON.stringify({
    source: 'verified_production_insert_dump',
    workspace_rows: output.workspace_data.length,
    personnel: output.personnel.length,
    certificates: output.certificates.length,
    projects: output.projects.length,
    assignments: output.assignments.length,
  }));
}
