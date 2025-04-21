const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const app = express();

// 中间件
app.use(cors({
  origin: ['https://yang001122.github.io', 'http://localhost:3000'], // 允许GitHub Pages和本地开发
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json()); // 解析 JSON 请求体
app.use(express.static(path.join(__dirname, '../Public'))); // 提供静态文件

// 初始化 OpenAI 客户端
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-1X5R1LIC6EAxyT8JBoObhgrATuXi7G6hyQHtDsa0BoIt4isk';
const BASE_URL = "https://xiaoai.plus/v1"; // 你指定的接口地址

if (!OPENAI_API_KEY) {
  console.error("错误：未配置 OPENAI_API_KEY 环境变量。");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: BASE_URL,
});

// 添加一个简单的 GET / 路由，用于测试
app.get('/', (req, res) => {
  res.json({ message: '后端服务正常运行！请使用 POST /api/gemini 或 /api/gpt 端点与AI交互。' });
});

// 处理 API 请求的通用函数
async function handleModelRequest(req, res) {
  console.log('收到前端请求:', req.body); // 添加日志，调试用
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      console.error('缺少 prompt 参数');
      return res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
    }
    
    // 调用 OpenAI 兼容接口
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    console.log('OpenAI API 响应:', completion); // 添加日志，调试用
    
    if (completion.choices && completion.choices.length > 0) {
      const reply = completion.choices[0].message.content;
      res.json({ choices: [{ message: { content: reply } }] }); // 适配前端期望的格式
    } else {
      console.error('OpenAI API 返回空响应:', completion);
      res.status(500).json({
        error: "调用 OpenAI API 成功但未收到有效的回复",
        details: completion
      });
    }
  } catch (error) {
    console.error('调用 OpenAI API 时出错:', error);
    let errorDetails = error.message || "未知错误";
    res.status(500).json({
      error: "调用 OpenAI API 时出错",
      details: errorDetails
    });
  }
}

// API 端点：POST /api/gemini
app.post('/api/gemini', handleModelRequest);

// API 端点：POST /api/gpt
app.post('/api/gpt', handleModelRequest);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器正在运行，端口: ${PORT}`);
});