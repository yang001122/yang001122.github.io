const BACKEND_URL = 'https://yunli2201.onrender.com'; // 后端URL

// 全局变量来存储当前的DeepSeek模型，更新为正确的模型名称
let currentDeepSeekModel = 'deepseek-chat';

// 动态获取选择的模型
function getSelectedModel() {
  return document.getElementById('modelSelect').value;
}

// 调用后端API与不同模型交互
async function callModelAPI(prompt) {
  const selectedModel = getSelectedModel();
  
  try {
    
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
    
    // 根据选择的模型确定API端点
    let url = `${BACKEND_URL}/api/${selectedModel}`;
    let requestBody = { prompt: prompt };
    
    // 如果是DeepSeek模型，则添加模型类型
    if (selectedModel === 'deepseek') {
      requestBody.model = currentDeepSeekModel;
      console.log(`使用DeepSeek模型: ${currentDeepSeekModel}`);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    // 清除超时
    clearTimeout(timeoutId);
    
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
  } finally {
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
  
  // 如果是DeepSeek模型，则记录具体的子模型
  if (getSelectedModel() === 'deepseek') {
    historyItem.dataset.deepseekModel = currentDeepSeekModel;
  }
  
  // 添加点击监听器到文本部分以加载对话
  historyTextSpan.addEventListener('click', () => {
    loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse);
    // 自动选择之前使用的模型
    document.getElementById('modelSelect').value = historyItem.dataset.model;
    
    // 如果是DeepSeek模型，则设置之前使用的子模型
    if (historyItem.dataset.model === 'deepseek' && historyItem.dataset.deepseekModel) {
      currentDeepSeekModel = historyItem.dataset.deepseekModel;
      updateModelLabel();
    }
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

// 更新显示当前使用的模型标签
function updateModelLabel() {
  const modelSelect = document.getElementById('modelSelect');
  let modelLabel = modelSelect.options[modelSelect.selectedIndex].text;
  
  // 如果是DeepSeek模型，添加子模型信息
  if (modelSelect.value === 'deepseek') {
    modelLabel += ` (${currentDeepSeekModel})`;
  }
  
  // 更新界面上已有的模型标签，如果没有则创建
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
    label.style.background = '#444654';
    label.style.padding = '5px 10px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '12px';
    label.style.color = '#e0e0e0';
    document.body.appendChild(label);
  }
}

// 创建DeepSeek模型切换器
function createDeepSeekModelSwitcher() {
  // 创建切换按钮
  const switcherContainer = document.createElement('div');
  switcherContainer.classList.add('deepseek-model-switcher');
  switcherContainer.style.marginTop = '10px';
  switcherContainer.style.display = getSelectedModel() === 'deepseek' ? 'block' : 'none';
  
  const chatButton = document.createElement('button');
  chatButton.textContent = 'DeepSeek Chat';
  chatButton.classList.add(currentDeepSeekModel === 'deepseek-chat' ? 'active' : '');
  chatButton.style.padding = '5px 10px';
  chatButton.style.marginRight = '5px';
  chatButton.style.background = currentDeepSeekModel === 'deepseek-chat' ? '#565869' : '#343541';
  chatButton.style.border = '1px solid #565869';
  chatButton.style.borderRadius = '4px';
  chatButton.style.color = '#fff';
  chatButton.style.cursor = 'pointer';
  
  const reasonerButton = document.createElement('button');
  reasonerButton.textContent = 'DeepSeek R1';
  reasonerButton.classList.add(currentDeepSeekModel === 'deepseek-reasoner' ? 'active' : '');
  reasonerButton.style.padding = '5px 10px';
  reasonerButton.style.background = currentDeepSeekModel === 'deepseek-reasoner' ? '#565869' : '#343541';
  reasonerButton.style.border = '1px solid #565869';
  reasonerButton.style.borderRadius = '4px';
  reasonerButton.style.color = '#fff';
  reasonerButton.style.cursor = 'pointer';
  
  chatButton.addEventListener('click', () => {
    currentDeepSeekModel = 'deepseek-chat';
    chatButton.style.background = '#565869';
    reasonerButton.style.background = '#343541';
    updateModelLabel();
    console.log("已选择 DeepSeek Chat 模型");
  });
  
  reasonerButton.addEventListener('click', () => {
    currentDeepSeekModel = 'deepseek-reasoner';
    reasonerButton.style.background = '#565869';
    chatButton.style.background = '#343541';
    updateModelLabel();
    console.log("已选择 DeepSeek Reasoner (R1) 模型");
  });
  
  switcherContainer.appendChild(chatButton);
  switcherContainer.appendChild(reasonerButton);
  
  // 将切换器添加到模型选择器下方
  const modelSelector = document.querySelector('.model-selector');
  const existingSwitcher = document.querySelector('.deepseek-model-switcher');
  if (existingSwitcher) {
    modelSelector.replaceChild(switcherContainer, existingSwitcher);
  } else {
    modelSelector.appendChild(switcherContainer);
  }
}

// 页面加载时
document.addEventListener('DOMContentLoaded', () => {
  displayInitialWelcome();
  
  // 创建DeepSeek模型切换器
  createDeepSeekModelSwitcher();
  
  // 监听模型选择变化
  document.getElementById('modelSelect').addEventListener('change', (event) => {
    const switcherContainer = document.querySelector('.deepseek-model-switcher');
    if (switcherContainer) {
      switcherContainer.style.display = event.target.value === 'deepseek' ? 'block' : 'none';
    }
    updateModelLabel();
  });

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
      // 更新模型标签
      updateModelLabel();
      // 重新创建DeepSeek模型切换器
      createDeepSeekModelSwitcher();
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
  let modelLabel = selectedModel.toUpperCase();
  
  // 如果是DeepSeek，添加子模型信息
  if (selectedModel === 'deepseek') {
    modelLabel += ` (${currentDeepSeekModel})`;
  }
  
  const modelLabelDiv = document.createElement('div');
  modelLabelDiv.classList.add('model-label');
  modelLabelDiv.textContent = `使用模型: ${modelLabel}`;
  chatDisplay.appendChild(modelLabelDiv);
  
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