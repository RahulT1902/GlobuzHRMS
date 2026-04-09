const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, data: resBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function testLogin(identifier, password) {
  try {
    const res = await post('http://localhost:5000/api/auth/login', {
      identifier,
      password,
    });
    if (res.status === 200) {
      console.log(`PASS: Login with ${identifier} succeeded.`);
    } else {
      console.log(`FAIL: Login with ${identifier} failed (${res.status}): ${res.data?.message || res.data}`);
    }
  } catch (err) {
    console.log(`FAIL: Login with ${identifier} error: ${err.message}`);
  }
}

async function run() {
  console.log("Starting Authentication Verification (Native HTTP)...");
  
  // Test 1: Correct Credentials
  await testLogin('admin@globuzinc.com', 'Admin@12345');
  
  // Test 2: Username "admin" (should now fail gracefully)
  await testLogin('admin', 'Admin@12345');
  
  // Test 3: Phone
  await testLogin('9876543210', 'Admin@12345');
}

run();
