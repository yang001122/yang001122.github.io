const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 验证必要的API密钥
if (!OPENAI_API_KEY) {
  console.warn("警告：未配置 OPENAI_API_KEY 环境变量。OpenAI/GPT功能将不可用。");
}

// 初始化OpenAI客户端
const openai = OPENAI_API_KEY ? new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: BASE_URL,
}) : null;

// 初始化Google Gemini客户端
let geminiAI = null;
if (GEMINI_API_KEY) {
  try {
    geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.warn("警告：初始化Gemini API客户端失败:", error.message);
  }
}

// 初始化DeepSeek客户端 (使用OpenAI兼容接口)
const deepseek = DEEPSEEK_API_KEY ? new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1", // DeepSeek API的基础URL
}) : null;

// 测试路由
app.get('/', (req, res) => {
  const availableModels = [
    openai ? "GPT" : null,
    geminiAI ? "Gemini" : null,
    deepseek ? "DeepSeek" : null
  ].filter(Boolean);
  
  res.json({
    message: '后端服务正常运行！',
    availableModels: availableModels,
    endpoints: ['/api/gpt', '/api/gemini', '/api/deepseek'],
    deepseekModels: ['deepseek-chat', 'deepseek-r1']
  });
});

// 处理GPT请求
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

// 处理Gemini请求
app.post('/api/gemini', async (req, res) => {
  if (!geminiAI) {
    return res.status(503).json({ error: "Gemini API未配置，此功能不可用" });
  }
  
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }
    
    const model = geminiAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    res.json({ choices: [{ message: { content: text } }] });
  } catch (error) {
    console.error('调用 Gemini API 时出错:', error);
    res.status(500).json({
      error: "调用 Gemini API 时出错",
      details: error.message || "未知错误"
    });
  }
});

// 处理DeepSeek请求
app.post('/api/deepseek', async (req, res) => {
  if (!deepseek) {
    return res.status(503).json({ error: "DeepSeek API未配置，此功能不可用" });
  }
  try {
    const { prompt, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }
    
    // 使用官方文档指定的模型名称
    const modelName = model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
    
    console.log(`使用DeepSeek模型: ${modelName}`); // 添加日志以便调试
    
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

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器正在运行，端口: ${PORT}`);
  console.log(`可用的API: ${openai ? 'GPT ' : ''}${geminiAI ? 'Gemini ' : ''}${deepseek ? 'DeepSeek' : ''}`);
});