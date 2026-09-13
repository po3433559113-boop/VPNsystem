// loginHtml.js - Self-contained, elegant admin login page and noADMIN guide
export function renderNoAdminHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>未配置 ADMIN 管理员密码 | EdgeTunnel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0b0f17;
      --bg-surface: #111827;
      --bg-elevated: #1e293b;
      --border-strong: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-warn: #f59e0b;
      --accent-primary: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .guide-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 20px;
      padding: 2.25rem;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: var(--accent-warn);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #fff;
    }
    .desc {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .step-box {
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }
    .step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.2);
      color: var(--accent-primary);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      flex-shrink: 0;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="guide-card">
    <div style="display: flex; align-items: center; gap: 1rem;">
      <div class="icon-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      </div>
      <div>
        <div class="title">未检测到 ADMIN 变量</div>
        <div style="font-size: 0.82rem; color: var(--text-muted);">需配置 Cloudflare 环境变量/机密</div>
      </div>
    </div>

    <div class="desc">
      当前服务未设置默认密码。根据 EdgeTunnel 原生安全规范，请前往 Cloudflare 仪表盘或环境变量中配置 <code>ADMIN</code> 文本以启用管理面板。
    </div>

    <div class="step-box">
      <div class="step-item">
        <div class="step-num">1</div>
        <div>打开 <strong>Cloudflare Worker</strong> 控制台</div>
      </div>
      <div class="step-item">
        <div class="step-num">2</div>
        <div>进入 <strong>设置 (Settings)</strong> &rarr; <strong>变量和机密 (Variables and Secrets)</strong></div>
      </div>
      <div class="step-item">
        <div class="step-num">3</div>
        <div>添加变量 <code>ADMIN</code>，值填写您自定义的管理员密码并部署</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function renderLoginHtml(errorMsg = '') {
  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EdgeTunnel 管理员登录</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0b0f17;
      --bg-surface: #111827;
      --bg-elevated: #1e293b;
      --border-subtle: #1e293b;
      --border-strong: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-primary: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.25);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .login-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 20px;
      padding: 2.25rem;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .brand-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.75rem;
    }
    .brand-logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #2563eb, #38bdf8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px var(--accent-glow);
    }
    .brand-title {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg-base);
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      color: #fff;
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: all 0.15s;
    }
    .form-input:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .btn-login {
      width: 100%;
      padding: 0.8rem;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35);
      transition: all 0.15s;
    }
    .btn-login:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    }
    .error-box {
      padding: 0.6rem 0.85rem;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 0.82rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="brand-header">
      <div class="brand-logo">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 2.5V9l4.5 1-2.5 3.5L16 18l-3 4-2-3-4-1 2-5-3.5-1.5L7 7l4-5z"/></svg>
      </div>
      <div>
        <div class="brand-title">EdgeTunnel 控制台</div>
        <div class="brand-desc">请输入 Cloudflare 环境变量中设置的 ADMIN 密码</div>
      </div>
    </div>

    ${errorMsg ? `<div class="error-box">${errorMsg}</div>` : ''}

    <form id="loginForm" method="POST" action="/login" style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div class="form-group">
        <label class="form-label">管理员密码 (ADMIN Password)</label>
        <input type="password" name="password" id="password" class="form-input" placeholder="输入 Cloudflare 变量中的 ADMIN 密码" required autofocus>
      </div>
      <button type="submit" class="btn-login">安全登录</button>
    </form>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwd = document.getElementById('password').value;
      const formData = new URLSearchParams();
      formData.append('password', pwd);

      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });
        if (res.ok) {
          window.location.href = '/admin';
        } else {
          alert('密码错误，请确认 Cloudflare 变量与机密中的 ADMIN 文本');
        }
      } catch (err) {
        window.location.href = '/admin';
      }
    });
  </script>
</body>
</html>`;
}
