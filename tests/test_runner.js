#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 导入格式化函数
function getIndentation(editorOptions) {
  const insertSpaces = editorOptions.insertSpaces !== false;
  if (insertSpaces) {
    const size = typeof editorOptions.tabSize === 'number' ? editorOptions.tabSize : 2;
    return ' '.repeat(size);
  }
  return '\t';
}

function simpleSqlFormat(sql, indentUnit) {
  // Enhanced formatter per requirements:
  // - Uppercase keywords broadly (WITH, AND, etc.)
  // - Preserve comments (line -- and block /* */), do not wrap or reflow comments
  // - Force newlines before SELECT, ON, FROM, GROUP BY, JOIN, UNION
  // - Indent based on parenthesis depth
  // - Wrap non-comment lines at 100 bytes

  // Tokenize while preserving quotes and comments
  const segments = [];
  const len = sql.length;
  let i = 0;
  function pushText(start, end) {
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
      .replace(singleKwRegex, (m) => m.toUpperCase());
    
    // Handle comma spacing - add space after comma but not before, except after closing parenthesis
    t = t.replace(/\s*,\s*/g, (match, offset, string) => {
      // Check if this comma is preceded by a closing parenthesis
      const beforeComma = string.substring(0, offset).trim();
      if (beforeComma.endsWith(')')) {
        // This comma is after a closing parenthesis, don't add space before
        return ',';
      } else {
        // Normal comma, add space after
        return ', ';
      }
    });
    
    // Fix specific formatting issues BEFORE general parenthesis spacing:
    // 1. Remove extra space between any function name and opening parenthesis to support custom UDFs
    // This pattern matches any identifier (including schema.function) followed by opening parenthesis
    t = t.replace(/\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s+\(/g, '$1(');
    
    // 2. Keep AS keyword and alias on the same line
    t = t.replace(/\s+AS\s+/gi, ' AS ');
    
    // 3. Now handle general parenthesis spacing (but not for functions)
    // Only add space before opening parenthesis if it's not preceded by a function name
    t = t.replace(/\s*\(\s*/g, (match, offset, string) => {
      // Check if this opening parenthesis is preceded by a function name
      const beforeParen = string.substring(0, offset).trim();
      const functionMatch = beforeParen.match(/\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s*$/);
      if (functionMatch) {
        const functionName = functionMatch[1].toLowerCase();
        // Check if it's a SQL keyword (don't treat as function)
        const sqlKeywords = ['select','from','where','group','by','having','order','limit','offset','insert','into','values','update','set','delete','join','left','right','inner','outer','on','union','all','except','intersect','returning','with','and','or','as','case','when','then','else','end','exists','not','null','in','is','between','like'];
        if (sqlKeywords.includes(functionName)) {
          // This is a SQL keyword, add space
          return ' (';
        } else {
          // This is a function call, don't add space
          return '(';
        }
      } else {
        // This is not a function call, add space
        return ' (';
      }
    });
    t = t.replace(/\s*\)\s*/g, ') ');
    // Enforce newlines before selected clauses
    t = t.replace(clauseRegex, '\n$1');
    // Ensure SELECT after an opening parenthesis starts on a new line, e.g. AS (SELECT ...)
    t = t.replace(/\(\s*SELECT\b/gi, '(\nSELECT');
    // WITH CTE list formatting: put first CTE on a new line and each subsequent CTE on its own line
    t = t
      .replace(/\bWITH\s+/gi, 'WITH\n')
      .replace(/,([A-Za-z_][A-Za-z0-9_\.]*)\s+AS\s*\(/g, ',\n$1 AS (');
    return t;
  }).join('');

  // Now build lines with indentation by parenthesis depth and wrapping at 100 bytes for non-comment lines
  const rawLines = transformed.split(/\n/);
  const resultLines = [];
  let depth = 0;
  let insideBlockComment = false;

  const wrapLimitBytes = 100;
  const wrapLine = (line, baseIndent) => {
    const lines = [];
    let current = '';
    const words = line.split(/\s+/);
    for (let w of words) {
      if (w.length === 0) continue;
      const trial = current.length === 0 ? w : current + ' ' + w;
      if (Buffer.byteLength(baseIndent + trial, 'utf8') <= wrapLimitBytes) {
        current = trial;
      } else {
        if (current.length > 0) lines.push(baseIndent + current);
        // Special handling for FROM clauses in subqueries - maintain alignment with FROM keyword
        let hangingIndent = baseIndent + indentUnit;
        if (w.toUpperCase() === 'FROM' && current.toUpperCase().includes('SELECT')) {
          // For FROM after SELECT, align with the SELECT keyword
          hangingIndent = baseIndent;
        }
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

// 测试运行器
class TestRunner {
  constructor() {
    this.testCases = [];
    this.results = [];
  }

  loadTestCases() {
    const testFile = path.join(__dirname, 'test_cases.json');
    const testData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    this.testCases = testData.testCases;
  }

  runTest(testCase) {
    const actual = simpleSqlFormat(testCase.input, '  ');
    const passed = actual.trim() === testCase.expected.trim();
    
    const result = {
      name: testCase.name,
      description: testCase.description,
      input: testCase.input,
      expected: testCase.expected,
      actual: actual,
      passed: passed
    };

    this.results.push(result);
    return result;
  }

  runAllTests() {
    console.log('🧪 Running SQL Formatter Tests...\n');
    
    this.loadTestCases();
    
    let passed = 0;
    let failed = 0;

    for (const testCase of this.testCases) {
      const result = this.runTest(testCase);
      
      if (result.passed) {
        console.log(`✅ ${result.name}: ${result.description}`);
        passed++;
      } else {
        console.log(`❌ ${result.name}: ${result.description}`);
        console.log(`   Input:    ${result.input}`);
        console.log(`   Expected: ${result.expected}`);
        console.log(`   Actual:   ${result.actual}`);
        console.log('');
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\n💾 Saving failed test results to tests/failed_tests.json');
      this.saveFailedTests();
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }
  }

  saveFailedTests() {
    const failedTests = this.results.filter(r => !r.passed);
    const outputFile = path.join(__dirname, 'failed_tests.json');
    fs.writeFileSync(outputFile, JSON.stringify(failedTests, null, 2));
  }
}

// 运行测试
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests();
}

module.exports = { TestRunner, simpleSqlFormat };
