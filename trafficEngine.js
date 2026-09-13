// trafficEngine.js - Real-time Network Traffic Monitor & Token-Bucket Rate Limiter
import fs from 'node:fs';
import path from 'node:path';

class TrafficEngine {
  constructor() {
    this.totalUploadBytes = 0;
    this.totalDownloadBytes = 0;
    this.activeConnections = 0;
    this.totalConnections = 0;
    this.startTime = Date.now();

    // Speed calculation window (1-second tick)
    this.currentUploadSpeed = 0;   // bytes per second
    this.currentDownloadSpeed = 0; // bytes per second
    this.peakUploadSpeed = 0;
    this.peakDownloadSpeed = 0;

    // Second-level accumulator
    this.bytesUploadedThisSec = 0;
    this.bytesDownloadedThisSec = 0;
    this.lastSecTick = Date.now();

    // 60-second historical speed buffer for charts
    this.historyLength = 60;
    this.speedHistory = [];
    const now = Date.now();
    for (let i = this.historyLength - 1; i >= 0; i--) {
      this.speedHistory.push({
        time: now - i * 1000,
        up: 0,
        down: 0,
        active: 0
      });
    }

    // Rate Limiting settings (Token Bucket)
    this.rateLimits = {
      enabled: false,
      uploadLimitKBps: 0,   // 0 = unlimited, otherwise in KB/s
      downloadLimitKBps: 0, // 0 = unlimited, otherwise in KB/s
      mode: 'unlimited',    // 'unlimited' | 'streaming' | 'balanced' | 'saving' | 'gaming' | 'custom'
      burstKB: 64           // Allowed burst in KB
    };

    // Token bucket state
    this.upTokens = 0;
    this.downTokens = 0;
    this.lastTokenRefill = Date.now();

    // SSE Subscribers
    this.subscribers = new Set();

    // Start background ticker (1-second interval)
    this.ticker = setInterval(() => this.tick(), 1000);
    if (this.ticker.unref) this.ticker.unref();

    // Try load persisted rate limits from disk
    this.loadPersistedLimits();
  }

  loadPersistedLimits() {
    try {
      const limitsFile = path.join(process.cwd(), '.rate_limits.json');
      if (fs.existsSync(limitsFile)) {
        const saved = JSON.parse(fs.readFileSync(limitsFile, 'utf-8'));
        if (saved && typeof saved === 'object') {
          this.rateLimits = { ...this.rateLimits, ...saved };
        }
      }
    } catch (_) {}
  }

  savePersistedLimits() {
    try {
      const limitsFile = path.join(process.cwd(), '.rate_limits.json');
      fs.writeFileSync(limitsFile, JSON.stringify(this.rateLimits, null, 2));
    } catch (e) {
      console.error('Failed to save rate limits to disk:', e);
    }
  }

  tick() {
    const now = Date.now();
    const elapsedSec = Math.max(0.1, (now - this.lastSecTick) / 1000);
    this.lastSecTick = now;

    this.currentUploadSpeed = Math.round(this.bytesUploadedThisSec / elapsedSec);
    this.currentDownloadSpeed = Math.round(this.bytesDownloadedThisSec / elapsedSec);

    this.bytesUploadedThisSec = 0;
    this.bytesDownloadedThisSec = 0;

    if (this.currentUploadSpeed > this.peakUploadSpeed) {
      this.peakUploadSpeed = this.currentUploadSpeed;
    }
    if (this.currentDownloadSpeed > this.peakDownloadSpeed) {
      this.peakDownloadSpeed = this.currentDownloadSpeed;
    }

    // Refill Token Bucket
    this.refillTokens(now);

    // Push to history
    this.speedHistory.push({
      time: now,
      up: this.currentUploadSpeed,
      down: this.currentDownloadSpeed,
      active: this.activeConnections
    });
    if (this.speedHistory.length > this.historyLength) {
      this.speedHistory.shift();
    }

    // Notify SSE subscribers
    if (this.subscribers.size > 0) {
      const statsJson = JSON.stringify(this.getStats());
      const sseMsg = `data: ${statsJson}\n\n`;
      for (const res of this.subscribers) {
        try {
          res.write(sseMsg);
        } catch (_) {
          this.subscribers.delete(res);
        }
      }
    }
  }

  refillTokens(now = Date.now()) {
    const elapsed = Math.max(0, (now - this.lastTokenRefill) / 1000);
    this.lastTokenRefill = now;

    if (this.rateLimits.enabled) {
      if (this.rateLimits.uploadLimitKBps > 0) {
        const maxUpTokens = Math.max(this.rateLimits.uploadLimitKBps * 1024, (this.rateLimits.burstKB || 64) * 1024);
        this.upTokens = Math.min(maxUpTokens, this.upTokens + this.rateLimits.uploadLimitKBps * 1024 * elapsed);
      }
      if (this.rateLimits.downloadLimitKBps > 0) {
        const maxDownTokens = Math.max(this.rateLimits.downloadLimitKBps * 1024, (this.rateLimits.burstKB || 64) * 1024);
        this.downTokens = Math.min(maxDownTokens, this.downTokens + this.rateLimits.downloadLimitKBps * 1024 * elapsed);
      }
    }
  }

  recordUpload(bytes) {
    if (!bytes || bytes <= 0) return;
    this.totalUploadBytes += bytes;
    this.bytesUploadedThisSec += bytes;
  }

  recordDownload(bytes) {
    if (!bytes || bytes <= 0) return;
    this.totalDownloadBytes += bytes;
    this.bytesDownloadedThisSec += bytes;
  }

  addActiveConnection() {
    this.activeConnections++;
    this.totalConnections++;
  }

  removeActiveConnection() {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  // Token Bucket async throttle for uploads
  async throttleUpload(bytes) {
    this.recordUpload(bytes);
    if (!this.rateLimits.enabled || !this.rateLimits.uploadLimitKBps || this.rateLimits.uploadLimitKBps <= 0) {
      return;
    }

    const rateBytesPerSec = this.rateLimits.uploadLimitKBps * 1024;
    this.refillTokens();

    if (this.upTokens >= bytes) {
      this.upTokens -= bytes;
      return;
    }

    const needed = bytes - this.upTokens;
    this.upTokens = 0;
    const waitMs = Math.min(3000, Math.ceil((needed / rateBytesPerSec) * 1000));
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  // Token Bucket async throttle for downloads
  async throttleDownload(bytes) {
    this.recordDownload(bytes);
    if (!this.rateLimits.enabled || !this.rateLimits.downloadLimitKBps || this.rateLimits.downloadLimitKBps <= 0) {
      return;
    }

    const rateBytesPerSec = this.rateLimits.downloadLimitKBps * 1024;
    this.refillTokens();

    if (this.downTokens >= bytes) {
      this.downTokens -= bytes;
      return;
    }

    const needed = bytes - this.downTokens;
    this.downTokens = 0;
    const waitMs = Math.min(3000, Math.ceil((needed / rateBytesPerSec) * 1000));
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  updateLimits(newLimits) {
    if (typeof newLimits !== 'object' || !newLimits) return;

    if (typeof newLimits.enabled === 'boolean') {
      this.rateLimits.enabled = newLimits.enabled;
    }
    if (typeof newLimits.uploadLimitKBps === 'number' && newLimits.uploadLimitKBps >= 0) {
      this.rateLimits.uploadLimitKBps = Math.round(newLimits.uploadLimitKBps);
    }
    if (typeof newLimits.downloadLimitKBps === 'number' && newLimits.downloadLimitKBps >= 0) {
      this.rateLimits.downloadLimitKBps = Math.round(newLimits.downloadLimitKBps);
    }
    if (typeof newLimits.mode === 'string') {
      this.rateLimits.mode = newLimits.mode;
    }
    if (typeof newLimits.burstKB === 'number' && newLimits.burstKB > 0) {
      this.rateLimits.burstKB = Math.round(newLimits.burstKB);
    }

    // Auto toggle enabled if limits > 0
    if (this.rateLimits.uploadLimitKBps > 0 || this.rateLimits.downloadLimitKBps > 0) {
      if (newLimits.enabled !== false) {
        this.rateLimits.enabled = true;
      }
    }

    this.savePersistedLimits();
    return this.rateLimits;
  }

  getStats() {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      success: true,
      timestamp: Date.now(),
      uptimeSec,
      currentSpeed: {
        uploadBytesPerSec: this.currentUploadSpeed,
        downloadBytesPerSec: this.currentDownloadSpeed,
        uploadMbps: ((this.currentUploadSpeed * 8) / 1_000_000).toFixed(2),
        downloadMbps: ((this.currentDownloadSpeed * 8) / 1_000_000).toFixed(2),
        uploadMBps: (this.currentUploadSpeed / 1_048_576).toFixed(2),
        downloadMBps: (this.currentDownloadSpeed / 1_048_576).toFixed(2),
      },
      peakSpeed: {
        uploadBytesPerSec: this.peakUploadSpeed,
        downloadBytesPerSec: this.peakDownloadSpeed,
        uploadMbps: ((this.peakUploadSpeed * 8) / 1_000_000).toFixed(2),
        downloadMbps: ((this.peakDownloadSpeed * 8) / 1_000_000).toFixed(2),
      },
      totalTraffic: {
        uploadBytes: this.totalUploadBytes,
        downloadBytes: this.totalDownloadBytes,
        totalBytes: this.totalUploadBytes + this.totalDownloadBytes,
        uploadFormatted: this.formatBytes(this.totalUploadBytes),
        downloadFormatted: this.formatBytes(this.totalDownloadBytes),
        totalFormatted: this.formatBytes(this.totalUploadBytes + this.totalDownloadBytes)
      },
      connections: {
        active: this.activeConnections,
        total: this.totalConnections
      },
      rateLimits: { ...this.rateLimits },
      history: this.speedHistory
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  addSubscriber(res) {
    this.subscribers.add(res);
  }

  removeSubscriber(res) {
    this.subscribers.delete(res);
  }
}

export const trafficEngine = new TrafficEngine();
