const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const app = express();

// 中间件
app.use(cors({
  origin: ['https://yang001122.github.io', 'http://localhost:3000', 'http://165.232.161.255:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Public')));

// 初始化各种API客户端
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.BASE_URL || "https://xiaoai.plus/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 验证必要的API密钥
if (!OPENAI_API_KEY) {
  console.warn("警告：未配置 OPENAI_API_KEY 环境变量。OpenAI/GPT功能将不可用。");
}

// 初始化OpenAI客户端
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: BASE_URL,
}) : null;

// 初始化DeepSeek客户端 (使用OpenAI兼容接口)
const deepseek = DEEPSEEK_API_KEY ? new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
}) : null;

// 测试路由
app.get('/', (req, res) => {
  const availableModels = [
    openai ? "GPT" : null,
    deepseek ? "DeepSeek" : null
  ].filter(Boolean);
  
  res.json({
    message: '后端服务正常运行！',
    availableModels: availableModels,
    endpoints: ['/api/gpt', '/api/deepseek', '/api/gpt/stream', '/api/deepseek/stream']
  });
});

// 处理GPT请求（非流式）
app.post('/api/gpt', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API未配置，此功能不可用" });
  }
  
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });
    
    if (completion.choices && completion.choices.length > 0) {
      const reply = completion.choices[0].message.content;
      res.json({ choices: [{ message: { content: reply } }] });
    } else {
      res.status(500).json({
        error: "调用 OpenAI API 成功但未收到有效的回复",
        details: completion
      });
    }
  } catch (error) {
    console.error('调用 OpenAI API 时出错:', error);
    res.status(500).json({
      error: "调用 OpenAI API 时出错",
      details: error.message || "未知错误"
    });
  }
});

// 处理DeepSeek请求（非流式）
app.post('/api/deepseek', async (req, res) => {
  if (!deepseek) {
    return res.status(503).json({ error: "DeepSeek API未配置，此功能不可用" });
  }
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }
    
    const modelName = 'deepseek-chat';
    console.log(`使用DeepSeek模型: ${modelName}`);
    
    const completion = await deepseek.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
    });
    
    if (completion.choices && completion.choices.length > 0) {
      const reply = completion.choices[0].message.content;
      res.json({ choices: [{ message: { content: reply } }] });
    } else {
      res.status(500).json({
        error: "调用 DeepSeek API 成功但未收到有效的回复",
        details: completion
      });
    }
  } catch (error) {
    console.error('调用 DeepSeek API 时出错:', error);
    res.status(500).json({
      error: "调用 DeepSeek API 时出错",
      details: error.message || "未知错误"
    });
  }
});

// 处理GPT流式请求
app.get('/api/gpt/stream', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API未配置，此功能不可用" });
  }

  const prompt = req.query.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "查询参数中缺少 'prompt'" });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0].delta.content) {
        const content = chunk.choices[0].delta.content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('调用 OpenAI 流式 API 时出错:', error);
    res.write(`data: ${JSON.stringify({ error: "调用 OpenAI 流式 API 时出错", details: error.message || "未知错误" })}\n\n`);
  } finally {
    res.end();
  }
});

// 处理DeepSeek流式请求
app.get('/api/deepseek/stream', async (req, res) => {
  if (!deepseek) {
    return res.status(503).json({ error: "DeepSeek API未配置，此功能不可用" });
  }

  const prompt = req.query.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "查询参数中缺少 'prompt'" });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0].delta.content) {
        const content = chunk.choices[0].delta.content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('调用 DeepSeek 流式 API 时出错:', error);
    res.write(`data: ${JSON.stringify({ error: "调用 DeepSeek 流式 API 时出错", details: error.message || "未知错误" })}\n\n`);
  } finally {
    res.end();
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器正在运行，端口: ${PORT}`);
  console.log(`可用的API: ${openai ? 'GPT ' : ''}${deepseek ? 'DeepSeek' : ''}`);
});