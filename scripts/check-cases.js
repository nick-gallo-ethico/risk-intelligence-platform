const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Login
  const auth = await post('http://localhost:3001/api/v1/auth/login', {
    email: 'demo-admin@acme.local',
    password: 'Password123!'
  });
  console.log('Login:', auth.accessToken ? 'OK' : JSON.stringify(auth));

  // Fetch cases list
  const cases = await get('http://localhost:3001/api/v1/cases?limit=5', auth.accessToken);
  console.log('Cases list status:', cases.status);
  console.log('Total cases:', cases.body.total);

  if (cases.body.data && cases.body.data.length > 0) {
    cases.body.data.slice(0, 3).forEach(c => {
      console.log(`  ${c.id} | ${c.referenceNumber} | ${c.status}`);
    });

    // Try to fetch first case by ID
    const firstId = cases.body.data[0].id;
    console.log('\nFetching case by ID:', firstId);
    const detail = await get(`http://localhost:3001/api/v1/cases/${firstId}`, auth.accessToken);
    console.log('Detail status:', detail.status);
    if (detail.status === 200) {
      console.log('Case found:', detail.body.referenceNumber, '-', detail.body.status);
    } else {
      console.log('Error:', JSON.stringify(detail.body));
    }
  } else {
    console.log('No cases returned. Body:', JSON.stringify(cases.body).substring(0, 500));
  }
}

main().catch(console.error);
