import https from 'https';
import http from 'http';

const OLD = {
  url: 'ocwqgvkswqjfbtrkiymw.supabase.co',
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3Fndmtzd3FqZmJ0cmtpeW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDkyOTEsImV4cCI6MjA5NTI4NTI5MX0.WmZlF3_xC28znVT-zvbszbFAw9vN8-PUm5sVuHJrbvc',
};

const NEW = {
  url: 'iqlppalihpzbzvlixfyk.supabase.co',
  svc: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbHBwYWxpaHB6Ynp2bGl4ZnlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTIxMiwiZXhwIjoyMDk3MTg1MjEyfQ.iDjAX_8q2RxZi2y8Yg0ngt6i7cA7IvmsIDfsUuFkMjE',
};

function api(baseUrl, apiKey, role, method, path, body) {
  return new Promise((resolve, reject) => {
    const mod = baseUrl.endsWith(':443') ? https : https;
    const url = new URL(path, `https://${baseUrl}`);
    const opts = {
      hostname: baseUrl,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchAll(table) {
  const all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await api(OLD.url, OLD.anon, 'anon', 'GET', `/rest/v1/${table}?limit=${limit}&offset=${offset}&order=id`);
    if (res.status !== 200 && res.status !== 206) throw new Error(`GET ${table}: ${res.status} ${JSON.stringify(res.data)}`);
    all.push(...res.data);
    if (res.data.length < limit) break;
    offset += limit;
  }
  return all;
}

function stripCols(rows, ...omit) {
  return rows.map(r => {
    const c = { ...r };
    for (const col of omit) delete c[col];
    return c;
  });
}

async function insertAll(table, rows, ...omit) {
  if (rows.length === 0) { console.log(`  ${table}: 0 rows, skipping`); return; }
  const cleaned = stripCols(rows, ...omit);
  const res = await api(NEW.url, NEW.svc, 'service_role', 'POST', `/rest/v1/${table}`, cleaned);
  if (res.status !== 201) {
    console.error(`  ${table}: FAILED status=${res.status}`, JSON.stringify(res.data).slice(0,200));
  } else {
    console.log(`  ${table}: ${rows.length} rows migrated`);
  }
}

async function main() {
  // categories: strip parent_id (not in our schema)
  console.log('Reading categories...');
  const cats = await fetchAll('categories');
  await insertAll('categories', cats, 'parent_id');

  console.log('Reading products...');
  const products = await fetchAll('products');
  await insertAll('products', products);

  console.log('Reading problems...');
  const problems = await fetchAll('problems');
  await insertAll('problems', problems);

  console.log('Reading problem_products...');
  const pp = await fetchAll('problem_products');
  await insertAll('problem_products', pp);
  console.log('Done!');
}

main().catch(console.error);
