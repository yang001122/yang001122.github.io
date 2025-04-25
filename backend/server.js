//代码内容：server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const multer = require('multer'); // 用于处理文件上传
const fs = require('fs');
const app = express();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 创建唯一文件名并保留原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// 文件上传配置
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制文件大小为10MB
  fileFilter: function(req, file, cb) {
    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/plain' // .txt
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。支持的类型：图片, PDF, Word, Excel, 文本文件'));
    }
  }
});

// 中间件
app.use(cors({
  origin: ['https://yang001122.github.io', 'http://localhost:3000', 'http://165.232.161.255:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // 提供上传文件的静态访问

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
    endpoints: ['/api/gpt', '/api/deepseek', '/api/upload']
  });
});

// 文件上传路由
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件被上传' });
    }

    // 返回文件信息
    res.json({ 
      success: true, 
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.filename}` // 用于前端访问
      }
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ error: '文件上传失败', details: error.message });
  }
});

// 处理上传文件的AI解析
app.post('/api/analyze-file', async (req, res) => {
  try {
    const { fileUrl, model, prompt } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: "缺少文件URL" });
    }

    if (!model || (model !== 'gpt' && model !== 'deepseek')) {
      return res.status(400).json({ error: "无效的模型选择" });
    }

    // 获取文件的完整路径
    const filePath = path.join(__dirname, '..', fileUrl.replace(/^\//, ''));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "文件不存在" });
    }

    // 设置响应头，表明使用SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 读取文件内容
    const fileBuffer = fs.readFileSync(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    let clientToUse;
    let modelName;
    
    if (model === 'gpt') {
      if (!openai) {
        res.write(`data: ${JSON.stringify({ error: "OpenAI API未配置，此功能不可用" })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      clientToUse = openai;
      modelName = "gpt-3.5-turbo";
    } else { // deepseek
      if (!deepseek) {
        res.write(`data: ${JSON.stringify({ error: "DeepSeek API未配置，此功能不可用" })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      clientToUse = deepseek;
      modelName = "deepseek-chat";
    }

    // 创建要发送给AI的上下文消息
    let messages = [];
    
    // 基本文件信息
    const fileInfo = `文件名: ${path.basename(filePath)}\n文件类型: ${path.extname(filePath)}\n文件大小: ${(fileBuffer.length / 1024).toFixed(2)}KB`;
    
    // 如果是图片，直接发送base64编码
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
      const base64Image = `data:image/${fileExtension.substring(1)};base64,${fileBuffer.toString('base64')}`;
      
      // 为图片类型文件创建消息
      messages = [
        { role: "system", content: "你是一个可以分析图片的助手。请根据用户上传的图片内容回答问题。" },
        { role: "user", content: [
          { type: "text", text: prompt || "请描述这张图片并分析其中的内容。" },
          { type: "image_url", image_url: { url: base64Image } }
        ]}
      ];
    } else {
      // 对于其他文件类型，尝试提取文本内容
      let fileContent = '';
      
      // 简单处理文本文件
      if (['.txt', '.json', '.csv', '.md'].includes(fileExtension)) {
        fileContent = fileBuffer.toString('utf8');
      } else {
        // 对于PDF、Word和Excel等文件，告知用户我们目前只能做简单处理
        fileContent = `[此文件是${fileExtension}格式，已上传但仅能进行简单分析。请根据文件类型询问具体问题]`;
      }
      
      // 为其他类型文件创建消息
      messages = [
        { role: "system", content: "你是一个可以分析文档内容的助手。请根据用户上传的文件内容回答问题。" },
        { role: "user", content: `${prompt || "请分析以下文件内容并提供摘要："}\n\n文件信息:\n${fileInfo}\n\n文件内容:\n${fileContent}` }
      ];  
    }

    try {
      const stream = await clientToUse.chat.completions.create({
        model: modelName,
        messages: messages,
        stream: true, // 启用流式传输
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
        }
      }

      // 发送结束信号
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error(`调用 ${model.toUpperCase()} API 进行文件分析时出错:`, error);
      res.write(`data: ${JSON.stringify({ error: `调用 ${model.toUpperCase()} API 进行文件分析时出错`, details: error.message || "未知错误" })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('文件分析错误:', error);
    res.write(`data: ${JSON.stringify({ error: "文件分析失败", details: error.message || "未知错误" })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
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
  console.log(`上传目录: ${uploadDir}`);
});