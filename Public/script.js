const BACKEND_URL = 'https://yun1i2201.onrender.com'; // 后端地址
let currentDeepSeekModel = 'deepseek-chat';

// 获取当前选中的模型
function getSelectedModel() {
    return document.getElementById('modelSelect').value;
}

// 调用后端API与不同模型交互
async function callModelAPI(prompt) {
    const selectedModel = getSelectedModel();
    const chatDisplay = document.getElementById('chat-display');
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('loading-message');
    loadingMessage.textContent = '加载中...';
    chatDisplay.appendChild(loadingMessage);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        const url = selectedModel === 'gpt' ? `${BACKEND_URL}/api/gpt` :
                    selectedModel === 'gemini' ? `${BACKEND_URL}/api/gemini` :
                    `${BACKEND_URL}/api/deepseek`;
        const requestBody = selectedModel === 'deepseek' ? { prompt, model: currentDeepSeekModel } : { prompt };

        console.log(`正在向 ${url} 发送请求，模型: ${selectedModel}, 请求体:`, requestBody); // 调试日志

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`错误: ${response.status} - ${errorData.error || errorData.message}`);
        }

        const data = await response.json();
        chatDisplay.removeChild(loadingMessage);
        return data.choices[0].message.content;
    } catch (error) {
        chatDisplay.removeChild(loadingMessage);
        console.error('API 调用失败:', error); // 调试日志
        throw new Error(error.message === 'Failed to fetch' ? '无法连接到后端服务，请检查服务状态或网络连接' : error.message);
    }
}

// 更新历史记录
function updateHistory(userPrompt, aiResponse) {
    const historyDisplay = document.getElementById('history-display');
    const historyItem = document.createElement('div');
    historyItem.classList.add('history-item');

    const historyTextSpan = document.createElement('span');
    historyTextSpan.classList.add('history-text');
    const historyText = userPrompt.length > 30 ? userPrompt.substring(0, 30) + '...' : userPrompt;
    historyTextSpan.textContent = historyText;
    historyTextSpan.title = `用户: ${userPrompt}\nAI: ${aiResponse}`;

    historyItem.dataset.userPrompt = userPrompt;
    historyItem.dataset.aiResponse = aiResponse;
    historyItem.dataset.model = getSelectedModel();

    if (getSelectedModel() === 'deepseek') {
        historyItem.dataset.deepseekModel = currentDeepSeekModel;
    }

    historyTextSpan.addEventListener('click', () => {
        loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse);
        document.getElementById('modelSelect').value = historyItem.dataset.model;
        if (historyItem.dataset.model === 'deepseek') {
            currentDeepSeekModel = historyItem.dataset.deepseekModel;
            updateModelLabel();
            createDeepSeekModelSwitch();
        }
    });

    const deleteIcon = document.createElement('i');
    deleteIcon.classList.add('fas', 'fa-trash', 'delete-history-icon');
    deleteIcon.addEventListener('click', () => {
        historyDisplay.removeChild(historyItem);
    });

    historyItem.appendChild(historyTextSpan);
    historyItem.appendChild(deleteIcon);
    historyDisplay.insertBefore(historyItem, historyDisplay.firstChild);
}

// 加载历史记录到聊天区域
function loadHistoryToChat(userPrompt, aiResponse) {
    const chatDisplay = document.getElementById('chat-display');
    chatDisplay.innerHTML = '';

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('user-message');
    userMessageDiv.textContent = userPrompt;
    chatDisplay.appendChild(userMessageDiv);

    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.classList.add('ai-message');
    aiMessageDiv.textContent = aiResponse;
    chatDisplay.appendChild(aiMessageDiv);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// 更新模型标签
function updateModelLabel() {
    const modelSelect = document.getElementById('modelSelect');
    let modelLabel = modelSelect.options[modelSelect.selectedIndex].text;
    if (modelSelect.value === 'deepseek') {
        modelLabel += ` (${currentDeepSeekModel})`;
    }

    const existingLabel = document.querySelector('.model-type-indicator');
    if (existingLabel) {
        existingLabel.textContent = `当前模型: ${modelLabel}`;
    } else {
        const label = document.createElement('div');
        label.classList.add('model-type-indicator');
        label.textContent = `当前模型: ${modelLabel}`;
        label.style.position = 'fixed';
        label.style.top = '10px';
        label.style.right = '10px';
        label.style.background = '#1a1a1a';
        label.style.padding = '5px 10px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '12px';
        label.style.color = '#e0e0e0';
        document.body.appendChild(label);
    }
}

// 创建DeepSeek模型切换器
function createDeepSeekModelSwitch() {
    const switcherContainer = document.createElement('div');
    switcherContainer.classList.add('deepseek-model-switcher');
    switcherContainer.style.marginBottom = '10px';
    switcherContainer.style.display = getSelectedModel() === 'deepseek' ? 'block' : 'none';

    const chatButton = document.createElement('button');
    chatButton.textContent = 'DeepSeek Chat';
    chatButton.classList.add(currentDeepSeekModel === 'deepseek-chat' ? 'active' : '');
    chatButton.style.padding = '5px 10px';
    chatButton.style.marginRight = '5px';
    chatButton.style.background = currentDeepSeekModel === 'deepseek-chat' ? '#565869' : '#1a1a1a';
    chatButton.style.border = '1px solid #565869';
    chatButton.style.borderRadius = '4px';
    chatButton.style.color = '#fff';
    chatButton.style.cursor = 'pointer';

    const reasonerButton = document.createElement('button');
    reasonerButton.textContent = 'DeepSeek R1';
    reasonerButton.classList.add(currentDeepSeekModel === 'deepseek-reasoner' ? 'active' : '');
    reasonerButton.style.padding = '5px 10px';
    reasonerButton.style.background = currentDeepSeekModel === 'deepseek-reasoner' ? '#565869' : '#1a1a1a';
    reasonerButton.style.border = '1px solid #565869';
    reasonerButton.style.borderRadius = '4px';
    reasonerButton.style.color = '#fff';
    reasonerButton.style.cursor = 'pointer';

    chatButton.addEventListener('click', () => {
        currentDeepSeekModel = 'deepseek-chat';
        chatButton.style.background = '#565869';
        reasonerButton.style.background = '#1a1a1a';
        updateModelLabel();
        console.log("切换到 DeepSeek Chat 模型");
    });

    reasonerButton.addEventListener('click', () => {
        currentDeepSeekModel = 'deepseek-reasoner';
        reasonerButton.style.background = '#565869';
        chatButton.style.background = '#1a1a1a';
        updateModelLabel();
        console.log("切换到 DeepSeek Reasoner (R1) 模型");
    });

    switcherContainer.appendChild(chatButton);
    switcherContainer.appendChild(reasonerButton);

    const modelSelector = document.querySelector('.model-selector');
    const existingSwitcher = document.querySelector('.deepseek-model-switcher');
    if (existingSwitcher) {
        modelSelector.replaceChild(switcherContainer, existingSwitcher);
    } else {
        modelSelector.appendChild(switcherContainer);
    }
}

// 处理提交按钮点击
document.getElementById('submitButton').addEventListener('click', async () => {
    const userInput = document.getElementById('userInput').value.trim();
    if (!userInput) return;

    const chatDisplay = document.getElementById('chat-display');
    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('user-message');
    userMessageDiv.textContent = userInput;
    chatDisplay.appendChild(userMessageDiv);

    document.getElementById('userInput').value = '';

    const selectedModel = getSelectedModel();
    let modelLabel = selectedModel;
    if (selectedModel === 'deepseek') {
        modelLabel += ` (${currentDeepSeekModel})`;
    }

    const modelLabelDiv = document.createElement('div');
    modelLabelDiv.classList.add('model-label');
    modelLabelDiv.textContent = `模型: ${modelLabel}`;
    chatDisplay.appendChild(modelLabelDiv);

    try {
        const result = await callModelAPI(userInput);
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.classList.add('ai-message');
        aiMessageDiv.textContent = result;
        chatDisplay.appendChild(aiMessageDiv);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

        updateHistory(userInput, result);
    } catch (error) {
        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.classList.add('ai-message');
        errorMessageDiv.textContent = `错误: ${error.message}`;
        chatDisplay.appendChild(errorMessageDiv);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }
});

// 新建聊天
document.getElementById('newChatButton').addEventListener('click', () => {
    document.getElementById('userInput').value = '';
    document.getElementById('chat-display').innerHTML = '';
    displayInitialWelcome();
});

// 按下 Enter 发送消息
document.getElementById('userInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('submitButton').click();
    }
});

// 检查可用模型并更新选择器
fetch(`${BACKEND_URL}/`)
    .then(response => response.json())
    .then(data => {
        if (data.availableModels && Array.isArray(data.availableModels)) {
            const modelSelect = document.getElementById('modelSelect');
            modelSelect.innerHTML = '';
            data.availableModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.toLowerCase();
                option.textContent = model;
                modelSelect.appendChild(option);
            });
            updateModelLabel();
            createDeepSeekModelSwitch();
        }
    })
    .catch(error => console.error('获取可用模型失败:', error));

// 模型选择变化时更新
document.getElementById('modelSelect').addEventListener('change', (event) => {
    const switcherContainer = document.querySelector('.deepseek-model-switcher');
    if (switcherContainer) {
        switcherContainer.style.display = event.target.value === 'deepseek' ? 'block' : 'none';
    }
    updateModelLabel();
    createDeepSeekModelSwitch();
});

// 显示初始欢迎消息
function displayInitialWelcome() {
    const chatDisplay = document.getElementById('chat-display');
    const welcomeDiv = document.createElement('div');
    welcomeDiv.classList.add('initial-welcome');
    welcomeDiv.textContent = '欢迎使用AI聊天！请选择模型并开始对话。';
    chatDisplay.appendChild(welcomeDiv);
}

displayInitialWelcome();