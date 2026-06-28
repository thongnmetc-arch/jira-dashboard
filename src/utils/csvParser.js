/**
 * CSV PARSER — handles semicolons, quoted fields, embedded
 * newlines, UTF-8 BOM, and irregular rows.
 */
export function parseCSV(text) {
  // 1. Strip BOM (any form)
  text = text.replace(/^\uFEFF/, '');
  // Also handle raw UTF-8 BOM bytes if they somehow survived
  if (text.length >= 3 && text.charCodeAt(0) === 0xEF && text.charCodeAt(1) === 0xBB && text.charCodeAt(2) === 0xBF) {
    text = text.slice(3);
  }

  // 2. Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Split into rows by newline (handling quoted newlines)
  const rows = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      currentRow += ch;
    } else if (ch === '\n' && !inQuotes) {
      if (currentRow.trim()) {
        rows.push(currentRow);
      }
      currentRow = '';
    } else {
      currentRow += ch;
    }
  }
  if (currentRow.trim()) {
    rows.push(currentRow);
  }

  // 4. For each row, split into fields by semicolon (handling quoted fields)
  return rows.map(row => {
    const fields = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (quoted && i + 1 < row.length && row[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === ';' && !quoted) {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);
    return fields;
  });
}
