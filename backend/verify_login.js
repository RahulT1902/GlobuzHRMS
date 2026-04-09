const axios = require('axios');

async function testLogin(identifier, password) {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      identifier,
      password
    });
    console.log(`PASS: Login with ${identifier} succeeded.`);
    return true;
  } catch (err) {
    console.log(`FAIL: Login with ${identifier} failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function run() {
  console.log("Starting Authentication Verification...");
  
  // Test 1: Correct Credentials
  await testLogin('admin@globuzinc.com', 'admin123');
  
  // Test 2: Username "admin" (should now fail with 401 instead of being mangled to '+')
  await testLogin('admin', 'admin123');
  
  // Test 3: Phone
  await testLogin('9876543210', 'admin123');
}

run();
