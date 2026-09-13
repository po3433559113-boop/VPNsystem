import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { WebSocketServer } from 'ws';

// 1. WebCrypto MD5 Polyfill for Node.js (needed for MD5MD5 hashing in _worker.js)
const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
globalThis.crypto.subtle.digest = async function (algorithm, data) {
  const algoName = typeof algorithm === 'string' ? algorithm.toUpperCase() : algorithm?.name?.toUpperCase();
  if (algoName === 'MD5') {
    const hash = crypto.createHash('md5');
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    hash.update(u8);
    const buf = hash.digest();
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return originalDigest(algorithm, data);
};

// 2. WebSocketPair Polyfill for Cloudflare Workers
class WorkerWebSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // WebSocket.OPEN
    this.binaryType = 'arraybuffer';
    this.peer = null;
  }

  accept() {
    this.readyState = 1;
  }

  send(data) {
    if (this.readyState !== 1) return;
    if (this.peer) {
      queueMicrotask(() => {
        if (this.peer && this.peer.readyState === 1) {
          const evt = { data };
          this.peer.emit('message', evt);
        }
      });
    }
  }

  close(code = 1000, reason = '') {
    if (this.readyState === 3) return;
    this.readyState = 3;
    const evt = { code, reason };
    this.emit('close', evt);
    if (this.peer && this.peer.readyState !== 3) {
      this.peer.readyState = 3;
      this.peer.emit('close', evt);
    }
  }

  addEventListener(type, listener) {
    this.on(type, listener);
  }

  removeEventListener(type, listener) {
    this.off(type, listener);
  }
}

globalThis.WebSocketPair = class WebSocketPair {
  constructor() {
    const sock0 = new WorkerWebSocket();
    const sock1 = new WorkerWebSocket();
    sock0.peer = sock1;
    sock1.peer = sock0;
    this[0] = sock0;
    this[1] = sock1;
  }
};

// 5. Import the Cloudflare Worker module and traffic engine
import { trafficEngine } from './trafficEngine.js';
import { renderAdminHtml } from './adminHtml.js';
import { renderLoginHtml, renderNoAdminHtml } from './loginHtml.js';
const { default: worker } = await import('./_worker.js');

// MD5 Helper
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// 3. Node TCP Socket connector for Cloudflare Workers socket connect (with Traffic & Rate Limit integration)
function createNodeSocket(options) {
  const { hostname, port } = options;
  const rawSocket = net.connect({ host: hostname, port: Number(port) });
  trafficEngine.addActiveConnection();

  let resolveOpened, rejectOpened;
  const opened = new Promise((resolve, reject) => {
    resolveOpened = resolve;
    rejectOpened = reject;
  });

  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });

  let cleanedUp = false;
  const cleanup = () => {
    if (!cleanedUp) {
      cleanedUp = true;
      trafficEngine.removeActiveConnection();
    }
  };

  rawSocket.on('connect', () => resolveOpened());
  rawSocket.on('error', (err) => {
    cleanup();
    rejectOpened(err);
    resolveClosed();
  });
  rawSocket.on('close', () => {
    cleanup();
    resolveClosed();
  });

  const readable = new ReadableStream({
    start(controller) {
      rawSocket.on('data', async (chunk) => {
        const u8 = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        await trafficEngine.throttleDownload(u8.byteLength);
        controller.enqueue(u8);
      });
      rawSocket.on('end', () => {
        cleanup();
        try { controller.close(); } catch (_) {}
      });
      rawSocket.on('error', (err) => {
        cleanup();
        try { controller.error(err); } catch (_) {}
      });
    },
    cancel() {
      cleanup();
      rawSocket.destroy();
    }
  });

  const writable = new WritableStream({
    async write(chunk) {
      await trafficEngine.throttleUpload(chunk.length);
      return new Promise((resolve, reject) => {
        rawSocket.write(Buffer.from(chunk), (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    close() {
      cleanup();
      rawSocket.end();
    },
    abort() {
      cleanup();
      rawSocket.destroy();
    }
  });

  return {
    readable,
    writable,
    opened,
    closed,
    close() {
      cleanup();
      rawSocket.destroy();
    }
  };
}

// 4. In-Memory and File-Backed KV Store
const KV_FILE = path.join(process.cwd(), '.kv_store.json');
let kvData = {};
try {
  if (fs.existsSync(KV_FILE)) {
    kvData = JSON.parse(fs.readFileSync(KV_FILE, 'utf-8'));
  }
} catch (_) {
  kvData = {};
}

function saveKV() {
  try {
    fs.writeFileSync(KV_FILE, JSON.stringify(kvData, null, 2));
  } catch (e) {
    console.error('Failed to save KV to disk:', e);
  }
}

const KV = {
  async get(key) {
    return kvData[key] ?? null;
  },
  async put(key, val) {
    kvData[key] = String(val);
    saveKV();
  },
  async delete(key) {
    delete kvData[key];
    saveKV();
  },
  async list() {
    return { keys: Object.keys(kvData).map(name => ({ name })) };
  }
};

const PORT = 3000;
const HOST = '0.0.0.0';

const STRIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive'
]);

// Helper for checking admin authentication
function checkAuth(req, adminPass, key) {
  const cookies = req.headers.cookie || '';
  const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='))?.split('=')[1]?.trim();
  const ua = req.headers['user-agent'] || 'null';
  const expectedHash = md5(md5(ua + key + adminPass));
  return authCookie === expectedHash;
}

// 6. Build the HTTP & WebSocket Server
const server = http.createServer(async (nodeReq, nodeRes) => {
  try {
    const hostHeader = nodeReq.headers.host || `localhost:${PORT}`;
    const url = new URL(nodeReq.url || '/', `https://${hostHeader}`);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const adminPass = process.env.ADMIN || process.env.admin || process.env.PASSWORD || process.env.password || process.env.pswd || process.env.TOKEN || process.env.KEY || process.env.UUID || process.env.uuid;
    const secretKey = process.env.KEY || '勿动此默认密钥，有需求请自行通过添加变量KEY进行修改';
    const ua = nodeReq.headers['user-agent'] || 'null';

    // A. Real-time Speed Telemetry Stream (SSE)
    if (pathname === '/admin/speed_stream') {
      if (!adminPass || !checkAuth(nodeReq, adminPass, secretKey)) {
        nodeRes.statusCode = 401;
        nodeRes.end('Unauthorized');
        return;
      }
      nodeRes.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      nodeRes.write(`data: ${JSON.stringify(trafficEngine.getStats())}\n\n`);
      trafficEngine.addSubscriber(nodeRes);
      nodeReq.on('close', () => {
        trafficEngine.removeSubscriber(nodeRes);
      });
      return;
    }

    // B. Real-time Speed Statistics JSON API
    if (pathname === '/admin/speed_stats') {
      nodeRes.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      nodeRes.end(JSON.stringify(trafficEngine.getStats()));
      return;
    }

    // C. Update Rate Limits API
    if (pathname === '/admin/speed/limit' && nodeReq.method === 'POST') {
      let bodyStr = '';
      nodeReq.on('data', chunk => { bodyStr += chunk; });
      nodeReq.on('end', async () => {
        try {
          const payload = JSON.parse(bodyStr || '{}');
          const updated = trafficEngine.updateLimits(payload);
          await KV.put('rate_limits.json', JSON.stringify(updated, null, 2));
          nodeRes.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          nodeRes.end(JSON.stringify({ success: true, rateLimits: updated }));
        } catch (e) {
          nodeRes.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          nodeRes.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // D. Speed Test Sandbox Endpoints
    if (pathname === '/admin/speedtest/ping') {
      nodeRes.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      nodeRes.end(JSON.stringify({ pong: Date.now() }));
      return;
    }

    if (pathname === '/admin/speedtest/download') {
      const sizeMB = Math.min(100, Math.max(1, Number(url.searchParams.get('size')) || 20));
      const totalBytes = sizeMB * 1024 * 1024;
      const chunkSize = 64 * 1024; // 64KB chunk
      const chunk = Buffer.alloc(chunkSize, 0x5a);

      nodeRes.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(totalBytes),
        'Cache-Control': 'no-store'
      });

      let sent = 0;
      while (sent < totalBytes) {
        const toSend = Math.min(chunkSize, totalBytes - sent);
        await trafficEngine.throttleDownload(toSend);
        if (nodeRes.destroyed || nodeRes.writableEnded) break;
        nodeRes.write(chunk.subarray(0, toSend));
        sent += toSend;
      }
      nodeRes.end();
      return;
    }

    if (pathname === '/admin/speedtest/upload' && nodeReq.method === 'POST') {
      let receivedBytes = 0;
      nodeReq.on('data', async chunk => {
        receivedBytes += chunk.length;
        await trafficEngine.throttleUpload(chunk.length);
      });
      nodeReq.on('end', () => {
        nodeRes.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        nodeRes.end(JSON.stringify({ success: true, receivedBytes }));
      });
      return;
    }

    // E. No ADMIN guide page
    if (pathname === '/noADMIN') {
      nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      nodeRes.end(renderNoAdminHtml());
      return;
    }

    // F. Admin Dashboard View
    if (pathname === '/admin') {
      if (!adminPass) {
        nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        nodeRes.end(renderNoAdminHtml());
        return;
      }

      const isAuthed = checkAuth(nodeReq, adminPass, secretKey);
      if (!isAuthed) {
        nodeRes.writeHead(302, { 'Location': '/login' });
        nodeRes.end();
        return;
      }

      // Fetch or build config
      let cfg = {};
      try {
        const cfgStr = await KV.get('config.json');
        if (cfgStr) cfg = JSON.parse(cfgStr);
      } catch (_) {}

      const host = hostHeader.split(':')[0];
      const userID = process.env.UUID || (cfg.UUID || '4a532356-8208-4338-89f5-e62a2fa809ef');

      const html = renderAdminHtml({
        host: hostHeader,
        userID,
        config: cfg,
        rateLimits: trafficEngine.rateLimits,
        stats: trafficEngine.getStats()
      });

      nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      nodeRes.end(html);
      return;
    }

    // G. Login Page View
    if (pathname === '/login') {
      if (!adminPass) {
        nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        nodeRes.end(renderNoAdminHtml());
        return;
      }

      if (checkAuth(nodeReq, adminPass, secretKey) && nodeReq.method === 'GET') {
        nodeRes.writeHead(302, { 'Location': '/admin' });
        nodeRes.end();
        return;
      }

      if (nodeReq.method === 'POST') {
        let bodyStr = '';
        nodeReq.on('data', chunk => { bodyStr += chunk; });
        nodeReq.on('end', async () => {
          const params = new URLSearchParams(bodyStr);
          const inputPwd = params.get('password') || '';
          const targetPwd = typeof adminPass === 'string' ? adminPass.replace(/[\r\n]/g, '') : adminPass;
          if (inputPwd === targetPwd) {
            const authHash = md5(md5(ua + secretKey + adminPass));
            nodeRes.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Set-Cookie': `auth=${authHash}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`
            });
            nodeRes.end(JSON.stringify({ success: true }));
          } else {
            nodeRes.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            nodeRes.end(JSON.stringify({ success: false, error: '密码错误，请确认 Cloudflare 变量与机密中的 ADMIN 文本' }));
          }
        });
        return;
      }

      nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      nodeRes.end(renderLoginHtml());
      return;
    }

    // H. Logout Endpoint
    if (pathname === '/logout') {
      nodeRes.writeHead(302, {
        'Location': '/login',
        'Set-Cookie': 'auth=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
      });
      nodeRes.end();
      return;
    }

    // I. Root view
    if (pathname === '/') {
      nodeRes.writeHead(302, { 'Location': '/admin' });
      nodeRes.end();
      return;
    }

    // J. Forward other requests to Cloudflare Worker logic (_worker.js)
    const headers = new Headers();
    for (const [key, val] of Object.entries(nodeReq.headers)) {
      if (val === undefined) continue;
      if (Array.isArray(val)) {
        for (const v of val) headers.append(key, v);
      } else {
        headers.set(key, val);
      }
    }

    const hasBody = !['GET', 'HEAD'].includes(nodeReq.method || 'GET');
    let requestBody = null;

    if (hasBody) {
      requestBody = new ReadableStream({
        start(controller) {
          nodeReq.on('data', chunk => {
            controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
          });
          nodeReq.on('end', () => controller.close());
          nodeReq.on('error', err => controller.error(err));
        }
      });
    }

    const request = new Request(url.toString(), {
      method: nodeReq.method || 'GET',
      headers,
      body: requestBody,
      // @ts-ignore
      duplex: hasBody ? 'half' : undefined
    });

    request.cf = {
      colo: process.env.CF_COLO || 'SJC',
      asn: 13335,
      country: 'US',
      city: 'San Jose',
      latitude: 37.3382,
      longitude: -121.8863
    };

    request.fetcher = {
      connect(options, init) {
        return createNodeSocket(options);
      }
    };

    const env = {
      ADMIN: process.env.ADMIN || undefined,
      admin: process.env.admin || undefined,
      PASSWORD: process.env.PASSWORD || undefined,
      password: process.env.password || undefined,
      pswd: process.env.pswd || undefined,
      TOKEN: process.env.TOKEN || undefined,
      KEY: process.env.KEY || undefined,
      UUID: process.env.UUID || undefined,
      HOST: process.env.HOST || undefined,
      DEBUG: process.env.DEBUG || undefined,
      PROXYIP: process.env.PROXYIP || undefined,
      URL: process.env.URL || undefined,
      GO2SOCKS5: process.env.GO2SOCKS5 || undefined,
      OFF_LOG: process.env.OFF_LOG || undefined,
      BEST_SUB: process.env.BEST_SUB || undefined,
      PRELOAD_RACE_DIAL: process.env.PRELOAD_RACE_DIAL || undefined,
      TCP_CONCURRENT_DIAL: process.env.TCP_CONCURRENT_DIAL || undefined,
      PROXY_CONCURRENT_DIAL: process.env.PROXY_CONCURRENT_DIAL || undefined,
      KV
    };

    const ctx = {
      waitUntil(promise) {
        Promise.resolve(promise).catch(err => {
          if (process.env.DEBUG === '1' || process.env.DEBUG === 'true') {
            console.error('[waitUntil error]:', err);
          }
        });
      }
    };

    const response = await worker.fetch(request, env, ctx);

    nodeRes.statusCode = response.status;
    const cookies = [];
    response.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower === 'set-cookie') {
        cookies.push(val);
      } else if (!STRIP_RESPONSE_HEADERS.has(lower)) {
        nodeRes.setHeader(key, val);
      }
    });

    if (cookies.length > 0) {
      nodeRes.setHeader('Set-Cookie', cookies);
    }

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        nodeRes.write(Buffer.from(value));
      }
    }
    nodeRes.end();
  } catch (error) {
    console.error('Request handler error:', error);
    if (!nodeRes.headersSent) {
      nodeRes.statusCode = 500;
      nodeRes.setHeader('Content-Type', 'text/plain; charset=utf-8');
      nodeRes.end('Internal Server Error: ' + (error?.message || error));
    }
  }
});

// WebSocket Server for tunneling
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (nodeReq, socket, head) => {
  try {
    const hostHeader = nodeReq.headers.host || `localhost:${PORT}`;
    const url = new URL(nodeReq.url || '/', `https://${hostHeader}`);

    const headers = new Headers();
    for (const [key, val] of Object.entries(nodeReq.headers)) {
      if (val === undefined) continue;
      if (Array.isArray(val)) {
        for (const v of val) headers.append(key, v);
      } else {
        headers.set(key, val);
      }
    }

    const request = new Request(url.toString(), {
      method: 'GET',
      headers
    });

    request.cf = {
      colo: process.env.CF_COLO || 'SJC',
      asn: 13335,
      country: 'US',
      city: 'San Jose',
      latitude: 37.3382,
      longitude: -121.8863
    };

    request.fetcher = {
      connect(options) {
        return createNodeSocket(options);
      }
    };

    const env = {
      ADMIN: process.env.ADMIN || undefined,
      admin: process.env.admin || undefined,
      PASSWORD: process.env.PASSWORD || undefined,
      password: process.env.password || undefined,
      pswd: process.env.pswd || undefined,
      TOKEN: process.env.TOKEN || undefined,
      KEY: process.env.KEY || undefined,
      UUID: process.env.UUID || undefined,
      HOST: process.env.HOST || undefined,
      DEBUG: process.env.DEBUG || undefined,
      PROXYIP: process.env.PROXYIP || undefined,
      URL: process.env.URL || undefined,
      GO2SOCKS5: process.env.GO2SOCKS5 || undefined,
      OFF_LOG: process.env.OFF_LOG || undefined,
      BEST_SUB: process.env.BEST_SUB || undefined,
      PRELOAD_RACE_DIAL: process.env.PRELOAD_RACE_DIAL || undefined,
      TCP_CONCURRENT_DIAL: process.env.TCP_CONCURRENT_DIAL || undefined,
      PROXY_CONCURRENT_DIAL: process.env.PROXY_CONCURRENT_DIAL || undefined,
      KV
    };

    const ctx = {
      waitUntil(promise) {
        Promise.resolve(promise).catch(console.error);
      }
    };

    const workerResp = await worker.fetch(request, env, ctx);
    if (workerResp.status === 101 && workerResp.webSocket) {
      wss.handleUpgrade(nodeReq, socket, head, (clientWs) => {
        trafficEngine.addActiveConnection();
        const workerClientSock = workerResp.webSocket;
        const workerServerSock = workerClientSock.peer;

        let closedWs = false;
        const cleanupWs = () => {
          if (!closedWs) {
            closedWs = true;
            trafficEngine.removeActiveConnection();
          }
        };

        clientWs.on('message', async (data, isBinary) => {
          const raw = isBinary ? (data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) : data.toString();
          const len = raw.byteLength || raw.length || 0;
          await trafficEngine.throttleUpload(len);
          if (workerServerSock && workerServerSock.readyState === 1) {
            workerServerSock.emit('message', { data: raw });
          }
        });

        workerClientSock.on('message', async (evt) => {
          const len = (evt.data && (evt.data.byteLength || evt.data.length)) || 0;
          await trafficEngine.throttleDownload(len);
          if (clientWs.readyState === 1) {
            clientWs.send(evt.data);
          }
        });

        clientWs.on('close', (code, reason) => {
          cleanupWs();
          workerClientSock.close(code, reason?.toString());
        });

        workerClientSock.on('close', (evt) => {
          cleanupWs();
          clientWs.close(evt.code, evt.reason);
        });
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    console.error('WebSocket upgrade error:', err);
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`edgetunnel server running on http://${HOST}:${PORT}`);
  console.log(`Admin Panel available at http://${HOST}:${PORT}/admin (Password: ${process.env.ADMIN || 'admin'})`);
});
