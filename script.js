const BACKEND_URL = 'http://127.0.0.1:5500/index.html';
async function callGemini(prompt) {
    try {
        // 调用后端API，而不是直接调用Gemini API
        // 请求将发送到你的后端部署地址
        const response = await fetch(`${BACKEND_URL}/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }) // 将prompt放在body中发送给后端
        });

        // 检查HTTP响应状态码
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || errorData.message}`);
        }

        const data = await response.json();
        console.log('API响应:', data);

        // 根据你后端转发的Gemini响应结构来提取文本
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            // 这里的错误处理需要根据Gemini API实际返回的错误结构来调整
             const errorDetails = data.error || JSON.stringify(data);
             throw new Error(`Invalid response format from Backend/Gemini API: ${errorDetails}`);
        }
    } catch (error) {
        console.error('Error:', error);
        return `错误：无法获取 Gemini 响应 - ${error.message}`;
    }
}

document.getElementById('submitButton').addEventListener('click', async () => {
    const prompt = document.getElementById('userInput').value;
    if (!prompt) {
        alert('请输入问题！');
        return;
    }
    console.log('用户输入:', prompt);
    const outputDiv = document.getElementById('output'); // 获取输出区域
    outputDiv.innerText = '正在加载...'; // 显示加载状态

    const result = await callGemini(prompt);

    outputDiv.innerText = result; // 显示结果
});