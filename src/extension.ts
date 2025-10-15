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
  // Extremely lightweight formatter: line-breaks major clauses, normalize whitespace, indent blocks
  // It preserves existing newline structure where possible and avoids heavy reflows.
  const clauseKeywords = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
    'ON', 'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT', 'RETURNING'
  ];

  const keywordRegex = new RegExp(
    `(\\b(?:${clauseKeywords.map(k => k.replace(/ /g, '\\s+')).join('|')})\\b)`,
    'gi'
  );

  // Protect string literals and identifiers in quotes
  const tokenPatterns = [
    /'(?:''|[^'])*'/g,              // single-quoted strings
    /"(?:\"\"|[^"])*"/g,      // double-quoted identifiers/strings
    /`(?:``|[^`])*`/g               // backtick-quoted identifiers
  ];

  type Segment = { text: string; quoted: boolean };
  const segments: Segment[] = [];
  let remaining = sql;
  while (remaining.length > 0) {
    let firstMatchIndex = -1;
    let firstMatchLength = 0;
    let matchText = '';
    for (const pattern of tokenPatterns) {
      pattern.lastIndex = 0;
      const m = pattern.exec(remaining);
      if (m && (firstMatchIndex === -1 || m.index < firstMatchIndex)) {
        firstMatchIndex = m.index;
        firstMatchLength = m[0].length;
        matchText = m[0];
      }
    }
    if (firstMatchIndex === -1) {
      segments.push({ text: remaining, quoted: false });
      break;
    }
    if (firstMatchIndex > 0) {
      segments.push({ text: remaining.slice(0, firstMatchIndex), quoted: false });
    }
    segments.push({ text: remaining.slice(firstMatchIndex, firstMatchIndex + firstMatchLength), quoted: true });
    remaining = remaining.slice(firstMatchIndex + firstMatchLength);
  }

  const transformed = segments.map(seg => {
    if (seg.quoted) return seg.text; // don't touch quoted content
    // Normalize whitespace around commas and parentheses
    let t = seg.text
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      .replace(keywordRegex, (m: string) => m.toUpperCase());

    return t;
  }).join('');

  // Split by major clauses to introduce line breaks
  const withBreaks = transformed
    .replace(/\s+(SELECT)\b/gi, '\n$1')
    .replace(/\s+(FROM)\b/gi, '\n$1')
    .replace(/\s+(WHERE)\b/gi, '\n$1')
    .replace(/\s+(GROUP\s+BY)\b/gi, '\n$1')
    .replace(/\s+(HAVING)\b/gi, '\n$1')
    .replace(/\s+(ORDER\s+BY)\b/gi, '\n$1')
    .replace(/\s+(LIMIT)\b/gi, '\n$1')
    .replace(/\s+(OFFSET)\b/gi, '\n$1')
    .replace(/\s+(INSERT|UPDATE|DELETE)\b/gi, '\n$1')
    .replace(/\s+(JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN)\b/gi, '\n$1')
    .replace(/\s+(UNION(?:\s+ALL)?)\b/gi, '\n$1')
    .replace(/\s+(RETURNING)\b/gi, '\n$1')
    .replace(/\s*;\s*$/g, ';');

  const lines = withBreaks.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);

  let indentLevel = 0;
  const resultLines: string[] = [];
  for (let line of lines) {
    const open = (line.match(/\(/g) || []).length;
    const close = (line.match(/\)/g) || []).length;

    if (close > open && indentLevel > 0) {
      indentLevel = Math.max(0, indentLevel - (close - open));
    }

    const indent = indentUnit.repeat(indentLevel);
    resultLines.push(indent + line);

    if (open > close) {
      indentLevel += open - close;
    }
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


