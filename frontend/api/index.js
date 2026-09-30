import { handler } from '../lib/api/handler.mjs';

const readBody = (req) => new Promise((resolve, reject) => {
  if (req.body !== undefined && req.body !== null) {
    resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    return;
  }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

const toEvent = async (req) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const method = (req.method || 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return {
    httpMethod: method,
    path: url.pathname,
    rawUrl: req.url || '/',
    rawQueryString: url.search.replace(/^\?/, ''),
    queryStringParameters: req.query || Object.fromEntries(url.searchParams),
    headers: req.headers || {},
    body: hasBody ? await readBody(req) : null,
    isBase64Encoded: false,
  };
};

// Vercel's Node runtime invokes the entrypoint as (req, res) and only considers
// the request finished once res.end() is called. Returning a value without
// writing to res leaves the invocation open until the 300s runtime timeout.
export default async function vercelHandler(req, res) {
  try {
    const result = await handler(await toEvent(req));
    res.statusCode = result.statusCode || 200;
    for (const [name, value] of Object.entries(result.headers || {})) {
      res.setHeader(name, value);
    }
    res.end(result.body);
  } catch (error) {
    console.error('unhandled API error', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
    }));
  }
}
