import * as vscode from 'vscode';

function getIndentation(editorOptions: vscode.TextEditorOptions): string {
  const insertSpaces = editorOptions.insertSpaces !== false;
  if (insertSpaces) {
    const size = typeof editorOptions.tabSize === 'number' ? editorOptions.tabSize : 2;
    return ' '.repeat(size);
  }
  return '\t';
}

function simpleSqlFormat(sql: string, indentUnit: string): string {
  // Enhanced formatter per requirements:
  // - Uppercase keywords broadly (WITH, AND, etc.)
  // - Preserve comments (line -- and block /* */), do not wrap or reflow comments
  // - Force newlines before SELECT, ON, FROM, GROUP BY, JOIN, UNION
  // - Indent based on parenthesis depth
  // - Wrap non-comment lines at 100 bytes

  // Tokenize while preserving quotes and comments
  type Segment = { text: string; kind: 'text' | 'sq' | 'dq' | 'bq' | 'lineComment' | 'blockComment' };
  const segments: Segment[] = [];
  const len = sql.length;
  let i = 0;
  function pushText(start: number, end: number) {
    if (end > start) segments.push({ text: sql.slice(start, end), kind: 'text' });
  }
  while (i < len) {
    const ch = sql[i];
    // line comment -- ...\n
    if (ch === '-' && i + 1 < len && sql[i + 1] === '-') {
      const start = i;
      i += 2;
      while (i < len && sql[i] !== '\n') i++;
      segments.push({ text: sql.slice(start, i), kind: 'lineComment' });
      continue;
    }
    // block comment /* ... */
    if (ch === '/' && i + 1 < len && sql[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < len && !(sql[i] === '*' && i + 1 < len && sql[i + 1] === '/')) i++;
      if (i < len) i += 2; // consume */
      segments.push({ text: sql.slice(start, i), kind: 'blockComment' });
      continue;
    }
    // single quote
    if (ch === '\'') {
      const start = i;
      i++;
      while (i < len) {
        if (sql[i] === '\'' && i + 1 < len && sql[i + 1] === '\'') { i += 2; continue; }
        if (sql[i] === '\'') { i++; break; }
        i++;
      }
      segments.push({ text: sql.slice(start, i), kind: 'sq' });
      continue;
    }
    // double quote
    if (ch === '"') {
      const start = i;
      i++;
      while (i < len) {
        if (sql[i] === '"' && i + 1 < len && sql[i + 1] === '"') { i += 2; continue; }
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      segments.push({ text: sql.slice(start, i), kind: 'dq' });
      continue;
    }
    // backtick
    if (ch === '`') {
      const start = i;
      i++;
      while (i < len) {
        if (sql[i] === '`' && i + 1 < len && sql[i + 1] === '`') { i += 2; continue; }
        if (sql[i] === '`') { i++; break; }
        i++;
      }
      segments.push({ text: sql.slice(start, i), kind: 'bq' });
      continue;
    }
    // plain text run
    const start = i;
    while (i < len) {
      const c = sql[i];
      if (
        (c === '-' && i + 1 < len && sql[i + 1] === '-') ||
        (c === '/' && i + 1 < len && sql[i + 1] === '*') ||
        c === '\'' || c === '"' || c === '`'
      ) break;
      i++;
    }
    pushText(start, i);
  }

  // Uppercase keyword list (single words)
  const singleKeywords = [
    'select','from','where','group','by','having','order','limit','offset','insert','into','values','update','set','delete',
    'join','left','right','inner','outer','on','union','all','except','intersect','returning','with','and','or','as',
    'case','when','then','else','end','exists','not','null','in','is','between','like'
  ];
  const singleKwRegex = new RegExp(`\\b(${singleKeywords.join('|')})\\b`, 'gi');

  // Clause patterns for enforced newlines
  const clauseBeforeNewline = [
    'SELECT', 'FROM', 'WHERE', 'ON', 'GROUP\\s+BY', '(?:LEFT\\s+|RIGHT\\s+|INNER\\s+|OUTER\\s+)?JOIN', 'UNION(?:\\s+ALL)?'
  ];
  const clauseRegex = new RegExp(`\\s+(${clauseBeforeNewline.join('|')})\\b`, 'gi');

  const transformed = segments.map(seg => {
    if (seg.kind !== 'text') return seg.text; // keep quotes and comments intact
    // Normalize spaces lightly and uppercase single-word keywords
    let t = seg.text
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      .replace(singleKwRegex, (m: string) => m.toUpperCase());
    // Enforce newlines before selected clauses
    t = t.replace(clauseRegex, '\n$1');
    // Ensure SELECT after an opening parenthesis starts on a new line, e.g. AS (SELECT ...)
    t = t.replace(/\(\s*SELECT\b/gi, '(\nSELECT');
    // WITH CTE list formatting: put first CTE on a new line and each subsequent CTE on its own line
    t = t
      .replace(/\bWITH\s+/gi, 'WITH\n')
      .replace(/,\s*([A-Za-z_][A-Za-z0-9_\.]*)\s+AS\s*\(/g, ',\n$1 AS (');
    return t;
  }).join('');

  // Now build lines with indentation by parenthesis depth and wrapping at 100 bytes for non-comment lines
  const rawLines = transformed.split(/\n/);
  const resultLines: string[] = [];
  let depth = 0;
  let insideBlockComment = false;

  const wrapLimitBytes = 100;
  const wrapLine = (line: string, baseIndent: string): string[] => {
    const lines: string[] = [];
    let current = '';
    const words = line.split(/\s+/);
    for (let w of words) {
      if (w.length === 0) continue;
      const trial = current.length === 0 ? w : current + ' ' + w;
      if (Buffer.byteLength(baseIndent + trial, 'utf8') <= wrapLimitBytes) {
        current = trial;
      } else {
        if (current.length > 0) lines.push(baseIndent + current);
        // hanging indent by one indentUnit
        const hangingIndent = baseIndent + indentUnit;
        current = w;
        // If the single word itself exceeds limit, hard break by chunks
        if (Buffer.byteLength(hangingIndent + current, 'utf8') > wrapLimitBytes) {
          let chunk = '';
          for (const ch of current) {
            const t = chunk + ch;
            if (Buffer.byteLength(hangingIndent + t, 'utf8') > wrapLimitBytes) {
              lines.push(hangingIndent + chunk);
              chunk = ch;
            } else {
              chunk = t;
            }
          }
          current = chunk;
          baseIndent = hangingIndent; // subsequent lines keep hanging indent
        } else {
          baseIndent = hangingIndent;
        }
      }
    }
    if (current.length > 0) lines.push(baseIndent + current);
    return lines;
  };

  for (let raw of rawLines) {
    // Keep original line as-is for comments and blank lines
    const trimmed = raw.trim();
    if (trimmed.length === 0) { resultLines.push(''); continue; }

    // Track block comment regions
    if (insideBlockComment) {
      resultLines.push(raw);
      if (/\*\//.test(raw)) insideBlockComment = false;
      continue;
    }
    if (/\/\*/.test(raw) && !/\*\//.test(raw)) {
      insideBlockComment = true;
      resultLines.push(raw);
      continue;
    }
    // Line comment: keep as-is
    if (/^\s*--/.test(raw)) { resultLines.push(raw); continue; }

    // Adjust depth before printing if closing parens exceed opening
    const opens = (raw.match(/\(/g) || []).length;
    const closes = (raw.match(/\)/g) || []).length;
    if (closes > opens && depth > 0) depth = Math.max(0, depth - (closes - opens));

    const indent = indentUnit.repeat(depth);
    const line = trimmed.replace(/\s+/g, ' ');

    // Apply wrapping at 100 bytes
    const wrapped = wrapLine(line, indent);
    resultLines.push(...wrapped);

    if (opens > closes) depth += opens - closes;
  }

  return resultLines.join('\n');
}

export function activate(context: vscode.ExtensionContext) {
  const provider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.ProviderResult<vscode.TextEdit[]> {
      const editor = vscode.window.activeTextEditor;
      const indentUnit = editor ? getIndentation(editor.options) : '  ';
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      const original = document.getText();
      const formatted = simpleSqlFormat(original, indentUnit);
      if (formatted === original) {
        return [];
      }
      return [vscode.TextEdit.replace(fullRange, formatted)];
    }
  };

  const langSelectors: vscode.DocumentSelector = [
    { language: 'sql', scheme: 'file' },
    { language: 'sql', scheme: 'untitled' },
    { language: 'mysql', scheme: 'file' },
    { language: 'postgres', scheme: 'file' }
  ];

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(langSelectors, provider),
    vscode.commands.registerCommand('sqlSmartFormatter.formatDocument', async () => {
      await vscode.commands.executeCommand('editor.action.formatDocument');
    })
  );
}

export function deactivate() {
  // no-op
}


