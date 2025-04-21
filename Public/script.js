const BACKEND_URL = 'https://yunli2201.onrender.com'; // 后端URL

// 动态获取选择的模型
function getSelectedModel() {
  return document.getElementById('modelSelect').value;
}

// 调用后端API与不同模型交互
async function callModelAPI(prompt) {
  const selectedModel = getSelectedModel();
  try {
    // 根据选择的模型确定API端点
    let url = `${BACKEND_URL}/api/${selectedModel}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`后端错误: ${response.status} - ${errorData.error || errorData.message}`);
    }
    
    const data = await response.json();
    
    // 适配不同后端返回的格式
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error(`无效的响应格式: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('错误:', error);
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
  
  // 创建文本span
  const historyTextSpan = document.createElement('span');
  historyTextSpan.classList.add('history-text');
  const historyText = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
  historyTextSpan.textContent = historyText;
  historyTextSpan.title = `User: ${userPrompt}\nAI: ${aiResponse}`; // 完整文本的提示
  
  // 存储完整对话数据以便后续加载
  historyItem.dataset.userPrompt = userPrompt;
  historyItem.dataset.aiResponse = aiResponse;
  historyItem.dataset.model = getSelectedModel(); // 记录使用的模型
  
  // 添加点击监听器到文本部分以加载对话
  historyTextSpan.addEventListener('click', () => {
    loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse);
    // 自动选择之前使用的模型
    document.getElementById('modelSelect').value = historyItem.dataset.model;
  });
  
  // 创建删除图标容器
  const deleteIconContainer = document.createElement('span');
  deleteIconContainer.classList.add('delete-history-icon');
  deleteIconContainer.innerHTML = '<i class="fas fa-times"></i>'; // 关闭图标
  
  // 添加点击监听器到删除图标
  deleteIconContainer.addEventListener('click', (event) => {
    event.stopPropagation(); // 防止点击冒泡到历史项
    historyItem.remove(); // 从DOM中移除历史项
  });
  
  // 将文本和图标添加到历史项
  historyItem.appendChild(historyTextSpan);
  historyItem.appendChild(deleteIconContainer);
  
  // 将新的历史项添加到显示区域
  historyDisplay.appendChild(historyItem);
  
  // 滚动历史记录到底部
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
  
  // 检查可用模型并更新选择器
  fetch(`${BACKEND_URL}/`)
    .then(response => response.json())
    .then(data => {
      if (data.availableModels && Array.isArray(data.availableModels)) {
        const modelSelect = document.getElementById('modelSelect');
        // 清除现有选项
        modelSelect.innerHTML = '';
        
        // 添加可用模型
        data.availableModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model.toLowerCase();
          option.textContent = model;
          modelSelect.appendChild(option);
        });
      }
    })
    .catch(error => console.error('获取可用模型失败:', error));
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
  
  const selectedModel = getSelectedModel();
  const modelLabel = document.createElement('div');
  modelLabel.classList.add('model-label');
  modelLabel.textContent = `使用模型: ${selectedModel.toUpperCase()}`;
  chatDisplay.appendChild(modelLabel);
  
  const result = await callModelAPI(prompt);
  
  chatDisplay.removeChild(loadingMessage);
  
  const aiMessageDiv = document.createElement('div');
  aiMessageDiv.classList.add('ai-message');
  aiMessageDiv.textContent = `${result}`;
  chatDisplay.appendChild(aiMessageDiv);
  
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
  
  // 更新左侧历史记录
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

// 处理文件输入
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