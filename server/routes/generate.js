const express = require('express');
const router = express.Router();
const configManager = require('../services/config-manager');
const { fetchAllImages } = require('../services/image-service');
const { historyStore, workflowStore } = require('../db/database');

// POST /api/generate/stream - SSE streaming generation
router.post('/stream', async (req, res) => {
  if (!configManager.isConfigured()) {
    return res.status(400).json({ success: false, error: '系统未配置，请联系管理员' });
  }

  const { topic } = req.body || {};

  // 构建提示词：管理员配置的优先，否则用内置默认
  let systemPrompt = configManager.getRawConfig('prompt.system');
  let userPrompt = configManager.getRawConfig('prompt.user');

  if (!systemPrompt || systemPrompt === 'test') {
    systemPrompt = '你是一位优秀的中文自媒体作者，擅长写有深度、有温度的文章。请用中文回复。';
  }
  if (!userPrompt || userPrompt === 'test') {
    userPrompt = topic
      ? '请围绕「' + topic + '」写一篇自媒体文章。\n\n要求：\n1. 标题：吸引眼球，15-25字\n2. 摘要：30-60字\n3. 正文：严格控制在850字以内，HTML格式，小标题h2，金句用<strong>加粗</strong>\n4. 关键词：3-5个英文关键词\n\n输出JSON：{"title":"标题","digest":"摘要","content":"HTML正文","keywords":["关键词1","关键词2","关键词3"]}'
      : '请生成一篇有深度的自媒体文章。\n\n要求：\n1. 标题：吸引眼球，15-25字\n2. 摘要：30-60字\n3. 正文：严格控制在850字以内，HTML格式，小标题h2，金句用<strong>加粗</strong>\n4. 关键词：3-5个英文关键词\n\n输出JSON：{"title":"标题","digest":"摘要","content":"HTML正文","keywords":["关键词1","关键词2","关键词3"]}';
  } else if (topic) {
    userPrompt = userPrompt.replace(/\{topic\}/g, topic);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send('status', { stage: 'generating', message: '正在生成文章...' });

    const article = await generateArticleStream(send, systemPrompt, userPrompt);
    send('status', { stage: 'parsing', message: '正在解析内容...' });

    const parsed = parseAndTruncate(article);
    send('article', parsed);

    send('status', { stage: 'images', message: '正在获取配图...' });
    const images = await fetchAllImages(parsed);
    send('images', images);

    send('status', { stage: 'done', message: '生成完成，请预览确认后发布' });
    send('complete', { article: parsed, images });
  } catch (err) {
    send('error', { message: err.message });
  }

  res.end();
});

// POST /api/generate/verify-wechat - Verify user-supplied wechat credentials
router.post('/verify-wechat', async (req, res) => {
  try {
    const { app_id, app_secret } = req.body;
    if (!app_id || !app_secret) {
      return res.status(400).json({ success: false, error: '请填写 AppID 和 AppSecret' });
    }
    const url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + app_id + '&secret=' + app_secret;
    const response = await fetch(url);
    const data = await response.json();
    if (data.access_token) {
      res.json({ success: true, message: '微信凭证验证成功' });
    } else {
      res.json({ success: false, error: '微信验证失败: ' + (data.errmsg || '未知错误') });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: '验证失败: ' + err.message });
  }
});

// POST /api/generate/publish - Publish selected article with images
router.post('/publish', async (req, res) => {
  try {
    const { article, selectedImages, coverIndex, wechat_app_id, wechat_app_secret } = req.body;

    if (!article || !article.title) {
      return res.status(400).json({ success: false, error: '文章内容不完整' });
    }

    // 优先用用户传入的微信凭证，否则用全局配置
    const appId = wechat_app_id || configManager.getRawConfig('wechat.app_id');
    const appSecret = wechat_app_secret || configManager.getRawConfig('wechat.app_secret');
    if (!appId || !appSecret) {
      return res.status(400).json({ success: false, error: '请先绑定微信公众号' });
    }

    const executionId = Date.now().toString();
    const startTime = new Date().toISOString();
    workflowStore.set('last_execution_at', startTime);
    workflowStore.set('last_execution_status', 'running');

    // Merge selected images into content
    const images = selectedImages || [];
    const merged = mergeImages(article.content, images);

    // Get WeChat access token (use user's credentials)
    const accessToken = await getWeChatAccessToken(appId, appSecret);

    // Upload cover
    let mediaId = '';
    const coverUrl = images.length > 0 ? (images[coverIndex || 0].url) : '';
    if (coverUrl) {
      mediaId = await uploadCover(accessToken, coverUrl);
    }

    // Create draft
    await createDraft(accessToken, {
      title: article.title,
      digest: article.digest,
      content: merged.content,
    }, mediaId);

    // Save to history
    const items = historyStore.get('items', []);
    items.unshift({
      id: executionId,
      execution_id: executionId,
      title: article.title,
      digest: article.digest,
      word_count: article.word_count,
      cover_url: coverUrl,
      status: 'success',
      created_at: startTime,
    });
    historyStore.set('items', items.slice(0, 200));
    workflowStore.set('last_execution_status', 'success');

    res.json({ success: true, message: '已发布到微信草稿箱', title: article.title });
  } catch (err) {
    workflowStore.set('last_execution_status', 'error');
    res.status(500).json({ success: false, error: err.message });
  }
});

async function generateArticleStream(send, systemPrompt, userPrompt) {
  const aiUrl = configManager.getRawConfig('ai.provider_url');
  const aiKey = configManager.getRawConfig('ai.api_key');
  const aiModel = configManager.getRawConfig('ai.model');
  const maxTokens = configManager.getRawConfig('ai.max_tokens') || '3000';

  const response = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + aiKey,
    },
    body: JSON.stringify({
      model: aiModel,
      max_tokens: parseInt(maxTokens),
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('AI API error (' + response.status + '): ' + errText);
  }

  let fullContent = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          send('chunk', { text: delta });
        }
      } catch (e) {
        // Skip malformed chunks
      }
    }
  }

  // Parse the complete JSON from the streamed content
  const match = fullContent.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Cannot parse JSON from AI response');
  return JSON.parse(match[0]);
}

function parseAndTruncate(article) {
  let content = article.content;
  const wordCount = content.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;

  if (wordCount > 850) {
    const parts = content.split(/(?=<h2>|<p>)/);
    let result = '';
    let total = 0;
    for (const part of parts) {
      const len = part.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
      if (total + len <= 850) {
        result += part;
        total += len;
      } else {
        break;
      }
    }
    if (!result.includes('</p>')) result += '<p>...</p>';
    content = result;
  }

  const keywords = article.keywords || [];
  return {
    title: article.title,
    digest: article.digest,
    content: content,
    keywords: keywords,
    word_count: Math.min(wordCount, 850),
  };
}

function mergeImages(articleContent, images) {
  if (!images.length) return { content: articleContent };

  const imgStyle = 'style="width:100%;max-width:600px;height:auto;border-radius:8px;margin:20px 0;display:block;"';
  let content = articleContent;
  let h2Count = 0;
  let imgIndex = 0;

  content = content.replace(/<h2>/g, function (match) {
    h2Count++;
    if (h2Count > 1 && h2Count % 2 === 0 && imgIndex < images.length) {
      const imgUrl = images[imgIndex].thumb || images[imgIndex].url;
      imgIndex++;
      return '<img src="' + imgUrl + '" ' + imgStyle + ' />' + match;
    }
    return match;
  });

  if (images.length > 0) {
    const coverUrl = images[0].url;
    content = '<img src="' + coverUrl + '" ' + imgStyle + ' />' + content;
  }

  return { content: content };
}

async function getWeChatAccessToken(appId, appSecret) {
  const url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + appId + '&secret=' + appSecret;
  const response = await fetch(url);
  const data = await response.json();
  if (!data.access_token) throw new Error('Failed to get access_token: ' + (data.errmsg || 'unknown'));
  return data.access_token;
}

async function uploadCover(accessToken, coverUrl) {
  const imgResponse = await fetch(coverUrl);
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
  const formBody = new FormData();
  formBody.append('media', new Blob([imgBuffer], { type: 'image/jpeg' }), 'cover.jpg');
  const url = 'https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=' + accessToken + '&type=image';
  const response = await fetch(url, { method: 'POST', body: formBody });
  const data = await response.json();
  if (!data.media_id) throw new Error('Upload cover failed: ' + (data.errmsg || 'unknown'));
  return data.media_id;
}

async function createDraft(accessToken, article, mediaId) {
  const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + accessToken;
  const body = {
    articles: [{
      title: article.title,
      digest: article.digest,
      content: article.content,
      content_source_url: '',
      thumb_media_id: mediaId,
      need_open_comment: 0,
      only_fans_can_comment: 0,
    }],
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.media_id) throw new Error('Create draft failed: ' + (data.errmsg || 'unknown'));
  return data.media_id;
}

module.exports = router;
