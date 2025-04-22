const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// 中间件
app.use(cors({
    origin: ["https://yang001122.github.io", "http://localhost:3000"],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Public')));

// 初始化各 API 客户端
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.BASE_URL || "https://xiaoai.plus/v1";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 验证必要的 API 密钥
if (!OPENAI_API_KEY || !DEEPSEEK_API_KEY || !GEMINI_API_KEY) {
    throw new Error('Missing required API keys');
}

// 初始化 OpenAI 客户端
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: BASE_URL,
});

// 初始化 Google Gemini 客户端
let geminiAI = null;
try {
    geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} catch (error) {
    throw new Error('Failed to initialize Gemini AI');
}

// 初始化 DeepSeek 客户端
const deepseek = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
});

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
        deepseekModels: ['deepseek-chat', 'deepseek-reasoner']
    });
});

// 处理 GPT 请求
app.post('/api/gpt', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "缺少 'prompt' 参数" });
        }
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            timeout: 10000 // 添加超时
        });
        if (completion.choices && completion.choices.length > 0) {
            const reply = completion.choices[0].message.content;
            res.json({ choices: [{ message: { content: reply } }] });
        } else {
            res.status(500).json({ error: "调用 OpenAI API 成功但未收到有效回应" });
        }
    } catch (error) {
        res.status(500).json({
            error: "调用 OpenAI API 时出错",
            details: error.message || "未知错误"
        });
    }
});

// 处理 Gemini 请求
app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "缺少 'prompt' 参数" });
        }
        const model = geminiAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        res.json({ choices: [{ message: { content: text } }] });
    } catch (error) {
        res.status(500).json({
            error: "调用 Gemini API 时出错",
            details: error.message || "未知错误"
        });
    }
});

// 处理 DeepSeek 请求
app.post('/api/deepseek', async (req, res) => {
    try {
        const { prompt, model } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "缺少 'prompt' 参数" });
        }
        const modelName = model === "deepseek-reasoner" ? 'deepseek-reasoner' : 'deepseek-chat'; // deepseek-chat 对应 V3
        const completion = await deepseek.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            timeout: 10000 // 添加超时
        });
        if (completion.choices && completion.choices.length > 0) {
            const reply = completion.choices[0].message.content;
            res.json({ choices: [{ message: { content: reply } }] });
        } else {
            res.status(500).json({ error: "调用 DeepSeek API 成功但未收到有效回应" });
        }
    } catch (error) {
        res.status(500).json({
            error: "调用 DeepSeek API 时出错",
            details: error.message || "未知错误"
        });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});