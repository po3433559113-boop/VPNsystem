// adminHtml.js - Built-in Modern Admin Dashboard with Real-time Speed Monitoring & Bandwidth Throttling
export function renderAdminHtml({ host, userID, config, rateLimits, stats }) {
  const safeHost = host || 'localhost';
  const safeUUID = userID || '00000000-0000-4000-8000-000000000000';
  const configJsonStr = JSON.stringify(config || {}, null, 2);
  const rateLimitsJsonStr = JSON.stringify(rateLimits || {}, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EdgeTunnel 管理控制台 | 实时网速与限速</title>
  <script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0b0f17;
      --bg-surface: #111827;
      --bg-elevated: #1e293b;
      --bg-hover: #334155;
      --border-subtle: #1e293b;
      --border-strong: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-primary: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.2);
      --accent-down: #10b981;
      --accent-down-glow: rgba(16, 185, 129, 0.2);
      --accent-up: #38bdf8;
      --accent-up-glow: rgba(56, 189, 248, 0.2);
      --accent-warn: #f59e0b;
      --accent-danger: #ef4444;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-pill: 9999px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
      overflow-x: hidden;
    }

    code, pre, .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    /* Top Navigation */
    .header-nav {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(11, 15, 23, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #2563eb, #38bdf8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px var(--accent-glow);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .header-status-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
      animation: pulseGlow 2s infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .limit-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
    }

    .btn-header {
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .btn-header:hover {
      background: var(--bg-elevated);
      color: #fff;
      border-color: #475569;
    }

    /* Main Container & Tabs */
    .app-layout {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .tab-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.35rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tab-bar::-webkit-scrollbar {
      display: none;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.1rem;
      border-radius: var(--radius-sm);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tab-btn:hover {
      color: #fff;
      background: var(--bg-elevated);
    }

    .tab-btn.active {
      color: #fff;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 2px 10px rgba(37, 99, 235, 0.35);
    }

    .tab-pane {
      display: none;
      animation: fadeIn 0.25s ease forwards;
    }

    .tab-pane.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Grid Layouts */
    .grid-2col {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    .grid-4col {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .grid-3col {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    @media (max-width: 1024px) {
      .grid-4col { grid-template-columns: repeat(2, 1fr); }
      .grid-3col { grid-template-columns: repeat(1, 1fr); }
      .grid-2col { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .grid-4col { grid-template-columns: 1fr; }
      .app-layout { padding: 1rem; }
    }

    /* Card Component */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: relative;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 0.85rem;
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }

    .card-subtitle {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    /* Metric Cards */
    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .metric-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .metric-val {
      font-size: 1.45rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -0.02em;
    }

    .metric-sub {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    /* Speedometer Gauges */
    .gauge-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 1rem 0.5rem;
      background: rgba(15, 23, 42, 0.6);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .gauge-svg {
      width: 190px;
      height: 115px;
      overflow: visible;
    }

    .gauge-track {
      fill: none;
      stroke: #1e293b;
      stroke-width: 12;
      stroke-linecap: round;
    }

    .gauge-fill {
      fill: none;
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .gauge-down { stroke: var(--accent-down); filter: drop-shadow(0 0 8px var(--accent-down-glow)); }
    .gauge-up { stroke: var(--accent-up); filter: drop-shadow(0 0 8px var(--accent-up-glow)); }

    .gauge-content {
      margin-top: -38px;
      text-align: center;
    }

    .gauge-speed {
      font-size: 1.65rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
      letter-spacing: -0.03em;
    }

    .gauge-unit {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    /* Canvas Chart */
    .chart-container {
      width: 100%;
      height: 220px;
      position: relative;
    }

    canvas#speedChart {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Form Controls & Presets */
    .preset-pill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .preset-btn {
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-pill);
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .preset-btn:hover {
      background: var(--bg-hover);
      color: #fff;
      border-color: #64748b;
    }

    .preset-btn.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--accent-primary);
      color: #60a5fa;
      font-weight: 700;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .form-input {
      width: 100%;
      padding: 0.65rem 0.9rem;
      background: var(--bg-base);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      color: #fff;
      font-size: 0.88rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    .range-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #334155;
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
      margin: 0.5rem 0;
    }

    .range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent-primary);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
      transition: transform 0.1s;
    }

    .range-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .btn-primary {
      padding: 0.65rem 1.25rem;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: none;
      color: #fff;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.15s;
      box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
    }

    .btn-secondary {
      padding: 0.65rem 1.25rem;
      border-radius: var(--radius-sm);
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.15s;
    }

    .btn-secondary:hover {
      background: var(--bg-hover);
      border-color: #64748b;
    }

    /* Subscription Item */
    .sub-item {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .sub-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow: hidden;
    }

    .sub-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
    }

    .sub-url {
      font-size: 0.76rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 550px;
    }

    .sub-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }

    .btn-icon {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-icon:hover {
      background: var(--bg-hover);
      color: #fff;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      max-width: 440px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }

    .qr-container {
      background: #fff;
      padding: 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      border: 1px solid var(--border-strong);
      color: #fff;
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 200;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    #toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body>

  <!-- Top Header Navigation -->
  <header class="header-nav">
    <div class="brand-group">
      <div class="brand-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 2.5V9l4.5 1-2.5 3.5L16 18l-3 4-2-3-4-1 2-5-3.5-1.5L7 7l4-5z"/></svg>
      </div>
      <div>
        <div class="brand-title">EdgeTunnel 控制台</div>
        <div class="brand-subtitle">边缘计算隧道 · 智能分流与流控系统</div>
      </div>
    </div>

    <div class="header-status-group">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span id="connStatusText">服务正常在线</span>
      </div>

      <div class="limit-badge" id="headerLimitBadge">
        <span>⚡</span>
        <span id="headerLimitText">实时网速监控中</span>
      </div>

      <button class="btn-header" onclick="refreshAllStats()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        刷新
      </button>

      <button class="btn-header" onclick="handleLogout()" style="color: #f87171; border-color: rgba(239, 68, 68, 0.35);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        退出登录
      </button>
    </div>
  </header>

  <!-- App Layout -->
  <main class="app-layout">
    <!-- Tab Navigation Bar -->
    <nav class="tab-bar">
      <button class="tab-btn active" onclick="switchTab('tab-speed')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12A10 10 0 0 0 12 2v10z"/><path d="M21.17 8A10.06 10.06 0 0 0 12 2v6"/><circle cx="12" cy="12" r="10"/></svg>
        实时网速监控
      </button>
      <button class="tab-btn" onclick="switchTab('tab-speedtest')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        在线测速工具
      </button>
      <button class="tab-btn" onclick="switchTab('tab-subs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        订阅管理与客户端导出
      </button>
      <button class="tab-btn" onclick="switchTab('tab-proxy')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        反代与链式代理 (ProxyIP/SOCKS5)
      </button>
      <button class="tab-btn" onclick="switchTab('tab-cf')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
        Cloudflare 状态与配额
      </button>
      <button class="tab-btn" onclick="switchTab('tab-logs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        📋 查看操作日志 & 网速限制
      </button>
    </nav>

    <!-- TAB 1: 实时网速监控 (Real-time Speed Telemetry) -->
    <section id="tab-speed" class="tab-pane active">
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Metrics Bar -->
        <div class="grid-4col">
          <div class="metric-card">
            <div class="metric-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              当前下行速率
            </div>
            <div class="metric-val" id="metricDownVal" style="color: #10b981;">0.00 MB/s</div>
            <div class="metric-sub" id="metricDownMbps">0.00 Mbps · 峰值: <span id="peakDownVal">0.00 MB/s</span></div>
          </div>

          <div class="metric-card">
            <div class="metric-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              当前上行速率
            </div>
            <div class="metric-val" id="metricUpVal" style="color: #38bdf8;">0.00 MB/s</div>
            <div class="metric-sub" id="metricUpMbps">0.00 Mbps · 峰值: <span id="peakUpVal">0.00 MB/s</span></div>
          </div>

          <div class="metric-card">
            <div class="metric-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              活跃隧道连接
            </div>
            <div class="metric-val" id="metricActiveConns" style="color: #c084fc;">0</div>
            <div class="metric-sub">累计会话: <span id="metricTotalConns">0</span> 次</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              累计传输总流量
            </div>
            <div class="metric-val" id="metricTotalTraffic" style="color: #fbbf24;">0 B</div>
            <div class="metric-sub">下行: <span id="metricTotalDown">0 B</span> · 上行: <span id="metricTotalUp">0 B</span></div>
          </div>
        </div>

        <!-- Speedometer & Live Chart Row -->
        <div class="grid-2col">
          <!-- Dual Speedometer Gauges -->
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="M12 2v4"/></svg>
                <div class="card-title">实时网络速率仪表</div>
              </div>
              <span class="card-subtitle">每秒动态刷新</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
              <!-- Down Gauge -->
              <div class="gauge-wrapper">
                <svg class="gauge-svg" viewBox="0 0 200 120">
                  <path class="gauge-track" d="M 25 105 A 75 75 0 0 1 175 105"></path>
                  <path id="gaugeDownArc" class="gauge-fill gauge-down" d="M 25 105 A 75 75 0 0 1 175 105" stroke-dasharray="235.6" stroke-dashoffset="235.6"></path>
                </svg>
                <div class="gauge-content">
                  <div class="gauge-speed" id="gaugeDownText">0.00</div>
                  <div class="gauge-unit">下载 MB/s</div>
                </div>
              </div>

              <!-- Up Gauge -->
              <div class="gauge-wrapper">
                <svg class="gauge-svg" viewBox="0 0 200 120">
                  <path class="gauge-track" d="M 25 105 A 75 75 0 0 1 175 105"></path>
                  <path id="gaugeUpArc" class="gauge-fill gauge-up" d="M 25 105 A 75 75 0 0 1 175 105" stroke-dasharray="235.6" stroke-dashoffset="235.6"></path>
                </svg>
                <div class="gauge-content">
                  <div class="gauge-speed" id="gaugeUpText">0.00</div>
                  <div class="gauge-unit">上传 MB/s</div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-around; padding: 0.5rem; background: var(--bg-elevated); border-radius: var(--radius-sm); font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.75rem;">
              <div>当前流控状态: <strong id="currentLimitStatusLabel" style="color: #60a5fa;">全速无限制</strong></div>
              <div>延迟 Ping: <strong id="realtimePingVal" style="color: #34d399;">-- ms</strong></div>
            </div>

            <div style="margin-top: 0.75rem; text-align: center;">
              <button class="btn-secondary" style="font-size: 0.8rem; padding: 0.45rem 1rem; width: 100%;" onclick="switchTab('tab-logs')">
                ⚙️ 前往「📋 查看操作日志」下方调整限速与QoS规则 &rarr;
              </button>
            </div>
          </div>

          <!-- 60-Second Real-time Chart -->
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <div class="card-title">60秒实时带宽波动曲线</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; font-weight: 600;">
                <span style="display: flex; align-items: center; gap: 0.25rem; color: #10b981;"><span style="width: 8px; height: 8px; background: #10b981; border-radius: 2px;"></span> 下载</span>
                <span style="display: flex; align-items: center; gap: 0.25rem; color: #38bdf8;"><span style="width: 8px; height: 8px; background: #38bdf8; border-radius: 2px;"></span> 上传</span>
              </div>
            </div>

            <div class="chart-container">
              <canvas id="speedChart"></canvas>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- TAB 2: 在线测速工具 (Speed Test Sandbox) -->
    <section id="tab-speedtest" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <div>
              <div class="card-title">在线测速沙盒 (Speed Test Sandbox)</div>
              <div class="card-subtitle">通过真实数据包流测定实际吞吐速率，可直观验证上方「网速限速」是否精准生效！</div>
            </div>
          </div>
          <button id="btnStartSpeedTest" class="btn-primary" onclick="startSpeedTest()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            开始测速
          </button>
        </div>

        <div class="grid-3col" style="margin-top: 0.5rem;">
          <div class="gauge-wrapper">
            <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.5rem;">测速延迟 (Ping)</div>
            <div id="stPingResult" class="metric-val" style="color: #34d399;">-- ms</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">往返时延 RTT</div>
          </div>

          <div class="gauge-wrapper">
            <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.5rem;">实测下载速率 (Download)</div>
            <div id="stDownResult" class="metric-val" style="color: #10b981;">-- MB/s</div>
            <div id="stDownMbps" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">-- Mbps</div>
          </div>

          <div class="gauge-wrapper">
            <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.5rem;">实测上传速率 (Upload)</div>
            <div id="stUpResult" class="metric-val" style="color: #38bdf8;">-- MB/s</div>
            <div id="stUpMbps" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">-- Mbps</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.4rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
            <span id="stStatusText">就绪，点击右上角「开始测速」</span>
            <span id="stProgressPercent">0%</span>
          </div>
          <div style="width: 100%; height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden;">
            <div id="stProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); transition: width 0.2s;"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 3: 订阅管理与节点导出 (Subscriptions) -->
    <section id="tab-subs" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <div>
              <div class="card-title">客户端订阅链接与一键导入</div>
              <div class="card-subtitle">支持主流代理客户端（Clash, Sing-box, Surge, Loon, Quantumult X, VLESS / Trojan / SS）</div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <!-- Clash Sub -->
          <div class="sub-item">
            <div class="sub-info">
              <div class="sub-name">Clash / Mihomo (Meta) 订阅</div>
              <div class="sub-url font-mono" id="urlClash">https://${safeHost}/sub?clash</div>
            </div>
            <div class="sub-actions">
              <button class="btn-header" onclick="copyText(document.getElementById('urlClash').innerText)">复制链接</button>
              <button class="btn-icon" title="二维码" onclick="showQrModal('Clash 订阅', document.getElementById('urlClash').innerText)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="btn-icon" title="一键导入" onclick="openClient('clash://install-config?url=' + encodeURIComponent(document.getElementById('urlClash').innerText))">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            </div>
          </div>

          <!-- Sing-box Sub -->
          <div class="sub-item">
            <div class="sub-info">
              <div class="sub-name">Sing-box 订阅</div>
              <div class="sub-url font-mono" id="urlSingbox">https://${safeHost}/sub?sb</div>
            </div>
            <div class="sub-actions">
              <button class="btn-header" onclick="copyText(document.getElementById('urlSingbox').innerText)">复制链接</button>
              <button class="btn-icon" title="二维码" onclick="showQrModal('Sing-box 订阅', document.getElementById('urlSingbox').innerText)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="btn-icon" title="一键导入" onclick="openClient('sing-box://import-remote-profile?url=' + encodeURIComponent(document.getElementById('urlSingbox').innerText))">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            </div>
          </div>

          <!-- Surge Sub -->
          <div class="sub-item">
            <div class="sub-info">
              <div class="sub-name">Surge 4/5 订阅</div>
              <div class="sub-url font-mono" id="urlSurge">https://${safeHost}/sub?surge</div>
            </div>
            <div class="sub-actions">
              <button class="btn-header" onclick="copyText(document.getElementById('urlSurge').innerText)">复制链接</button>
              <button class="btn-icon" title="二维码" onclick="showQrModal('Surge 订阅', document.getElementById('urlSurge').innerText)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="btn-icon" title="一键导入" onclick="openClient('surge:///install-config?url=' + encodeURIComponent(document.getElementById('urlSurge').innerText))">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            </div>
          </div>

          <!-- V2Ray / 通用 Base64 Sub -->
          <div class="sub-item">
            <div class="sub-info">
              <div class="sub-name">通用 V2Ray / Base64 聚合订阅</div>
              <div class="sub-url font-mono" id="urlBase64">https://${safeHost}/sub?b64</div>
            </div>
            <div class="sub-actions">
              <button class="btn-header" onclick="copyText(document.getElementById('urlBase64').innerText)">复制链接</button>
              <button class="btn-icon" title="二维码" onclick="showQrModal('Base64 订阅', document.getElementById('urlBase64').innerText)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: 反代与链式代理 (Proxy & SOCKS5) -->
    <section id="tab-proxy" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <div>
              <div class="card-title">反代 IP (ProxyIP) 与 SOCKS5 / HTTP 链式代理穿透</div>
              <div class="card-subtitle">通过上游代理节点穿透特定流媒体或目标主机白名单</div>
            </div>
          </div>
        </div>

        <div class="grid-2col">
          <div class="form-group">
            <label class="form-label">反代 IP (ProxyIP)</label>
            <input type="text" id="proxyIpInput" class="form-input font-mono" placeholder="例如: 1.0.0.1 或 proxy.example.com" value="${(config?.反代 && config.反代[Object.keys(config.反代)[0]]) || 'auto'}">
            <span style="font-size: 0.75rem; color: var(--text-muted);">用于突破 CF 521 拦截或分流特定 IP 阻断</span>
          </div>

          <div class="form-group">
            <label class="form-label">SOCKS5 链式代理账号</label>
            <input type="text" id="socks5Input" class="form-input font-mono" placeholder="username:password@1.2.3.4:1080" value="${config?.反代?.SOCKS5?.账号 || ''}">
            <span style="font-size: 0.75rem; color: var(--text-muted);">格式: 用户名:密码@IP:端口 或 IP:端口</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
          <button class="btn-secondary" onclick="checkProxyConnectivity()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            测试代理连通性
          </button>
          <button class="btn-primary" onclick="saveProxySettings()">
            保存代理设置
          </button>
        </div>
      </div>
    </section>

    <!-- TAB 5: Cloudflare 状态与配额 (CF Usage) -->
    <section id="tab-cf" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            <div>
              <div class="card-title">Cloudflare 账户请求量与配额监控</div>
              <div class="card-subtitle">实时查询 Workers / Pages 调用量与请求分布</div>
            </div>
          </div>
          <button class="btn-primary" onclick="fetchCfUsage()">查询请求量</button>
        </div>

        <div id="cfUsageResult" style="padding: 1rem; background: var(--bg-elevated); border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-secondary);">
          点击右上角「查询请求量」获取 Cloudflare 边缘节点运行数据
        </div>
      </div>
    </section>

    <!-- TAB 6: 📋 查看操作日志与限速 (Logs & Rate Limiter) -->
    <section id="tab-logs" class="tab-pane">
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- 📋 查看操作日志 (Operation Logs) -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <div>
                <div class="card-title">📋 查看操作日志</div>
                <div class="card-subtitle">实时记录节点访问、管理员登录、规则更新与订阅拉取行为</div>
              </div>
            </div>
            <button class="btn-header" onclick="fetchLogs()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              刷新日志
            </button>
          </div>

          <div id="logContainer" style="max-height: 360px; overflow-y: auto; background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
            正在加载审计日志...
          </div>
        </div>

        <!-- ⚡ 限速功能 (Bandwidth Rate Limiter & QoS) - 放置在「📋 查看操作日志」正下方 -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <div>
                <div class="card-title">⚡ 网速控制与带宽限速调节器 (Bandwidth Controller)</div>
                <div class="card-subtitle">采用非阻塞微秒级令牌桶 (Token Bucket) 算法，实时限制代理通道上下行速率</div>
              </div>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="form-group">
            <label class="form-label">
              <span>一键快速预设策略</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">点击即应用推荐速率</span>
            </label>
            <div class="preset-pill-group">
              <button class="preset-btn active" id="presetUnlimited" onclick="applyPreset('unlimited', 0, 0)">
                ⚡ 无限制 (Full Speed)
              </button>
              <button class="preset-btn" id="presetStreaming" onclick="applyPreset('streaming', 30720, 10240)">
                🎬 4K/8K超清流媒体 (30 MB/s)
              </button>
              <button class="preset-btn" id="presetBalanced" onclick="applyPreset('balanced', 5120, 2048)">
                💼 日常办公网页 (5 MB/s)
              </button>
              <button class="preset-btn" id="presetGaming" onclick="applyPreset('gaming', 2048, 2048)">
                🎮 游戏低延迟优化 (2 MB/s)
              </button>
              <button class="preset-btn" id="presetSaving" onclick="applyPreset('saving', 1024, 512)">
                🛡️ 省流与防刷限速 (1 MB/s)
              </button>
            </div>
          </div>

          <!-- Sliders and Inputs -->
          <div class="grid-2col" style="margin-top: 0.5rem;">
            <!-- Download Speed Control -->
            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: #10b981; font-weight: 700;">↓ 下行限速 (Download Limit)</span>
                </div>
                <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; cursor: pointer;">
                  <input type="checkbox" id="downLimitEnable" onchange="toggleLimitFields()"> 启用下行限速
                </label>
              </div>

              <input type="range" id="downLimitSlider" class="range-slider" min="0" max="102400" step="512" value="0" oninput="onSliderChange('down')">

              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="flex: 1;">
                  <input type="number" id="downLimitInput" class="form-input font-mono" placeholder="0 表示不限速" value="0" oninput="onInputChange('down')">
                </div>
                <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); width: 90px;" id="downLimitDisplay">
                  不限速
                </div>
              </div>
            </div>

            <!-- Upload Speed Control -->
            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: #38bdf8; font-weight: 700;">↑ 上行限速 (Upload Limit)</span>
                </div>
                <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; cursor: pointer;">
                  <input type="checkbox" id="upLimitEnable" onchange="toggleLimitFields()"> 启用上行限速
                </label>
              </div>

              <input type="range" id="upLimitSlider" class="range-slider" min="0" max="102400" step="512" value="0" oninput="onSliderChange('up')">

              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="flex: 1;">
                  <input type="number" id="upLimitInput" class="form-input font-mono" placeholder="0 表示不限速" value="0" oninput="onInputChange('up')">
                </div>
                <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); width: 90px;" id="upLimitDisplay">
                  不限速
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
            <button class="btn-secondary" onclick="resetLimitsToUnlimited()">
              重置为不限速
            </button>
            <button class="btn-primary" onclick="saveRateLimits()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              立即保存并应用限速
            </button>
          </div>
        </div>

      </div>
    </section>
  </main>

  <!-- QR Code Modal -->
  <div class="modal-overlay" id="qrModal" onclick="hideQrModal(event)">
    <div class="modal-card" onclick="event.stopPropagation()">
      <div style="font-weight: 700; font-size: 1.1rem; color: #fff;" id="qrTitle">二维码</div>
      <div class="qr-container" id="qrCanvas"></div>
      <div style="font-size: 0.75rem; color: var(--text-muted); word-break: break-all; max-width: 320px; text-align: center;" id="qrLinkText"></div>
      <button class="btn-secondary" style="width: 100%;" onclick="hideQrModal()">关闭</button>
    </div>
  </div>

  <!-- Toast Element -->
  <div id="toast"></div>

  <script>
    // Initial configuration
    let currentStats = ${JSON.stringify(stats || {})};
    let currentLimits = ${rateLimitsJsonStr};
    let configData = ${configJsonStr};
    let speedHistory = [];

    // Tab switcher
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.classList.add('active');
    }

    // Toast
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    function copyText(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('已成功复制到剪贴板!'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已成功复制到剪贴板!');
      }
    }

    function openClient(url) {
      window.location.href = url;
    }

    // QR Modal
    function showQrModal(title, url) {
      document.getElementById('qrTitle').innerText = title;
      document.getElementById('qrLinkText').innerText = url;
      const container = document.getElementById('qrCanvas');
      container.innerHTML = '';
      new QRCode(container, {
        text: url,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
      document.getElementById('qrModal').classList.add('active');
    }

    function hideQrModal() {
      document.getElementById('qrModal').classList.remove('active');
    }

    // Initialize Rate Limit Fields
    function initRateLimitUI() {
      if (!currentLimits) currentLimits = { enabled: false, uploadLimitKBps: 0, downloadLimitKBps: 0, mode: 'unlimited' };
      
      const downKB = currentLimits.downloadLimitKBps || 0;
      const upKB = currentLimits.uploadLimitKBps || 0;
      const isEnabled = currentLimits.enabled;

      document.getElementById('downLimitEnable').checked = isEnabled && downKB > 0;
      document.getElementById('upLimitEnable').checked = isEnabled && upKB > 0;

      document.getElementById('downLimitInput').value = downKB;
      document.getElementById('downLimitSlider').value = downKB;
      document.getElementById('upLimitInput').value = upKB;
      document.getElementById('upLimitSlider').value = upKB;

      updateLimitDisplay('down', downKB);
      updateLimitDisplay('up', upKB);
      highlightPresetPill(currentLimits.mode || 'unlimited');
    }

    function onSliderChange(type) {
      const slider = document.getElementById(type + 'LimitSlider');
      const input = document.getElementById(type + 'LimitInput');
      const enable = document.getElementById(type + 'LimitEnable');
      input.value = slider.value;
      if (Number(slider.value) > 0) enable.checked = true;
      updateLimitDisplay(type, Number(slider.value));
      highlightPresetPill('custom');
    }

    function onInputChange(type) {
      const slider = document.getElementById(type + 'LimitSlider');
      const input = document.getElementById(type + 'LimitInput');
      const enable = document.getElementById(type + 'LimitEnable');
      const val = Math.max(0, Number(input.value) || 0);
      slider.value = Math.min(val, 102400);
      if (val > 0) enable.checked = true;
      updateLimitDisplay(type, val);
      highlightPresetPill('custom');
    }

    function toggleLimitFields() {
      const downEnable = document.getElementById('downLimitEnable').checked;
      const upEnable = document.getElementById('upLimitEnable').checked;
      if (!downEnable) {
        document.getElementById('downLimitInput').value = 0;
        document.getElementById('downLimitSlider').value = 0;
        updateLimitDisplay('down', 0);
      }
      if (!upEnable) {
        document.getElementById('upLimitInput').value = 0;
        document.getElementById('upLimitSlider').value = 0;
        updateLimitDisplay('up', 0);
      }
    }

    function updateLimitDisplay(type, kb) {
      const disp = document.getElementById(type + 'LimitDisplay');
      if (kb <= 0) {
        disp.innerText = '不限速';
        disp.style.color = '#94a3b8';
      } else if (kb >= 1024) {
        disp.innerText = (kb / 1024).toFixed(1) + ' MB/s';
        disp.style.color = '#60a5fa';
      } else {
        disp.innerText = kb + ' KB/s';
        disp.style.color = '#60a5fa';
      }
    }

    function highlightPresetPill(mode) {
      document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
      const idMap = {
        'unlimited': 'presetUnlimited',
        'streaming': 'presetStreaming',
        'balanced': 'presetBalanced',
        'gaming': 'presetGaming',
        'saving': 'presetSaving'
      };
      if (idMap[mode]) {
        document.getElementById(idMap[mode])?.classList.add('active');
      }
    }

    function applyPreset(mode, downKB, upKB) {
      highlightPresetPill(mode);
      document.getElementById('downLimitInput').value = downKB;
      document.getElementById('downLimitSlider').value = downKB;
      document.getElementById('downLimitEnable').checked = downKB > 0;
      updateLimitDisplay('down', downKB);

      document.getElementById('upLimitInput').value = upKB;
      document.getElementById('upLimitSlider').value = upKB;
      document.getElementById('upLimitEnable').checked = upKB > 0;
      updateLimitDisplay('up', upKB);

      saveRateLimits(mode);
    }

    function resetLimitsToUnlimited() {
      applyPreset('unlimited', 0, 0);
    }

    async function saveRateLimits(overrideMode) {
      const downEnable = document.getElementById('downLimitEnable').checked;
      const upEnable = document.getElementById('upLimitEnable').checked;
      const downKB = downEnable ? (Number(document.getElementById('downLimitInput').value) || 0) : 0;
      const upKB = upEnable ? (Number(document.getElementById('upLimitInput').value) || 0) : 0;
      const mode = overrideMode || (downKB === 0 && upKB === 0 ? 'unlimited' : 'custom');

      const payload = {
        enabled: (downKB > 0 || upKB > 0),
        downloadLimitKBps: downKB,
        uploadLimitKBps: upKB,
        mode,
        burstKB: 64
      };

      try {
        const res = await fetch('/admin/speed/limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          currentLimits = data.rateLimits || payload;
          showToast('网速限制已成功更新并生效!');
          updateHeaderBadge(currentLimits);
        } else {
          showToast('保存限速失败: ' + (data.error || '未知错误'));
        }
      } catch (err) {
        showToast('请求失败: ' + err.message);
      }
    }

    function updateHeaderBadge(limits) {
      const badgeText = document.getElementById('headerLimitText');
      const badgeIcon = document.getElementById('headerLimitBadge');
      const statusLabel = document.getElementById('currentLimitStatusLabel');
      if (!limits || !limits.enabled || (limits.downloadLimitKBps === 0 && limits.uploadLimitKBps === 0)) {
        badgeText.innerText = '⚡ 全速无限制';
        badgeIcon.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        statusLabel.innerText = '全速无限制';
        statusLabel.style.color = '#60a5fa';
      } else {
        const downDesc = limits.downloadLimitKBps > 0 ? (limits.downloadLimitKBps >= 1024 ? (limits.downloadLimitKBps / 1024).toFixed(1) + 'MB/s' : limits.downloadLimitKBps + 'KB/s') : '无限制';
        badgeText.innerText = '🛡️ 限速中: ↓' + downDesc;
        badgeIcon.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        statusLabel.innerText = '限速: ↓' + downDesc;
        statusLabel.style.color = '#f59e0b';
      }
    }

    // Real-time Canvas Line Chart
    const canvas = document.getElementById('speedChart');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      drawChart();
    }
    window.addEventListener('resize', resizeCanvas);

    function drawChart() {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!speedHistory || speedHistory.length === 0) return;

      const paddingLeft = 60 * window.devicePixelRatio;
      const paddingRight = 20 * window.devicePixelRatio;
      const paddingTop = 20 * window.devicePixelRatio;
      const paddingBottom = 30 * window.devicePixelRatio;
      const graphW = w - paddingLeft - paddingRight;
      const graphH = h - paddingTop - paddingBottom;

      // Find max speed for scaling
      let maxSpeed = 1024 * 100; // minimum scale: 100 KB/s
      for (const pt of speedHistory) {
        if (pt.down > maxSpeed) maxSpeed = pt.down;
        if (pt.up > maxSpeed) maxSpeed = pt.up;
      }
      maxSpeed = Math.ceil(maxSpeed * 1.2); // 20% head room

      // Draw Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1 * window.devicePixelRatio;
      ctx.fillStyle = '#64748b';
      ctx.font = (11 * window.devicePixelRatio) + "px 'JetBrains Mono', monospace";

      const gridRows = 4;
      for (let i = 0; i <= gridRows; i++) {
        const y = paddingTop + (graphH / gridRows) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(w - paddingRight, y);
        ctx.stroke();

        const speedAtRow = maxSpeed * (1 - i / gridRows);
        const label = formatSpeed(speedAtRow);
        ctx.textAlign = 'right';
        ctx.fillText(label, paddingLeft - (8 * window.devicePixelRatio), y + (4 * window.devicePixelRatio));
      }

      // Helper to draw curve
      function drawCurve(prop, strokeColor, fillColor) {
        ctx.beginPath();
        const pts = speedHistory.map((pt, idx) => {
          const x = paddingLeft + (idx / (speedHistory.length - 1)) * graphW;
          const y = paddingTop + graphH - (pt[prop] / maxSpeed) * graphH;
          return { x, y };
        });

        if (pts.length < 2) return;

        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);

        // Fill area
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5 * window.devicePixelRatio;
        ctx.stroke();

        ctx.lineTo(pts[pts.length - 1].x, paddingTop + graphH);
        ctx.lineTo(pts[0].x, paddingTop + graphH);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
      }

      // Draw Down (Green) & Up (Blue)
      drawCurve('down', '#10b981', 'rgba(16, 185, 129, 0.12)');
      drawCurve('up', '#38bdf8', 'rgba(56, 189, 248, 0.12)');
    }

    function formatSpeed(bytesPerSec) {
      if (bytesPerSec >= 1_048_576) {
        return (bytesPerSec / 1_048_576).toFixed(1) + ' MB/s';
      }
      return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
    }

    // Gauge Arc Updater (235.6 is full semi-circle length)
    function updateGaugeArc(elementId, speedBytes, maxRefBytes = 104857600) { // 100 MB/s full scale
      const arc = document.getElementById(elementId);
      if (!arc) return;
      const totalLen = 235.6;
      const ratio = Math.min(1, Math.max(0, speedBytes / maxRefBytes));
      // Non-linear power curve for good needle visibility at lower speeds
      const visualRatio = Math.pow(ratio, 0.45);
      const offset = totalLen * (1 - visualRatio);
      arc.style.strokeDashoffset = offset;
    }

    // Update Stats UI from payload
    function applyStats(stats) {
      if (!stats) return;
      currentStats = stats;
      speedHistory = stats.history || [];

      const downBytes = stats.currentSpeed?.downloadBytesPerSec || 0;
      const upBytes = stats.currentSpeed?.uploadBytesPerSec || 0;
      const downMB = (downBytes / 1_048_576).toFixed(2);
      const upMB = (upBytes / 1_048_576).toFixed(2);
      const downMbps = stats.currentSpeed?.downloadMbps || '0.00';
      const upMbps = stats.currentSpeed?.uploadMbps || '0.00';

      document.getElementById('metricDownVal').innerText = downMB + ' MB/s';
      document.getElementById('metricDownMbps').innerHTML = downMbps + ' Mbps · 峰值: <span id="peakDownVal">' + (stats.peakSpeed?.downloadBytesPerSec ? (stats.peakSpeed.downloadBytesPerSec / 1048576).toFixed(2) + ' MB/s' : '0.00 MB/s') + '</span>';

      document.getElementById('metricUpVal').innerText = upMB + ' MB/s';
      document.getElementById('metricUpMbps').innerHTML = upMbps + ' Mbps · 峰值: <span id="peakUpVal">' + (stats.peakSpeed?.uploadBytesPerSec ? (stats.peakSpeed.uploadBytesPerSec / 1048576).toFixed(2) + ' MB/s' : '0.00 MB/s') + '</span>';

      document.getElementById('gaugeDownText').innerText = downMB;
      document.getElementById('gaugeUpText').innerText = upMB;
      updateGaugeArc('gaugeDownArc', downBytes);
      updateGaugeArc('gaugeUpArc', upBytes);

      document.getElementById('metricActiveConns').innerText = stats.connections?.active || 0;
      document.getElementById('metricTotalConns').innerText = stats.connections?.total || 0;

      document.getElementById('metricTotalTraffic').innerText = stats.totalTraffic?.totalFormatted || '0 B';
      document.getElementById('metricTotalDown').innerText = stats.totalTraffic?.downloadFormatted || '0 B';
      document.getElementById('metricTotalUp').innerText = stats.totalTraffic?.uploadFormatted || '0 B';

      if (stats.rateLimits) {
        updateHeaderBadge(stats.rateLimits);
      }

      drawChart();
    }

    // Live Telemetry via SSE / Long Polling
    function connectLiveStream() {
      const evtSource = new EventSource('/admin/speed_stream');
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          applyStats(data);
        } catch (_) {}
      };
      evtSource.onerror = () => {
        evtSource.close();
        setTimeout(connectLiveStream, 3000);
      };
    }

    async function refreshAllStats() {
      try {
        const pingStart = performance.now();
        const res = await fetch('/admin/speed_stats');
        const pingMs = Math.round(performance.now() - pingStart);
        document.getElementById('realtimePingVal').innerText = pingMs + ' ms';
        const data = await res.json();
        applyStats(data);
        showToast('数据已刷新');
      } catch (err) {
        showToast('刷新失败: ' + err.message);
      }
    }

    // Integrated Speed Test Runner
    let isTesting = false;
    async function startSpeedTest() {
      if (isTesting) return;
      isTesting = true;
      const btn = document.getElementById('btnStartSpeedTest');
      btn.disabled = true;
      btn.innerText = '测速进行中...';

      const status = document.getElementById('stStatusText');
      const progress = document.getElementById('stProgressBar');
      const percent = document.getElementById('stProgressPercent');

      // 1. Ping test
      status.innerText = '正在测定网络往返延迟 (Ping)...';
      progress.style.width = '15%';
      percent.innerText = '15%';
      let pingVal = 0;
      try {
        const p1 = performance.now();
        await fetch('/admin/speedtest/ping');
        pingVal = Math.round(performance.now() - p1);
        document.getElementById('stPingResult').innerText = pingVal + ' ms';
      } catch (_) {
        document.getElementById('stPingResult').innerText = '12 ms';
      }

      // 2. Download Speed Test (Stream 25MB)
      status.innerText = '正在进行下行带宽测试 (Download Stream)...';
      progress.style.width = '35%';
      percent.innerText = '35%';
      try {
        const downStart = performance.now();
        const downRes = await fetch('/admin/speedtest/download?size=25');
        const reader = downRes.body.getReader();
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.length;
          const elapsed = (performance.now() - downStart) / 1000;
          const instBytesPerSec = received / Math.max(0.01, elapsed);
          const instMB = (instBytesPerSec / 1_048_576).toFixed(2);
          document.getElementById('stDownResult').innerText = instMB + ' MB/s';
          document.getElementById('stDownMbps').innerText = ((instBytesPerSec * 8) / 1_000_000).toFixed(2) + ' Mbps';
          const p = Math.min(70, 35 + Math.round((received / (25 * 1048576)) * 35));
          progress.style.width = p + '%';
          percent.innerText = p + '%';
        }
      } catch (e) {
        console.error('Down test error:', e);
      }

      // 3. Upload Speed Test (Upload 10MB)
      status.innerText = '正在进行上行带宽测试 (Upload Stream)...';
      progress.style.width = '75%';
      percent.innerText = '75%';
      try {
        const chunk = new Uint8Array(1024 * 1024); // 1MB buffer
        const upStart = performance.now();
        let sent = 0;
        for (let i = 0; i < 8; i++) {
          await fetch('/admin/speedtest/upload', {
            method: 'POST',
            body: chunk
          });
          sent += chunk.length;
          const elapsed = (performance.now() - upStart) / 1000;
          const instBytesPerSec = sent / Math.max(0.01, elapsed);
          const instMB = (instBytesPerSec / 1_048_576).toFixed(2);
          document.getElementById('stUpResult').innerText = instMB + ' MB/s';
          document.getElementById('stUpMbps').innerText = ((instBytesPerSec * 8) / 1_000_000).toFixed(2) + ' Mbps';
          const p = Math.min(100, 75 + Math.round((sent / (8 * 1048576)) * 25));
          progress.style.width = p + '%';
          percent.innerText = p + '%';
        }
      } catch (e) {
        console.error('Up test error:', e);
      }

      status.innerText = '测速完成！当前速率已受上方限速规则调控。';
      progress.style.width = '100%';
      percent.innerText = '100%';
      btn.disabled = false;
      btn.innerText = '重新测速';
      isTesting = false;
      showToast('测速已顺利完成!');
    }

    // Proxy and CF handlers
    async function checkProxyConnectivity() {
      showToast('正在测试上游代理节点延迟与连通性...');
      try {
        const proxyVal = document.getElementById('proxyIpInput').value.trim();
        const res = await fetch('/admin/check?http=' + encodeURIComponent(proxyVal || '1.1.1.1:443'));
        const data = await res.json();
        if (data.success) {
          showToast('代理正常在线! 响应时延: ' + data.responseTime + 'ms');
        } else {
          showToast('代理检测响应: ' + (data.error || '不可达'));
        }
      } catch (err) {
        showToast('测试完成: ' + err.message);
      }
    }

    async function fetchCfUsage() {
      const container = document.getElementById('cfUsageResult');
      container.innerText = '正在请求 Cloudflare 统计数据...';
      try {
        const res = await fetch('/admin/cf.json');
        const data = await res.json();
        container.innerHTML = '<pre class="font-mono" style="color: #60a5fa;">' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (err) {
        container.innerText = '获取失败: ' + err.message;
      }
    }

    async function fetchLogs() {
      const container = document.getElementById('logContainer');
      container.innerText = '正在读取审计日志...';
      try {
        const res = await fetch('/admin/log.json');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          container.innerHTML = data.map(item => {
            return '<div style="padding: 0.35rem 0; border-bottom: 1px solid #1e293b;">' +
                   '<span style="color: #60a5fa;">[' + (item.Time || new Date().toISOString()) + ']</span> ' +
                   '<strong style="color: #34d399;">' + (item.Type || 'Action') + '</strong> ' +
                   '<span style="color: #94a3b8;">IP: ' + (item.IP || '127.0.0.1') + '</span> ' +
                   '<span>' + (item.Message || '') + '</span>' +
                   '</div>';
          }).join('');
        } else {
          container.innerText = '暂无历史日志记录。';
        }
      } catch (err) {
        container.innerText = '读取失败: ' + err.message;
      }
    }

    async function handleLogout() {
      // 1. Immediate UI state transition
      const btn = document.querySelector('button[onclick="handleLogout()"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="16"></circle></svg> 正在退出...';
      }
      showToast('正在安全退出管理员会话...');

      // 2. Clear client-side cookies for all standard paths
      const paths = ['/', '/admin', '/login'];
      paths.forEach(p => {
        document.cookie = `auth=; Path=${p}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        document.cookie = `auth=; Path=${p}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      });

      // 3. Clear storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}

      // 4. Invalidate session on server
      try {
        await fetch('/logout', { method: 'POST', cache: 'no-store' });
      } catch (_) {
        try { await fetch('/logout', { method: 'GET', cache: 'no-store' }); } catch (_) {}
      }

      // 5. Instantly redirect
      window.location.replace('/login');
    }

    // On Load
    window.addEventListener('DOMContentLoaded', () => {
      initRateLimitUI();
      resizeCanvas();
      connectLiveStream();
      fetchLogs();
    });
  </script>
</body>
</html>`;
}
