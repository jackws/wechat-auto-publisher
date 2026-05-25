const api = {
  async request(method, path, body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`/api${path}`, options);
    return response.json();
  },

  // Config
  getConfig: () => api.request('GET', '/config'),
  updateConfig: (updates) => api.request('PUT', '/config', { updates, _v: 2 }),
  testAI: () => api.request('POST', '/config/test-ai'),
  testWeChat: () => api.request('POST', '/config/test-wechat'),
  testPexels: () => api.request('POST', '/config/test-pexels'),
  testBing: () => api.request('POST', '/config/test-bing'),

  // Workflow
  getWorkflowStatus: () => api.request('GET', '/workflow/status'),
  activateWorkflow: () => api.request('POST', '/workflow/activate'),
  deactivateWorkflow: () => api.request('POST', '/workflow/deactivate'),
  triggerWorkflow: () => api.request('POST', '/workflow/trigger'),

  // History
  getHistory: (page = 1) => api.request('GET', `/history?page=${page}`),

  // Streaming generation
  streamGenerate(onChunk, onArticle, onImages, onComplete, onError, onStatus) {
    const eventSource = new EventSource('/api/generate/stream', { method: 'POST' });

    // EventSource only supports GET, so we need to use fetch with ReadableStream
    fetch('/api/generate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) return;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              const dataLine = lines[lines.indexOf(line) + 1];
              if (dataLine && dataLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  switch (eventType) {
                    case 'chunk': onChunk?.(data); break;
                    case 'article': onArticle?.(data); break;
                    case 'images': onImages?.(data); break;
                    case 'complete': onComplete?.(data); break;
                    case 'error': onError?.(data); break;
                    case 'status': onStatus?.(data); break;
                  }
                } catch (e) {}
              }
            }
          }

          read();
        });
      }

      read();
    }).catch(err => {
      onError?.({ message: err.message });
    });
  },

  // Verify user's own wechat credentials
  verifyWechat: (app_id, app_secret) =>
    api.request('POST', '/generate/verify-wechat', { app_id, app_secret }),

  // Publish with selected images (supports user's own wechat credentials)
  publish: (article, selectedImages, coverIndex, wechat_app_id, wechat_app_secret) =>
    api.request('POST', '/generate/publish', { article, selectedImages, coverIndex, wechat_app_id, wechat_app_secret }),
};
