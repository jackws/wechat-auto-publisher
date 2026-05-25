const configManager = require('./config-manager');

// Pexels - 中国大陆可访问
async function searchPexels(query, count) {
  var key = configManager.getRawConfig('image.pexels_key');
  if (!key) return [];

  try {
    var url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=' + count + '&orientation=landscape';
    var res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) return [];
    var data = await res.json();
    return (data.photos || []).map(function (p) {
      return { source: 'pexels', url: p.src.large, thumb: p.src.medium, author: p.photographer };
    });
  } catch (e) {
    console.error('[Pexels]', e.message);
    return [];
  }
}

// Bing 图片搜索 - 中国大陆可访问
async function searchBing(query, count) {
  var key = configManager.getRawConfig('image.bing_key');
  if (!key) return [];

  try {
    var url = 'https://api.bing.microsoft.com/v7.0/images/search?q=' + encodeURIComponent(query) + '&count=' + count + '&imageType=Photo&size=Large&aspect=Wide';
    var res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key } });
    if (!res.ok) return [];
    var data = await res.json();
    return (data.value || []).map(function (p) {
      return { source: 'bing', url: p.contentUrl, thumb: p.thumbnailUrl, author: p.hostPageDomainFriendlyName };
    });
  } catch (e) {
    console.error('[Bing]', e.message);
    return [];
  }
}

// 智谱 CogView AI 生图 - 中国大陆可用
async function generateCogView(prompt) {
  var key = configManager.getRawConfig('image.cogview_key');
  if (!key) return null;

  try {
    var res = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({
        model: 'cogview-4',
        prompt: prompt,
        size: '1024x576',
      }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    if (data.data && data.data[0] && data.data[0].url) {
      return { source: 'cogview', url: data.data[0].url, thumb: data.data[0].url, author: 'AI' };
    }
    return null;
  } catch (e) {
    console.error('[CogView]', e.message);
    return null;
  }
}

// 通义万相 AI 生图 - 中国大陆可用
async function generateTongyi(prompt) {
  var key = configManager.getRawConfig('image.tongyi_key');
  if (!key) return null;

  try {
    var res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx-v1',
        input: { prompt: prompt },
        parameters: { size: '1024*576', n: 1 },
      }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    // 通义万相是异步的，需要轮询获取结果
    if (data.output && data.output.task_id) {
      return await pollTongyiKey(key, data.output.task_id);
    }
    return null;
  } catch (e) {
    console.error('[Tongyi]', e.message);
    return null;
  }
}

async function pollTongyiKey(apiKey, taskId) {
  for (var i = 0; i < 10; i++) {
    await new Promise(function (r) { setTimeout(r, 2000); });
    try {
      var res = await fetch('https://dashscope.aliyuncs.com/api/v1/tasks/' + taskId, {
        headers: { Authorization: 'Bearer ' + apiKey },
      });
      var data = await res.json();
      if (data.output && data.output.results && data.output.results[0]) {
        return { source: 'tongyi', url: data.output.results[0].url, thumb: data.output.results[0].url, author: 'AI' };
      }
      if (data.output && data.output.task_status === 'FAILED') return null;
    } catch (e) { /* retry */ }
  }
  return null;
}

// 自定义 AI 生图端点
async function generateCustomAI(prompt) {
  var endpoint = configManager.getRawConfig('image.ai_endpoint');
  if (!endpoint) return null;

  try {
    var res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    var imageUrl = data.url || data.image_url || (data.data && data.data[0] && data.data[0].url);
    if (imageUrl) {
      return { source: 'custom-ai', url: imageUrl, thumb: imageUrl, author: 'AI' };
    }
    return null;
  } catch (e) {
    console.error('[CustomAI]', e.message);
    return null;
  }
}

// 从文章中提取多个搜索主题
function extractThemes(article) {
  var title = article.title || '';
  var keywords = article.keywords || [];
  var prefix = configManager.getRawConfig('image.query_prefix') || '';

  var themes = [];

  // 主题1：标题核心词
  if (keywords[0]) themes.push([prefix, keywords[0]].filter(Boolean).join(' '));
  // 主题2：第二关键词
  if (keywords[1]) themes.push([prefix, keywords[1]].filter(Boolean).join(' '));
  // 主题3：第三关键词或标题
  if (keywords[2]) themes.push([prefix, keywords[2]].filter(Boolean).join(' '));
  else if (title) themes.push([prefix, title.slice(0, 10)].filter(Boolean).join(' '));

  return themes;
}

// 为 AI 生图构建详细的文章关联 prompt
function buildAIPrompt(article) {
  var title = article.title || '';
  var keywords = article.keywords || [];
  var content = article.content || '';

  // 提取文章核心意象
  var scene = 'A cinematic photograph';
  if (title) scene += ' inspired by the theme "' + title + '"';
  if (keywords.length) scene += ', representing ' + keywords.join(', ');
  scene += ', soft natural light, warm golden tones, shallow depth of field, editorial photography style, 4k detailed';

  return scene;
}

// 主函数：获取所有图片
async function fetchAllImages(article) {
  var themes = extractThemes(article);
  var sources = (configManager.getRawConfig('image.sources') || 'pexels,cogview').split(',').map(function (s) { return s.trim(); });
  var aiCount = parseInt(configManager.getRawConfig('image.ai_count') || '2');

  var promises = [];

  // 图库搜索：用不同主题搜索，每组取 2 张
  if (sources.indexOf('pexels') !== -1) {
    themes.forEach(function (theme) {
      promises.push(searchPexels(theme, 2));
    });
  }
  if (sources.indexOf('bing') !== -1) {
    themes.forEach(function (theme) {
      promises.push(searchBing(theme, 2));
    });
  }

  // AI 生图：根据文章内容生成
  if (sources.indexOf('cogview') !== -1 && aiCount > 0) {
    var aiPrompt = buildAIPrompt(article);
    for (var i = 0; i < aiCount; i++) {
      promises.push(generateCogView(aiPrompt));
    }
  }
  if (sources.indexOf('tongyi') !== -1 && aiCount > 0) {
    var aiPrompt2 = buildAIPrompt(article);
    for (var j = 0; j < aiCount; j++) {
      promises.push(generateTongyi(aiPrompt2));
    }
  }
  if (sources.indexOf('custom-ai') !== -1 && aiCount > 0) {
    var aiPrompt3 = buildAIPrompt(article);
    for (var k = 0; k < aiCount; k++) {
      promises.push(generateCustomAI(aiPrompt3));
    }
  }

  var results = await Promise.allSettled(promises);
  var allImages = [];

  results.forEach(function (r) {
    if (r.status === 'fulfilled') {
      if (Array.isArray(r.value)) {
        allImages = allImages.concat(r.value);
      } else if (r.value) {
        allImages.push(r.value);
      }
    }
  });

  // 打乱顺序，混合不同来源
  for (var m = allImages.length - 1; m > 0; m--) {
    var n = Math.floor(Math.random() * (m + 1));
    var temp = allImages[m];
    allImages[m] = allImages[n];
    allImages[n] = temp;
  }

  return allImages;
}

module.exports = { fetchAllImages, searchPexels, searchBing, generateCogView };
