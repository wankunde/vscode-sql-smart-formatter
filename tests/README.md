# SQL Formatter Test Suite

这个测试套件用于验证SQL格式化器的功能，确保所有格式化规则都正确工作。

## 测试用例

测试用例定义在 `test_cases.json` 文件中，包括：

### 1. 函数名空格处理
- **function_spacing_basic**: 移除基本函数名后的空格
- **function_spacing_custom_udf**: 处理自定义UDF函数
- **function_spacing_schema_prefix**: 处理带schema前缀的函数
- **function_spacing_multiple_functions**: 处理多个函数的情况

### 2. AS关键字处理
- **as_keyword_same_line**: 确保AS关键字和别名在同一行

### 3. FROM子句缩进
- **from_indentation_subquery**: 子查询中FROM的缩进处理

### 4. 复杂查询
- **complex_query_with_functions**: 包含多种格式化要求的复杂查询
- **sql_keywords_with_parentheses**: SQL关键字与括号的处理
- **mixed_functions_and_keywords**: 函数和关键字的混合使用
- **case_statement_formatting**: CASE语句的格式化

## 运行测试

### 本地测试
```bash
# 运行所有测试
npm test

# 编译后运行测试
npm run test:watch

# CI环境测试
npm run test:ci
```

### 测试输出
- ✅ 通过的测试会显示绿色勾号
- ❌ 失败的测试会显示红色叉号，并输出详细信息
- 失败的测试结果会保存到 `failed_tests.json`

## 添加新测试用例

1. 编辑 `test_cases.json` 文件
2. 在 `testCases` 数组中添加新的测试用例：

```json
{
  "name": "test_case_name",
  "description": "测试用例描述",
  "input": "输入的SQL",
  "expected": "期望的输出"
}
```

3. 运行测试验证新用例：
```bash
npm test
```

## 测试失败处理

如果测试失败：

1. 检查 `failed_tests.json` 文件了解失败详情
2. 比较实际输出和期望输出
3. 修复格式化器代码
4. 重新运行测试

## 持续集成

GitHub Actions会在以下情况自动运行测试：
- 推送到 main 或 develop 分支
- 创建 Pull Request 到 main 分支

测试在 Node.js 18.x 和 20.x 版本上运行。
