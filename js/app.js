// ═══ 主逻辑 — DOM 操作、事件绑定、UI 状态管理 ═══

(function () {
  'use strict';

  const els = {
    taskInput: document.getElementById('taskInput'),
    stateInput: document.getElementById('stateInput'),
    splitBtn: document.getElementById('splitBtn'),
    emptyState: document.getElementById('emptyState'),
    resultSection: document.getElementById('resultSection'),
    stepsList: document.getElementById('stepsList'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMsg: document.getElementById('errorMsg'),
    errorText: document.getElementById('errorText'),
    resetStepsBtn: document.getElementById('resetStepsBtn'),
  };

  // ═══ 初始化 ═══
  function init() {
    _bindEvents();
    document.addEventListener('settings-updated', () => {});
  }

  // ═══ 事件绑定 ═══
  function _bindEvents() {
    els.splitBtn.addEventListener('click', handleSplit);

    // Enter 快捷跳转到下一个输入框（Shift+Enter 换行）
    els.taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        els.stateInput.focus();
      }
    });
    els.stateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSplit();
      }
    });

    els.resetStepsBtn.addEventListener('click', _resetSteps);
  }

  // ═══ 核心：拆分任务 ═══
  async function handleSplit() {
    const task = els.taskInput.value.trim();
    const state = els.stateInput.value.trim();

    if (!task || !state) {
      _showError('两个输入框都要填哦～');
      // 抖动提示
      if (!task) els.taskInput.focus();
      else els.stateInput.focus();
      return;
    }

    // 检查设置
    try {
      const raw = localStorage.getItem('task-splitter-settings');
      if (!raw) {
        _showError('请先点击右下角 ⚙️ 配置 Worker 地址和 API Key');
        return;
      }
      const s = JSON.parse(raw);
      if (!s.workerUrl || !s.apiKey) {
        _showError('请先点击右下角 ⚙️ 配置 Worker 地址和 API Key');
        return;
      }
    } catch {
      _showError('设置读取失败，请重新配置 ⚙️');
      return;
    }

    // 进入加载态
    _setLoading(true);
    _hideError();
    els.emptyState.hidden = true;
    els.resultSection.hidden = false;
    els.stepsList.innerHTML = '';

    try {
      const steps = await Api.splitTask(task, state);
      _renderSteps(steps);
    } catch (err) {
      _showError(err.message);
    } finally {
      _setLoading(false);
    }
  }

  // ═══ 渲染步骤列表 ═══
  function _renderSteps(steps) {
    els.stepsList.innerHTML = '';
    steps.forEach((step, i) => {
      const li = document.createElement('li');
      li.style.animationDelay = `${i * 0.08}s`;

      const span = document.createElement('span');
      span.className = 'step-text';
      span.textContent = step;

      li.appendChild(span);

      // 点击打勾
      li.addEventListener('click', () => {
        li.classList.toggle('checked');
      });

      els.stepsList.appendChild(li);
    });
  }

  // ═══ 重置所有打勾 ═══
  function _resetSteps() {
    els.stepsList.querySelectorAll('li.checked').forEach(li => {
      li.classList.remove('checked');
    });
  }

  // ═══ 加载态切换 ═══
  function _setLoading(loading) {
    els.loadingIndicator.hidden = !loading;
    els.splitBtn.disabled = loading;
    els.splitBtn.innerHTML = loading
      ? '<span class="split-btn-icon">⏳</span><span>拆解中...</span>'
      : '<span class="split-btn-icon">🔨</span><span>拆分</span>';
  }

  // ═══ 错误显示/隐藏 ═══
  function _showError(msg) {
    els.errorText.textContent = msg;
    els.errorMsg.hidden = false;
    els.emptyState.hidden = true;
    els.resultSection.hidden = false;
  }

  function _hideError() {
    els.errorMsg.hidden = true;
  }

  // ═══ 启动 ═══
  document.addEventListener('DOMContentLoaded', init);
})();
