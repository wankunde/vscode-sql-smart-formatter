#!/bin/bash

# SQL Formatter Development Test Script
# 用于在开发过程中快速测试格式化器

echo "🔧 SQL Formatter Development Test"
echo "=================================="

# 检查是否有未保存的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未保存的更改，请先提交或暂存更改"
    git status --short
    echo ""
fi

# 编译TypeScript
echo "📦 编译TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ 编译失败，请检查TypeScript错误"
    exit 1
fi

echo "✅ 编译成功"
echo ""

# 运行测试
echo "🧪 运行测试..."
npm test

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！"
    echo ""
    echo "📋 下一步："
    echo "   - 如果修改了代码，请提交更改"
    echo "   - 运行 'npm run package' 创建扩展包"
    echo "   - 运行 'npm run test:ci' 进行完整CI测试"
else
    echo ""
    echo "❌ 测试失败，请检查失败的测试用例"
    echo ""
    echo "📋 调试步骤："
    echo "   - 查看 tests/failed_tests.json 了解失败详情"
    echo "   - 修复代码中的问题"
    echo "   - 重新运行此脚本"
fi
