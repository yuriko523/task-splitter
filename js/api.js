// ═══ LLM API 调用封装 — 通过 Cloudflare Worker 转发 ═══

const Api = {
  // 默认 system prompt 用于任务拆分
  DEFAULT_SYSTEM_PROMPT: `你是一个任务拆分助手。将用户的目标拆分成 5-7 个具体的小步骤。

要求：
- 每步必须是一个动作，门槛极低（"穿上拖鞋"而不是"准备出门"）
- 按顺序递进
- 每步一句话，不要额外解释
- 用中文回答

请严格按照以下 JSON 格式返回结果，不要包含其他内容：
{"steps":["步骤1","步骤2","步骤3","步骤4","步骤5"]}`,

  // ─── 调用 Worker /chat ───
  async splitTask(task, state) {
    const raw = localStorage.getItem('task-splitter-settings');
    if (!raw) throw new Error('请先在设置中配置 Worker 地址和 API Key');

    let settings;
    try { settings = JSON.parse(raw); } catch { throw new Error('设置读取失败，请重新配置'); }

    const { workerUrl, apiKey } = settings;
    if (!workerUrl || !apiKey) throw new Error('请先在设置中配置 Worker 地址和 API Key');

    const prompt = `目标: ${task}\n当前状态: ${state}`;

    const resp = await fetch(`${workerUrl.replace(/\/+$/, '')}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        apiKey,
        systemPrompt: this.DEFAULT_SYSTEM_PROMPT,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || `请求失败 (${resp.status})`);
    }

    // 从 DeepSeek 的响应中提取内容
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('API 返回格式异常，请重试');

    // 尝试从返回内容中提取 JSON
    const steps = this._parseSteps(content);
    return steps;
  },

  // ─── 从 LLM 返回文本中解析步骤数组 ───
  _parseSteps(content) {
    // 尝试直接解析为 JSON
    try {
      const parsed = JSON.parse(content.trim());
      if (Array.isArray(parsed.steps)) return parsed.steps;
      if (Array.isArray(parsed)) return parsed;
    } catch { /* 继续尝试其他方式 */ }

    // 尝试从代码块中提取 JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (Array.isArray(parsed.steps)) return parsed.steps;
        if (Array.isArray(parsed)) return parsed;
      } catch { /* 继续 */ }
    }

    // 尝试按行拆分（兜底）
    const lines = content
      .split('\n')
      .map(l => l.replace(/^\d+[\.\、\:]\s*/, '').trim())  // "1. xxx" → "xxx"
      .filter(l => l.length > 2 && !l.startsWith('{') && !l.startsWith('}') && !l.startsWith('```'));

    if (lines.length >= 2) return lines;

    // 实在解析不了就抛错
    throw new Error('无法解析返回结果，请重试');
  },
};
