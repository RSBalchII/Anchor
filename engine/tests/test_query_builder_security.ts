/**
 * Security tests for QueryBuilder to ensure field identifiers are properly validated
 * to prevent SQL injection attacks
 */

import { QueryBuilder } from '../src/services/query-builder/QueryBuilder.js';

// Mock database interface for testing
const mockDb = {
  async run(query: string, params?: any[]) {
    return { rows: [], fields: [] };
  }
};

function testValidIdentifiers() {
  console.log('Testing valid identifiers...');
  
  try {
    // Valid table names
    new QueryBuilder(mockDb, 'users');
    new QueryBuilder(mockDb, 'user_data');
    new QueryBuilder(mockDb, '_private');
    new QueryBuilder(mockDb, 'table123');
    
    // Valid field names in select
    const qb1 = new QueryBuilder(mockDb, 'users');
    qb1.select(['id', 'name', 'email_address', 'created_at']);
    
    // Valid field names in where
    const qb2 = new QueryBuilder(mockDb, 'users');
    qb2.where('user_id', '=', 1);
    
    // Valid field names in orderBy
    const qb3 = new QueryBuilder(mockDb, 'users');
    qb3.orderBy('created_at', 'DESC');
    
    console.log('✓ All valid identifiers passed');
    return true;
  } catch (error) {
    console.error('✗ Valid identifier test failed:', error.message);
    return false;
  }
}

function testInvalidIdentifiers() {
  console.log('Testing invalid identifiers (SQL injection attempts)...');
  
  const invalidNames = [
    'user"; DROP TABLE users; --',
    'name"',
    'field WITH spaces',
    'field-with-dashes',
    'field.with.dots',
    '123startsWithNumber',
    'field`with`backticks',
    'field\'with\'quotes',
    'field"with"doublequotes',
    'field;semicolon',
    'field(parenthesis)',
    'field[bracket]',
    'field{brace}',
  ];
  
  let allFailed = true;
  
  // Test invalid table names
  for (const name of invalidNames) {
    try {
      new QueryBuilder(mockDb, name);
      console.error(`✗ Should have rejected table name: "${name}"`);
      allFailed = false;
    } catch (error) {
      // Expected to fail
    }
  }
  
  // Test invalid field names in select
  for (const name of invalidNames) {
    try {
      const qb = new QueryBuilder(mockDb, 'users');
      qb.select([name]);
      console.error(`✗ Should have rejected field name in select: "${name}"`);
      allFailed = false;
    } catch (error) {
      // Expected to fail
    }
  }
  
  // Test invalid field names in where
  for (const name of invalidNames) {
    try {
      const qb = new QueryBuilder(mockDb, 'users');
      qb.where(name, '=', 'value');
      console.error(`✗ Should have rejected field name in where: "${name}"`);
      allFailed = false;
    } catch (error) {
      // Expected to fail
    }
  }
  
  // Test invalid field names in orderBy
  for (const name of invalidNames) {
    try {
      const qb = new QueryBuilder(mockDb, 'users');
      qb.orderBy(name);
      console.error(`✗ Should have rejected field name in orderBy: "${name}"`);
      allFailed = false;
    } catch (error) {
      // Expected to fail
    }
  }
  
  if (allFailed) {
    console.log('✓ All invalid identifiers were properly rejected');
  }
  
  return allFailed;
}

function testSQLGeneration() {
  console.log('Testing SQL generation with validated identifiers...');
  
  try {
    const qb = new QueryBuilder(mockDb, 'users');
    qb.select(['id', 'name', 'email'])
      .where('status', '=', 'active')
      .orderBy('created_at', 'DESC')
      .limit(10);
    
    const { sql, params } = qb.getSQL();
    
    // Verify the SQL is properly formatted
    if (!sql.includes('SELECT "id", "name", "email"')) {
      throw new Error('SQL select clause not formatted correctly');
    }
    if (!sql.includes('FROM "users"')) {
      throw new Error('SQL from clause not formatted correctly');
    }
    if (!sql.includes('WHERE "status" = $1')) {
      throw new Error('SQL where clause not formatted correctly');
    }
    if (!sql.includes('ORDER BY "created_at" DESC')) {
      throw new Error('SQL order by clause not formatted correctly');
    }
    if (!sql.includes('LIMIT 10')) {
      throw new Error('SQL limit clause not formatted correctly');
    }
    if (params.length !== 1 || params[0] !== 'active') {
      throw new Error('Parameters not correct');
    }
    
    console.log('✓ SQL generation test passed');
    console.log('  Generated SQL:', sql);
    return true;
  } catch (error) {
    console.error('✗ SQL generation test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n=== QueryBuilder Security Tests ===\n');
  
  const results = [
    testValidIdentifiers(),
    testInvalidIdentifiers(),
    testSQLGeneration(),
  ];
  
  const allPassed = results.every(r => r);
  
  console.log('\n=== Test Results ===');
  if (allPassed) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

runTests();
