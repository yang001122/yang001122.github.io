// 代码内容：server.js (修改后支持流式输出)
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const app = express();

// 中间件
app.use(cors({
  origin: ['https://yang001122.github.io', 'http://localhost:3000', 'http://165.232.161.255:3000'], // 根据需要调整源
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Public'))); // 假设 Public 目录在上一级

// 初始化各种API客户端
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.BASE_URL || "https://xiaoai.plus/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 验证必要的API密钥
if (!OPENAI_API_KEY) {
  console.warn("警告：未配置 OPENAI_API_KEY 环境变量。OpenAI/GPT功能将不可用。");
}
if (!DEEPSEEK_API_KEY) {
    console.warn("警告：未配置 DEEPSEEK_API_KEY 环境变量。DeepSeek功能将不可用。");
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
    endpoints: ['/api/gpt', '/api/deepseek'] // 指向流式端点
  });
});

// --- 流式处理函数 ---
async function handleStreamRequest(req, res, client, modelName) {
    if (!client) {
        res.status(503).json({ error: `${modelName} API 未配置，此功能不可用` });
        return;
    }

    const { prompt } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "请求体中缺少 'prompt' 参数" });
        return;
    }

    // 设置SSE头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // 发送头信息

    try {
        console.log(`使用 ${modelName} 模型进行流式处理: ${client.baseURL}`);
        const stream = await client.chat.completions.create({
            model: modelName === 'GPT' ? "gpt-3.5-turbo" : "deepseek-chat", // 根据需要选择模型
            messages: [{ role: "user", content: prompt }],
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                // 发送SSE数据块
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                res.flush(); // 确保数据立即发送
            }
             // 处理完成信号 (可选，根据 API 可能不同)
            if (chunk.choices[0]?.finish_reason) {
                console.log(`Stream finished with reason: ${chunk.choices[0].finish_reason}`);
                break; // 或者发送一个特定的结束事件
            }
        }
         // 发送流结束信号
        res.write('data: {"event": "done"}\n\n');
        res.end();

    } catch (error) {
        console.error(`调用 ${modelName} API 流式处理时出错:`, error);
         // 尝试在流中发送错误信息，如果头已发送
        try {
            res.write(`data: ${JSON.stringify({ error: `调用 ${modelName} API 时出错`, details: error.message || "未知错误" })}\n\n`);
            res.write('data: {"event": "error"}\n\n');
            res.end();
        } catch (writeError) {
            console.error('无法向客户端发送流错误:', writeError);
            // 如果无法写入，可能连接已关闭，记录日志即可
        }
    }
}


// 处理GPT流式请求
app.post('/api/gpt', (req, res) => {
    handleStreamRequest(req, res, openai, 'GPT');
});

// 处理DeepSeek流式请求
app.post('/api/deepseek', (req, res) => {
    handleStreamRequest(req, res, deepseek, 'DeepSeek');
});


// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器正在运行，端口: ${PORT}`);
  console.log(`可用的API: ${openai ? 'GPT ' : ''}${deepseek ? 'DeepSeek ' : ''}`);
  console.log(`访问前端请打开 Public/index.html 或配置的 URL`);
});