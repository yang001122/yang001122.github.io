//代码内容：server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const multer = require('multer'); // 引入multer用于处理文件上传
const fs = require('fs').promises; // 引入fs/promises用于异步文件操作

const app = express();

// 设置文件上传存储
const upload = multer({ dest: 'uploads/' }); // 文件将临时存储在 'uploads/' 目录下

// 中间件
app.use(cors({
  origin: ['https://yang001122.github.io', 'http://localhost:3000', 'http://165.232.161.255:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // 允许访问上传的文件 (如果需要的话，通常上传后会处理掉)


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
    endpoints: ['/api/gpt', '/api/deepseek', '/api/upload'] // 添加新的上传文件endpoint
  });
});

// 新增文件上传处理接口
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
    }

    const filePath = req.file.path;
    const originalname = req.file.originalname;

    try {
        // 简单的文本文件解析示例
        const fileContent = await fs.readFile(filePath, 'utf8');

        // 在处理完文件后删除临时文件
        await fs.unlink(filePath);

        res.json({
            message: '文件上传并解析成功',
            fileName: originalname,
            fileContent: fileContent // 将文件内容发送回客户端
        });

    } catch (error) {
        console.error('处理文件时出错:', error);
        // 发生错误时也尝试删除临时文件
        await fs.unlink(filePath).catch(err => console.error('删除临时文件失败:', err));
        res.status(500).json({ error: '处理文件时出错', details: error.message });
    }
});


// 处理GPT请求 (支持流式传输) - 修改以包含文件内容
app.post('/api/gpt', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API未配置，此功能不可用" });
  }

  try {
    const { prompt, fileContent } = req.body; // 接收文件内容
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }

    let fullPrompt = prompt;
    if (fileContent) {
        fullPrompt = `以下是文件的内容：\n\n${fileContent}\n\n请根据文件内容回答我的问题：${prompt}`;
    }

    // 设置响应头，表明使用SSE (Server-Sent Events) 或者简单的流式传输
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 或者你想要使用的其他GPT模型
      messages: [{ role: "user", content: fullPrompt }], // 使用包含文件内容的fullPrompt
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

// 处理DeepSeek请求 (支持流式传输) - 修改以包含文件内容
app.post('/api/deepseek', async (req, res) => {
  if (!deepseek) {
    return res.status(503).json({ error: "DeepSeek API未配置，此功能不可用" });
  }
  try {
    const { prompt, fileContent } = req.body; // 接收文件内容
    if (!prompt) {
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }

    let fullPrompt = prompt;
    if (fileContent) {
        fullPrompt = `以下是文件的内容：\n\n${fileContent}\n\n请根据文件内容回答我的问题：${prompt}`;
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
      messages: [{ role: "user", content: fullPrompt }], // 使用包含文件内容的fullPrompt
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