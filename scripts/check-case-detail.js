const http = require('http');

function request(method, url, token, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Login
  const auth = await request('POST', 'http://localhost:3001/api/v1/auth/login', null, {
    email: 'demo-admin@acme.local',
    password: 'Password123!'
  });
  const token = auth.body.accessToken;
  console.log('Login:', token ? 'OK' : JSON.stringify(auth.body));

  // Get cases list
  const list = await request('GET', 'http://localhost:3001/api/v1/cases?limit=3', token);
  console.log('\n--- Cases List ---');
  console.log('Status:', list.status, '| Total:', list.body.total);

  if (list.body.data && list.body.data.length > 0) {
    const firstCase = list.body.data[0];
    console.log('\nFirst case from list:');
    console.log('  ID:', firstCase.id);
    console.log('  Ref:', firstCase.referenceNumber);
    console.log('  Status:', firstCase.status);

    // Now fetch that same case by ID
    console.log('\n--- Fetching case by ID ---');
    const detail = await request('GET', `http://localhost:3001/api/v1/cases/${firstCase.id}`, token);
    console.log('Status:', detail.status);
    if (detail.status === 200) {
      console.log('  Ref:', detail.body.referenceNumber);
      console.log('  Title:', detail.body.title);
      console.log('  Keys:', Object.keys(detail.body).join(', '));
    } else {
      console.log('  Error:', JSON.stringify(detail.body));
    }

    // Also try with a flagship case - check for any ID from the list
    if (list.body.data.length > 1) {
      const secondCase = list.body.data[1];
      console.log('\n--- Fetching second case by ID ---');
      const detail2 = await request('GET', `http://localhost:3001/api/v1/cases/${secondCase.id}`, token);
      console.log('Status:', detail2.status);
      if (detail2.status === 200) {
        console.log('  Ref:', detail2.body.referenceNumber);
      } else {
        console.log('  Error:', JSON.stringify(detail2.body));
      }
    }
  }

  // Check if the frontend might be using a different URL pattern
  // Try fetching with a bad ID to see error format
  console.log('\n--- Testing bad ID ---');
  const badResult = await request('GET', 'http://localhost:3001/api/v1/cases/not-a-uuid', token);
  console.log('Bad ID status:', badResult.status);
  console.log('Bad ID body:', JSON.stringify(badResult.body));
}

main().catch(console.error);
