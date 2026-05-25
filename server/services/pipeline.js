const configManager = require('./config-manager');
const { historyStore, workflowStore } = require('../db/database');
const { fetchAllImages } = require('./image-service');

async function generateArticle() {
  const aiUrl = configManager.getRawConfig('ai.provider_url');
  const aiKey = configManager.getRawConfig('ai.api_key');
  const aiModel = configManager.getRawConfig('ai.model');
  const maxTokens = configManager.getRawConfig('ai.max_tokens') || '3000';
  const systemPrompt = configManager.getRawConfig('prompt.system') || getDefaultSystemPrompt();
  const userPrompt = configManager.getRawConfig('prompt.user') || getDefaultUserPrompt();

  const isAnthropic = aiUrl.includes('anthropic');
  const headers = { 'Content-Type': 'application/json' };
  const body = isAnthropic
    ? { model: aiModel, max_tokens: parseInt(maxTokens), system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }
    : { model: aiModel, max_tokens: parseInt(maxTokens), messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] };

  if (isAnthropic) {
    headers['x-api-key'] = aiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = 'Bearer ' + aiKey;
  }

  const response = await fetch(aiUrl, { method: 'POST', headers, body: JSON.stringify(body) });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('AI API error (' + response.status + '): ' + errText);
  }

  const data = await response.json();

  // Anthropic: { content: [{ text: "..." }] }, OpenAI: { choices: [{ message: { content: "..." } }] }
  const raw = isAnthropic
    ? (data.content || []).map(c => c.text || '').join('')
    : (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
  if (!raw) throw new Error('AI returned empty content');

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Cannot parse JSON from AI response');
  return JSON.parse(match[0]);
}

function countChars(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
}

function parseAndTruncate(article) {
  let content = article.content;
  const wordCount = countChars(content);

  if (wordCount > 850) {
    const parts = content.split(/(?=<h2>|<p>)/);
    let result = '';
    let total = 0;
    for (const part of parts) {
      const len = countChars(part);
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
    search_query: [configManager.getRawConfig('image.query_prefix'), keywords[0]].filter(Boolean).join(' '),
  };
}

function mergeImages(articleContent, images) {
  if (!images.length) return { content: articleContent, coverUrl: '' };

  var imgStyle = 'style="width:100%;max-width:600px;height:auto;border-radius:8px;margin:20px 0;display:block;"';
  var content = articleContent;
  var h2Count = 0;
  var imgIndex = 0;

  content = content.replace(/<h2>/g, function (match) {
    h2Count++;
    if (h2Count > 1 && h2Count % 2 === 0 && imgIndex < images.length) {
      var imgUrl = images[imgIndex].thumb || images[imgIndex].url;
      imgIndex++;
      return '<img src="' + imgUrl + '" ' + imgStyle + ' />' + match;
    }
    return match;
  });

  var coverUrl = images[0].url;
  content = '<img src="' + coverUrl + '" ' + imgStyle + ' />' + content;

  return { content: content, coverUrl: coverUrl };
}

async function getWeChatAccessToken() {
  const appId = configManager.getRawConfig('wechat.app_id');
  const appSecret = configManager.getRawConfig('wechat.app_secret');
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

async function runPipeline() {
  const executionId = Date.now().toString();
  const startTime = new Date().toISOString();
  workflowStore.set('last_execution_at', startTime);
  workflowStore.set('last_execution_status', 'running');

  try {
    const article = await generateArticle();
    const parsed = parseAndTruncate(article);
    const images = await fetchAllImages(parsed);
    const merged = mergeImages(parsed.content, images);
    const accessToken = await getWeChatAccessToken();

    let mediaId = '';
    if (merged.coverUrl) {
      mediaId = await uploadCover(accessToken, merged.coverUrl);
    }

    await createDraft(accessToken, {
      title: parsed.title,
      digest: parsed.digest,
      content: merged.content,
    }, mediaId);

    const items = historyStore.get('items', []);
    items.unshift({
      id: executionId,
      execution_id: executionId,
      title: parsed.title,
      digest: parsed.digest,
      word_count: parsed.word_count,
      cover_url: merged.coverUrl,
      status: 'success',
      created_at: startTime,
    });
    historyStore.set('items', items.slice(0, 200));
    workflowStore.set('last_execution_status', 'success');
    return { success: true, title: parsed.title };
  } catch (err) {
    const items = historyStore.get('items', []);
    items.unshift({
      id: executionId,
      execution_id: executionId,
      title: 'Generation failed',
      status: 'error',
      error_message: err.message,
      created_at: startTime,
    });
    historyStore.set('items', items.slice(0, 200));
    workflowStore.set('last_execution_status', 'error');
    throw err;
  }
}

function getDefaultSystemPrompt() {
  return '你是一位优秀的中文自媒体作者，擅长写有深度、有温度的文章。请用中文回复。';
}

function getDefaultUserPrompt() {
  return '请生成一篇有深度的自媒体文章。\n\n要求：\n1. 标题：吸引眼球，15-25字\n2. 摘要：30-60字\n3. 正文：严格控制在850字以内\n4. 格式：HTML格式，小标题h2，金句<strong>加粗</strong>，适当emoji\n5. 关键词：3-5个英文关键词\n\n输出JSON：{"title":"标题","digest":"摘要","content":"HTML正文","keywords":["关键词1","关键词2","关键词3"]}';
}

module.exports = { runPipeline, generateArticle, parseAndTruncate };
