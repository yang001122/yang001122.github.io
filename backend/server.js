const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const app = express();
// 中间件
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体

// Gemini API端点
app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // 请确保你有一个API密钥
        const API_KEY = process.env.GEMINI_API_KEY;
        
        if (!API_KEY) {
            return res.status(500).json({ error: "未配置Gemini API密钥" });
        }

        // 调用Google Gemini API
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error calling Gemini API:', error.response?.data || error.message);
        res.status(500).json({ 
            error: "调用Gemini API时出错", 
            details: error.response?.data || error.message 
        });
    }
});
// 启动服务器
// 修改 PORT，优先使用 Render 提供的环境变量，如果没有，则使用 3000 作为备选
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`服务器正在运行，端口: ${PORT}`);
    // 这行本地访问提示可以保留，但在服务器上意义不大
    // console.log(`在浏览器中访问: http://localhost:${PORT}`);
});