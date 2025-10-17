// 测试括号后逗号修复
const { simpleSqlFormat } = require('./tests/test_runner.js');

const testCases = [
  'SELECT (col1) , (col2) , (col3) FROM table',
  'WITH ord_all AS (SELECT biz FROM table) , date_all AS (SELECT date FROM table)',
  'SELECT max (col1) , min (col2) , (col3) FROM table'
];

console.log('🧪 Testing Parenthesis-Comma Spacing Fix\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  console.log('Input:   ', testCase);
  const result = simpleSqlFormat(testCase, '  ');
  console.log('Output:  ', result);
  console.log('');
});
