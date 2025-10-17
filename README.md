# SQL Smart Formatter (VS Code)

Lightweight SQL formatter for VS Code that respects the editor's indentation (spaces/tabs and width). No external binaries.

## Features
- Respects `editor.insertSpaces` and `editor.tabSize`
- Breaks major clauses onto new lines: SELECT, FROM, WHERE, GROUP BY, ORDER BY, JOIN, UNION
- Indents by parenthesis depth; normalizes comma and parenthesis spacing
- Preserves quoted strings/identifiers
- **Removes spaces between function names and opening parentheses** (e.g., `max (value)` → `max(value)`)
- **Keeps AS keyword and aliases on the same line**
- **Maintains proper FROM indentation in subqueries**

## Usage
- Open a `sql`/`mysql`/`postgres` file
- Run "SQL: Format Document" or use the default format shortcut

## Development

### Setup
1. Install dependencies and compile
   ```bash
   npm install
   npm run compile
   ```

### Testing
项目包含完整的测试框架，确保格式化器功能正确：

```bash
# 运行所有测试
npm test

# 开发时快速测试（编译+测试）
npm run test:watch

# CI环境测试
npm run test:ci

# 使用开发脚本（推荐）
./dev_test.sh
```

测试用例包括：
- 函数名空格处理（`max (value)` → `max(value)`）
- 自定义UDF函数支持
- AS关键字格式化
- FROM子句缩进
- 复杂查询格式化

### VS Code Tasks
在VS Code中可以使用以下任务：
- `Ctrl+Shift+P` → "Tasks: Run Task" → 选择任务：
  - **Compile TypeScript**: 编译代码
  - **Run Tests**: 运行测试
  - **Run Development Test**: 完整开发测试
  - **Package Extension**: 打包扩展

### Debug
- Press F5 in VS Code to launch Extension Development Host

### Package
```bash
npm run package
```

### Test Framework
- 测试用例定义在 `tests/test_cases.json`
- 测试运行器：`tests/test_runner.js`
- 失败测试结果保存在 `tests/failed_tests.json`
- 详细文档：`tests/README.md`

## License
MIT
