const BACKEND_URL = 'https://yunli2201.onrender.com'; // 后端URL

// 动态获取选择的模型
function getSelectedModel() {
    return document.getElementById('modelSelect').value;
}

// 调用后端API与Gemini或GPT交互
async function callModelAPI(prompt) {
    const selectedModel = getSelectedModel();

    try {
        let url = `${BACKEND_URL}/api/gemini`;
        if (selectedModel === 'gpt') {
            url = `${BACKEND_URL}/api/gpt`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Backend error: ${response.status} - ${errorData.error || errorData.message}`);
        }

        const data = await response.json();
        // 适配后端返回的 OpenAI 格式
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content;
        } else {
            throw new Error(`Invalid response format from Backend/API: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        return `错误：无法获取模型响应 - ${error.message}`;
    }
}

// 显示初始欢迎消息
function displayInitialWelcome() {
    const chatDisplay = document.getElementById('chat-display');
    chatDisplay.innerHTML = '';

    const welcomeMessage = document.createElement('div');
    welcomeMessage.classList.add('ai-message', 'initial-welcome');
    welcomeMessage.textContent = "有什么可以帮忙的?";
    chatDisplay.appendChild(welcomeMessage);
}

// 将消息添加到历史记录 (包含删除功能，使用 × 图标)
function updateHistory(userPrompt, aiResponse) {
    const historyDisplay = document.getElementById('history-display');
    const historyItem = document.createElement('div');
    historyItem.classList.add('history-item');

    // Create text span
    const historyTextSpan = document.createElement('span');
    historyTextSpan.classList.add('history-text');
    const historyText = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
    historyTextSpan.textContent = historyText;
    historyTextSpan.title = `User: ${userPrompt}\nAI: ${aiResponse}`; // Tooltip for full text

    // Store full conversation data for loading later
    historyItem.dataset.userPrompt = userPrompt;
    historyItem.dataset.aiResponse = aiResponse;

    // Add click listener to the text part to load the conversation
    historyTextSpan.addEventListener('click', () => loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse));

    // Create delete icon container
    const deleteIconContainer = document.createElement('span');
    deleteIconContainer.classList.add('delete-history-icon');
    deleteIconContainer.innerHTML = '<i class="fas fa-times"></i>'; // Times icon

    // Add click listener to the delete icon
    deleteIconContainer.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the click from bubbling up to the history item
        historyItem.remove(); // Remove the history item from the DOM
    });

    // Append text and icon to the history item
    historyItem.appendChild(historyTextSpan);
    historyItem.appendChild(deleteIconContainer);

    // Add the new history item to the display
    historyDisplay.appendChild(historyItem);

    // Scroll history to bottom
    historyDisplay.scrollTop = historyDisplay.scrollHeight;
}

// 加载历史对话到聊天区域
function loadHistoryToChat(userPrompt, aiResponse) {
    const chatDisplay = document.getElementById('chat-display');
    chatDisplay.innerHTML = '';

    const initialWelcome = chatDisplay.querySelector('.initial-welcome');
    if (initialWelcome) {
        chatDisplay.removeChild(initialWelcome);
    }

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('user-message');
    userMessageDiv.textContent = `${userPrompt}`;
    chatDisplay.appendChild(userMessageDiv);

    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.classList.add('ai-message');
    aiMessageDiv.textContent = `${aiResponse}`;
    chatDisplay.appendChild(aiMessageDiv);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// 页面加载时
document.addEventListener('DOMContentLoaded', () => {
    displayInitialWelcome();
});

// 处理用户输入并显示结果
document.getElementById('submitButton').addEventListener('click', async () => {
    const prompt = document.getElementById('userInput').value.trim();
    if (!prompt) {
        return;
    }

    const chatDisplay = document.getElementById('chat-display');
    const initialWelcome = chatDisplay.querySelector('.initial-welcome');
    if (initialWelcome) {
        chatDisplay.removeChild(initialWelcome);
    }

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('user-message');
    userMessageDiv.textContent = `${prompt}`;
    chatDisplay.appendChild(userMessageDiv);

    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('ai-message', 'loading-indicator');
    loadingMessage.textContent = '思考中...';
    chatDisplay.appendChild(loadingMessage);

    document.getElementById('userInput').value = '';

    const result = await callModelAPI(prompt);

    chatDisplay.removeChild(loadingMessage);

    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.classList.add('ai-message');
    aiMessageDiv.textContent = `${result}`;
    chatDisplay.appendChild(aiMessageDiv);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    // Update left-side history
    updateHistory(prompt, result);
});

// 搜索历史记录
document.getElementById('searchInput').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const historyItems = document.querySelectorAll('#history-display .history-item');

    historyItems.forEach(item => {
        const itemText = item.querySelector('.history-text').textContent.toLowerCase();
        if (itemText.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// Handle file input
document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        alert(`文件选中: ${file.name}. 文件上传功能需要后端支持。`);
    }
});

// 新建对话按钮功能
document.getElementById('newChatButton').addEventListener('click', () => {
    document.getElementById('userInput').value = '';
    document.getElementById('chat-display').innerHTML = '';
    displayInitialWelcome();
});

// 按下 Enter 键发送消息
document.getElementById('userInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('submitButton').click();
    }
});