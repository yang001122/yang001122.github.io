//代码内容：server.js
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
  baseURL: "https://api.deepseek.com/v1", // DeepSeek API的基础URL
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
    endpoints: ['/api/gpt', '/api/deepseek']
  });
});

// 处理GPT请求 (支持流式传输)
app.post('/api/gpt', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API未配置，此功能不可用" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }

    // 设置响应头，表明使用SSE (Server-Sent Events) 或者简单的流式传输
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 或者你想要使用的其他GPT模型
      messages: [{ role: "user", content: prompt }],
      stream: true, // 启用流式传输
    });

    for await (const chunk of stream) {
      // 提取内容并发送给客户端
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // 使用 SSE 格式发送数据
        res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
      }
    }

    // 发送结束信号
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('调用 OpenAI API 时出错:', error);
    // 发送错误信息给客户端
    res.write(`data: ${JSON.stringify({ error: "调用 OpenAI API 时出错", details: error.message || "未知错误" })}\n\n`);
    res.write('data: [DONE]\n\n'); // 发送结束信号
    res.end();
  }
});

// 处理DeepSeek请求 (支持流式传输)
app.post('/api/deepseek', async (req, res) => {
  if (!deepseek) {
    return res.status(503).json({ error: "DeepSeek API未配置，此功能不可用" });
  }
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }

    // 使用固定的deepseek-chat模型
    const modelName = 'deepseek-chat';

    console.log(`使用DeepSeek模型: ${modelName}`); // 添加日志以便调试

    // 设置响应头，表明使用SSE (Server-Sent Events) 或者简单的流式传输
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await deepseek.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: true, // 启用流式传输
    });

    for await (const chunk of stream) {
       // 提取内容并发送给客户端
       const content = chunk.choices[0]?.delta?.content || '';
       if (content) {
         // 使用 SSE 格式发送数据
         res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
       }
    }

    // 发送结束信号
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('调用 DeepSeek API 时出错:', error);
    // 发送错误信息给客户端
    res.write(`data: ${JSON.stringify({ error: "调用 DeepSeek API 时出错", details: error.message || "未知错误" })}\n\n`);
    res.write('data: [DONE]\n\n'); // 发送结束信号
    res.end();
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器正在运行，端口: ${PORT}`);
  console.log(`可用的API: ${openai ? 'GPT ' : ''}${deepseek ? 'DeepSeek' : ''}`);
});