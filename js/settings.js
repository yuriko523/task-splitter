// ═══ 设置面板 — 管理 Worker URL + API Key ═══

const Settings = {
  STORAGE_KEY: 'task-splitter-settings',

  // DOM 引用（由 init 时绑定）
  els: {},

  init() {
    this.els = {
      modal: document.getElementById('settingsModal'),
      openBtn: document.getElementById('settingsBtn'),
      closeBtn: document.getElementById('modalCloseBtn'),
      workerUrl: document.getElementById('workerUrlInput'),
      apiKey: document.getElementById('apiKeyInput'),
      testBtn: document.getElementById('testBtn'),
      testResult: document.getElementById('testResult'),
      saveBtn: document.getElementById('saveSettingsBtn'),
    };

    this._bindEvents();
    this._loadFromStorage();
  },

  _bindEvents() {
    this.els.openBtn.addEventListener('click', () => this.open());
    this.els.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    // 点灰色背景关闭
    this.els.modal.addEventListener('click', (e) => {
      if (e.target === this.els.modal) this.close();
    });
    // 按 Escape 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.els.modal.classList.contains('show')) this.close();
    });
    this.els.testBtn.addEventListener('click', () => this.testConnection());
    this.els.saveBtn.addEventListener('click', () => this.save());
  },

  // ─── 打开弹窗 ───
  open() {
    this._loadFromStorage();
    this.els.testResult.hidden = true;
    this.els.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  },

  // ─── 关闭弹窗 ───
  close() {
    this.els.modal.classList.remove('show');
    document.body.style.overflow = '';
  },

  // ─── 从 localStorage 读取 ───
  _loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.els.workerUrl.value = data.workerUrl || '';
        this.els.apiKey.value = data.apiKey || '';
      }
    } catch {
      // 静默失败
    }
  },

  // ─── 获取当前值 ───
  get workerUrl() {
    return this.els.workerUrl.value.trim();
  },
  get apiKey() {
    return this.els.apiKey.value.trim();
  },

  // ─── 检查是否已配置 ───
  isConfigured() {
    return !!(this.workerUrl && this.apiKey);
  },

  // ─── 测试连接 ───
  async testConnection() {
    const url = this.workerUrl;
    const key = this.apiKey;

    if (!url || !key) {
      this._showTestResult('请填写 Worker 地址和 API Key', false);
      return;
    }

    this.els.testBtn.disabled = true;
    this.els.testBtn.textContent = '测试中...';
    this.els.testResult.hidden = true;

    try {
      const resp = await fetch(`${url.replace(/\/+$/, '')}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await resp.json();

      if (data.valid) {
        this._showTestResult(`✅ 连接成功！模型: ${data.model}`, true);
      } else {
        this._showTestResult(`❌ ${data.error || 'Key 无效'}`, false);
      }
    } catch (err) {
      this._showTestResult(`❌ 无法连接到 Worker: ${err.message}`, false);
    } finally {
      this.els.testBtn.disabled = false;
      this.els.testBtn.innerHTML = '<span>🔗</span> 测试连接';
    }
  },

  _showTestResult(msg, ok) {
    this.els.testResult.textContent = msg;
    this.els.testResult.className = 'test-result ' + (ok ? 'success' : 'error');
    this.els.testResult.hidden = false;
  },

  // ─── 保存设置 ───
  save() {
    if (!this.workerUrl || !this.apiKey) {
      this._showTestResult('请填写 Worker 地址和 API Key', false);
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        workerUrl: this.workerUrl,
        apiKey: this.apiKey,
      }));
      this._showTestResult('✅ 设置已保存', true);
      // 通知其他模块设置已更新
      document.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (err) {
      this._showTestResult(`❌ 保存失败: ${err.message}`, false);
    }
  },
};

// ═══ 启动 ═══
document.addEventListener('DOMContentLoaded', () => Settings.init());
