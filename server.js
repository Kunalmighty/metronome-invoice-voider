// Local development server for API endpoints
import { createServer } from 'http';
import { parse } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
import { config } from 'dotenv';
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CORS headers for local development
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Metronome-Api-Key');
}

// Parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Create a mock response object that matches Vercel's API
function createMockRes(res) {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
      res.setHeader(key, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      res.statusCode = this.statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    },
    end() {
      res.statusCode = this.statusCode;
      res.end();
    }
  };
}

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;

  setCors(res);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    if (pathname === '/api/invoices') {
      const handler = (await import('./api/invoices.js')).default;
      const mockRes = createMockRes(res);
      await handler({ method: req.method, headers: req.headers, query: parsedUrl.query, body: await parseBody(req) }, mockRes);
    } else if (pathname === '/api/void') {
      const handler = (await import('./api/void.js')).default;
      const mockRes = createMockRes(res);
      await handler({ method: req.method, headers: req.headers, body: await parseBody(req) }, mockRes);
    } else if (pathname === '/api/void-all') {
      const handler = (await import('./api/void-all.js')).default;
      const mockRes = createMockRes(res);
      await handler({ method: req.method, headers: req.headers, body: await parseBody(req) }, mockRes);
    } else if (pathname === '/api/regenerate') {
      const handler = (await import('./api/regenerate.js')).default;
      const mockRes = createMockRes(res);
      await handler({ method: req.method, headers: req.headers, body: await parseBody(req) }, mockRes);
    } else if (pathname === '/api/regenerate-all') {
      const handler = (await import('./api/regenerate-all.js')).default;
      const mockRes = createMockRes(res);
      await handler({ method: req.method, headers: req.headers, body: await parseBody(req) }, mockRes);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 API server running at http://localhost:${PORT}`);
  console.log(`   - GET  /api/invoices       - List invoices by status`);
  console.log(`   - POST /api/void           - Void a specific invoice`);
  console.log(`   - POST /api/void-all       - Void all non-zero invoices`);
  console.log(`   - POST /api/regenerate     - Regenerate a voided invoice`);
  console.log(`   - POST /api/regenerate-all - Regenerate all voided invoices\n`);
});
