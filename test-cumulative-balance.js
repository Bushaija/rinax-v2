// Test cumulative balance calculation logic
// Copy and paste this into your browser console to test

console.log('=== Testing Cumulative Balance Logic ===\n');

// Test getLatestQuarterValue function
function getLatestQuarterValue(q1, q2, q3, q4) {
  console.log(`Testing with Q1=${q1}, Q2=${q2}, Q3=${q3}, Q4=${q4}`);
  
  if (q4 !== 0) {
    console.log(`  → Returning Q4: ${q4}`);
    return q4;
  }
  if (q3 !== 0) {
    console.log(`  → Returning Q3: ${q3}`);
    return q3;
  }
  if (q2 !== 0) {
    console.log(`  → Returning Q2: ${q2}`);
    return q2;
  }
  if (q1 !== 0) {
    console.log(`  → Returning Q1: ${q1}`);
    return q1;
  }
  console.log(`  → All zeros, returning 0`);
  return 0;
}

// Test Case 1: Your scenario
console.log('\n📊 Test Case 1: Cash at bank (Q1=25000, Q2=20000)');
const result1 = getLatestQuarterValue(25000, 20000, 0, 0);
console.log(`✅ Expected: 20000, Got: ${result1}, ${result1 === 20000 ? 'PASS' : 'FAIL'}\n`);

// Test Case 2: Only Q1 has value
console.log('📊 Test Case 2: Only Q1 (Q1=10000, Q2=0)');
const result2 = getLatestQuarterValue(10000, 0, 0, 0);
console.log(`✅ Expected: 10000, Got: ${result2}, ${result2 === 10000 ? 'PASS' : 'FAIL'}\n`);

// Test Case 3: Q4 has value (latest)
console.log('📊 Test Case 3: Q4 latest (Q1=5000, Q2=10000, Q3=15000, Q4=20000)');
const result3 = getLatestQuarterValue(5000, 10000, 15000, 20000);
console.log(`✅ Expected: 20000, Got: ${result3}, ${result3 === 20000 ? 'PASS' : 'FAIL'}\n`);

// Test Case 4: Q3 is latest (Q4 is 0)
console.log('📊 Test Case 4: Q3 latest (Q1=5000, Q2=10000, Q3=15000, Q4=0)');
const result4 = getLatestQuarterValue(5000, 10000, 15000, 0);
console.log(`✅ Expected: 15000, Got: ${result4}, ${result4 === 15000 ? 'PASS' : 'FAIL'}\n`);

// Test Case 5: All zeros
console.log('📊 Test Case 5: All zeros');
const result5 = getLatestQuarterValue(0, 0, 0, 0);
console.log(`✅ Expected: 0, Got: ${result5}, ${result5 === 0 ? 'PASS' : 'FAIL'}\n`);

console.log('=== All Tests Complete ===');
