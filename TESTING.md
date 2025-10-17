# SQL Formatter 测试框架

## 概述

项目现在包含完整的测试框架，用于确保SQL格式化器的所有功能都正确工作。每次修改代码后都应该运行回归测试。

## 快速开始

### 开发工作流
```bash
# 推荐：使用开发脚本（自动编译+测试）
./dev_test.sh

# 或者手动步骤：
npm run compile  # 编译TypeScript
npm test         # 运行测试
```

### VS Code集成
- 按 `Ctrl+Shift+P` 打开命令面板
- 输入 "Tasks: Run Task"
- 选择以下任务之一：
  - **Run Development Test**: 完整开发测试流程
  - **Run Tests**: 仅运行测试
  - **Compile TypeScript**: 仅编译代码

## 测试结构

```
tests/
├── test_cases.json      # 测试用例定义
├── test_runner.js       # 测试运行器
├── failed_tests.json    # 失败测试结果（自动生成）
└── README.md           # 详细测试文档
```

## 当前测试状态

✅ **通过的测试 (6个)**:
- 基本函数名空格处理
- 自定义UDF函数支持
- Schema前缀函数支持
- AS关键字格式化
- SQL关键字括号处理
- 函数和关键字混合使用

❌ **需要修复的测试 (4个)**:
- 多函数查询的逗号处理
- FROM子句缩进
- 复杂查询格式化
- CASE语句格式化

## 添加新测试

1. 编辑 `tests/test_cases.json`
2. 添加新的测试用例：
```json
{
  "name": "test_name",
  "description": "测试描述",
  "input": "输入SQL",
  "expected": "期望输出"
}
```
3. 运行 `npm test` 验证

## 持续集成

- GitHub Actions 自动在推送和PR时运行测试
- 支持 Node.js 18.x 和 20.x
- 失败时自动保存测试结果

## 调试失败测试

1. 查看 `tests/failed_tests.json` 了解失败详情
2. 比较实际输出和期望输出
3. 修复代码问题
4. 重新运行测试

## 最佳实践

1. **每次修改代码后运行测试**
2. **添加新功能时添加对应测试用例**
3. **提交前确保所有测试通过**
4. **使用 `./dev_test.sh` 进行完整验证**

## 测试覆盖的功能

- ✅ 函数名空格移除 (`max (value)` → `max(value)`)
- ✅ 自定义UDF支持
- ✅ AS关键字格式化
- ✅ SQL关键字括号处理
- 🔄 FROM子句缩进（需要修复）
- 🔄 复杂查询格式化（需要修复）
- 🔄 CASE语句格式化（需要修复）
- 🔄 多函数逗号处理（需要修复）
