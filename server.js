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

// 3. Live Log Manager for Real-Time Server Event Broadcasting
class LiveLogManager {
  constructor(maxLogs = 800) {
    this.maxLogs = maxLogs;
    this.logs = [];
    this.counter = 0;
    this.subscribers = new Set();
  }

  add(level, tag, message, details = null) {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

    const logItem = {
      id: ++this.counter,
      time: timeStr,
      timestamp: Date.now(),
      level: String(level || 'info').toLowerCase(),
      tag: String(tag || 'SYSTEM').toUpperCase(),
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      details: details ? (typeof details === 'object' ? details : { text: String(details) }) : undefined
    };

    this.logs.push(logItem);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const sseChunk = `event: log\ndata: ${JSON.stringify(logItem)}\n\n`;
    for (const sub of this.subscribers) {
      try {
        sub.enqueue(new TextEncoder().encode(sseChunk));
      } catch (_) {
        this.subscribers.delete(sub);
      }
    }

    return logItem;
  }

  getRecent(count = 100) {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
    return this.add('system', 'SYSTEM', '实时运行日志已清空 (Live logs cleared by admin)');
  }

  subscribe(controller) {
    this.subscribers.add(controller);
    return () => {
      this.subscribers.delete(controller);
    };
  }
}

const liveLogger = new LiveLogManager();
globalThis.__liveLogger = liveLogger;
liveLogger.add('system', 'SYSTEM', '服务核心引擎已启动 (Node.js 22 Runtime Bridge Online)');

// 4. Node TCP Socket connector for Cloudflare Workers socket connect
let socketCounter = 0;
function createNodeSocket(options) {
  const socketId = ++socketCounter;
  const { hostname, port } = options;
  liveLogger.add('proxy', 'TCP', `[Socket #${socketId}] 正在建立外发 TCP 代理连接 -> ${hostname}:${port}`);
  
  const rawSocket = net.connect({ host: hostname, port: Number(port) });
  let bytesReceived = 0;
  let bytesSent = 0;

  let resolveOpened, rejectOpened;
  const opened = new Promise((resolve, reject) => {
    resolveOpened = resolve;
    rejectOpened = reject;
  });

  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });

  rawSocket.on('connect', () => {
    liveLogger.add('proxy', 'TCP', `[Socket #${socketId}] TCP 代理已连通: ${hostname}:${port}`);
    resolveOpened();
  });

  rawSocket.on('error', (err) => {
    liveLogger.add('error', 'TCP', `[Socket #${socketId}] TCP 代理异常: ${err?.message || err}`);
    rejectOpened(err);
    resolveClosed();
  });

  rawSocket.on('close', () => {
    liveLogger.add('proxy', 'TCP', `[Socket #${socketId}] TCP 代理连接关闭 (入: ${bytesReceived}B / 出: ${bytesSent}B)`);
    resolveClosed();
  });

  const readable = new ReadableStream({
    start(controller) {
      rawSocket.on('data', (chunk) => {
        bytesReceived += chunk.length;
        controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      });
      rawSocket.on('end', () => {
        try { controller.close(); } catch (_) {}
      });
      rawSocket.on('error', (err) => {
        try { controller.error(err); } catch (_) {}
      });
    },
    cancel() {
      rawSocket.destroy();
    }
  });

  const writable = new WritableStream({
    write(chunk) {
      bytesSent += chunk.length;
      return new Promise((resolve, reject) => {
        rawSocket.write(Buffer.from(chunk), (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    close() {
      rawSocket.end();
    },
    abort() {
      rawSocket.destroy();
    }
  });

  return {
    readable,
    writable,
    opened,
    closed,
    close() {
      rawSocket.destroy();
    }
  };
}

// 5. In-Memory and File-Backed KV Store
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

// 5. Import the Cloudflare Worker module
const { default: worker } = await import('./_worker.js');

const PORT = 3000;
const HOST = '0.0.0.0';

const STRIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive'
]);

// 6. Build the HTTP & WebSocket Server
const server = http.createServer(async (nodeReq, nodeRes) => {
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
      ADMIN: process.env.ADMIN || 'admin',
      KEY: process.env.KEY || 'edgetunnel',
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

    const startTime = Date.now();
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

    if (!url.pathname.includes('/live-logs/sse')) {
      const clientIp = nodeReq.headers['cf-connecting-ip'] || nodeReq.headers['x-forwarded-for'] || nodeReq.socket.remoteAddress || '127.0.0.1';
      const duration = Date.now() - startTime;
      const statusLevel = response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info';
      liveLogger.add(statusLevel, 'HTTP', `${nodeReq.method || 'GET'} ${url.pathname} - ${response.status} (${duration}ms) [${clientIp}]`);
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
      ADMIN: process.env.ADMIN || 'admin',
      KEY: process.env.KEY || 'edgetunnel',
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
      liveLogger.add('proxy', 'WS', `[WebSocket 隧道握手成功] 协议已升级: ${url.pathname}`);
      wss.handleUpgrade(nodeReq, socket, head, (clientWs) => {
        const workerClientSock = workerResp.webSocket;
        const workerServerSock = workerClientSock.peer;

        clientWs.on('message', (data, isBinary) => {
          if (workerServerSock && workerServerSock.readyState === 1) {
            const raw = isBinary ? (data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) : data.toString();
            workerServerSock.emit('message', { data: raw });
          }
        });

        workerClientSock.on('message', (evt) => {
          if (clientWs.readyState === 1) {
            clientWs.send(evt.data);
          }
        });

        clientWs.on('close', (code, reason) => {
          workerClientSock.close(code, reason?.toString());
        });

        workerClientSock.on('close', (evt) => {
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
