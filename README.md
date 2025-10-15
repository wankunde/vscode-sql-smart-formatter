# SQL Smart Formatter (VS Code)

Lightweight SQL formatter for VS Code that respects the editor's indentation (spaces/tabs and width). No external binaries.

## Features
- Respects `editor.insertSpaces` and `editor.tabSize`
- Breaks major clauses onto new lines: SELECT, FROM, WHERE, GROUP BY, ORDER BY, JOIN, UNION
- Indents by parenthesis depth; normalizes comma and parenthesis spacing
- Preserves quoted strings/identifiers

## Usage
- Open a `sql`/`mysql`/`postgres` file
- Run "SQL: Format Document" or use the default format shortcut

## Development
1. Install dependencies and compile
   ```bash
   npm install
   npm run compile
   ```
2. Debug
   - Press F5 in VS Code to launch Extension Development Host
3. Package
   ```bash
   npm run package
   ```

## License
MIT
