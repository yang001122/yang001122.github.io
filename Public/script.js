const BACKEND_URL = 'http://165.232.161.255:3000'; // 后端URL
const CORRECT_PASSWORD = '20191130'; // 正确的密码

// 页面加载时
document.addEventListener('DOMContentLoaded', () => {
  // 检查用户是否已经登录（通过sessionStorage）
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');

  if (isLoggedIn === 'true') {
    // 如果已登录，直接显示主应用
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    initializeApp();
  } else {
    // 处理登录按钮点击事件
    document.getElementById('loginButton').addEventListener('click', handleLogin);

    // 处理密码输入框的Enter键事件
    document.getElementById('passwordInput').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        handleLogin();
      }
    });
  }
});

// 处理登录验证
function handleLogin() {
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');

  if (passwordInput.value === CORRECT_PASSWORD) {
    // 设置登录状态
    sessionStorage.setItem('isLoggedIn', 'true');

    // 隐藏登录页面，显示主应用
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    // 初始化主应用
    initializeApp();
  } else {
    // 显示错误信息
    errorMessage.textContent = '密码错误，请重试';
    passwordInput.value = '';

    // 错误提示淡出效果
    setTimeout(() => {
      errorMessage.textContent = '';
    }, 3000);
  }
}

// 初始化主应用
function initializeApp() {
  // 全局变量来存储当前的DeepSeek模型，更新为正确的模型名称
  window.currentDeepSeekModel = 'deepseek-chat';

  displayInitialWelcome();

  // 绑定提交按钮事件
  document.getElementById('submitButton').addEventListener('click', handleSubmit);

  // 绑定输入框Enter键事件
  document.getElementById('userInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  });

  // 绑定新建对话按钮
  document.getElementById('newChatButton').addEventListener('click', () => {
    document.getElementById('userInput').value = '';
    document.getElementById('chat-display').innerHTML = '';
    displayInitialWelcome();
  });

  // 绑定历史记录搜索
  document.getElementById('searchInput').addEventListener('input', function() {
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

  // 检查可用模型并更新选择器
  fetch(`${BACKEND_URL}/`)
    .then(response => response.json())
    .then(data => {
      if (data.availableModels && Array.isArray(data.availableModels)) {
        const modelSelect = document.getElementById('modelSelect');
        // 清除现有选项
        modelSelect.innerHTML = '';
        // 添加可用模型，过滤掉Gemini
        data.availableModels.forEach(model => {
          if (model.toLowerCase() !== 'gemini') {
            const option = document.createElement('option');
            option.value = model.toLowerCase();
            option.textContent = model;
            modelSelect.appendChild(option);
          }
        });
      }
      // 更新模型标签
      updateModelLabel();
    })
    .catch(error => console.error('获取可用模型失败:', error));

  // 添加光标动画和格式化所需的CSS样式
  const style = document.createElement('style');
  style.textContent = `
    .cursor {
      display: inline-block;
      width: 2px;
      height: 1em; /* 使用 em 单位，高度与当前字体大小相关 */
      background-color: #ffffff;
      animation: blink 1s infinite;
      margin-left: 2px;
      vertical-align: middle;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .typing-indicator {
      color: #8e8ea0;
      font-style: italic;
    }

    .ai-message h2 {
      font-size: 1.5em;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #d1d1e0;
      border-bottom: 1px solid #444;
      padding-bottom: 5px;
    }

    .ai-message h3 {
      font-size: 1.3em;
      margin-top: 16px;
      margin-bottom: 8px;
      color: #bfbfca;
    }

    .ai-message h4 {
      font-size: 1.1em;
      margin-top: 14px;
      margin-bottom: 7px;
      color: #a9a9b3;
    }

    .ai-message ul {
      margin-left: 20px;
      margin-bottom: 15px;
    }

    .ai-message li {
      margin-bottom: 5px;
      line-height: 1.6;
    }

    .ai-message p {
      margin-bottom: 15px;
      line-height: 1.6;
    }

    .ai-message pre {
      background-color: #1e1e1e;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 10px 0;
    }

    .ai-message code {
      font-family: Consolas, Monaco, 'Courier New', monospace;
      font-size: 0.9em; /* 使用相对单位 */
    }
  `;
  document.head.appendChild(style);
}

// 处理用户输入并提交 - 修改为支持流式响应
async function handleSubmit() {
  const prompt = document.getElementById('userInput').value.trim();
  if (!prompt) {
    return;
  }

  const chatDisplay = document.getElementById('chat-display');
  const initialWelcome = chatDisplay.querySelector('.initial-welcome');
  if (initialWelcome) {
    chatDisplay.removeChild(initialWelcome);
  }

  // 添加用户消息
  const userMessageDiv = document.createElement('div');
  userMessageDiv.classList.add('user-message');
  userMessageDiv.textContent = `${prompt}`;
  chatDisplay.appendChild(userMessageDiv);

  // 添加AI消息容器，准备接收流式内容
  const aiMessageDiv = document.createElement('div');
  aiMessageDiv.classList.add('ai-message');
  aiMessageDiv.innerHTML = '<div class="typing-indicator">AI正在思考...</div>';
  chatDisplay.appendChild(aiMessageDiv);

  document.getElementById('userInput').value = '';

  const selectedModel = getSelectedModel();
  let modelLabel = selectedModel.toUpperCase();

  const modelLabelDiv = document.createElement('div');
  modelLabelDiv.classList.add('model-label');
  modelLabelDiv.textContent = `使用模型: ${modelLabel}`;
  chatDisplay.appendChild(modelLabelDiv);

  // 调用API获取流式响应
  const response = await callModelAPI(prompt);

  // 设置初始内容或打字指示器
  const typingIndicator = aiMessageDiv.querySelector('.typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove(); // Remove the typing indicator
  }
  aiMessageDiv.innerHTML = response.initialContent || '<span class="cursor">|</span>';


  // 监听流式更新事件
  const streamListener = (event) => {
    const formattedContent = formatAIResponse(event.detail.fullContent);
    aiMessageDiv.innerHTML = formattedContent + '<span class="cursor">|</span>';
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  };

  document.addEventListener('aiResponseChunk', streamListener);

  try {
    // 等待流完成
    const finalContent = await response.streamComplete;
    // 移除光标和事件监听器
    document.removeEventListener('aiResponseChunk', streamListener);
    aiMessageDiv.innerHTML = formatAIResponse(finalContent);

    // 更新左侧历史记录
    updateHistory(prompt, finalContent);
  } catch (error) {
    console.error('流处理错误:', error);
    aiMessageDiv.textContent = `错误：无法获取完整响应 - ${error.message}`;
    document.removeEventListener('aiResponseChunk', streamListener);
  }

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// 动态获取选择的模型
function getSelectedModel() {
  return document.getElementById('modelSelect').value;
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

// 调用后端API与不同模型交互 - 使用流式响应
async function callModelAPI(prompt) {
  const selectedModel = getSelectedModel();

  try {
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    // 根据选择的模型确定API端点
    let url = `${BACKEND_URL}/api/${selectedModel}/stream`; // 注意这里改为流式端点
    let requestBody = { prompt: prompt };

    // 如果是DeepSeek模型，设置固定为deepseek-chat
    if (selectedModel === 'deepseek') {
      requestBody.model = 'deepseek-chat';
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

    // 创建一个Reader来读取流数据
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    // 返回一个Promise，用于控制流式内容的显示
    return {
      streamComplete: new Promise(async (resolve, reject) => {
        try {
          while (true) {
            const { value, done } = await reader.read();

            if (done) {
              resolve(result);
              break;
            }

            // 解码接收到的数据块
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;

            // 触发更新事件，让外部知道有新内容
            document.dispatchEvent(new CustomEvent('aiResponseChunk', {
              detail: { chunk, fullContent: result }
            }));
          }
        } catch (error) {
          reject(error);
        }
      }),
      initialContent: "" // 初始内容为空字符串
    };
  } catch (error) {
    console.error('错误:', error);
    return {
      streamComplete: Promise.resolve(`错误：无法获取模型响应 - ${error.message}`),
      initialContent: `错误：无法获取模型响应 - ${error.message}`
    };
  }
}


// 将消息添加到历史记录
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
    // Automatically select the previously used model
    document.getElementById('modelSelect').value = historyItem.dataset.model;
    updateModelLabel();
  });

  // 创建删除图标容器
  const deleteIconContainer = document.createElement('span');
  deleteIconContainer.classList.add('delete-history-icon');
  deleteIconContainer.innerHTML = '<i class="fas fa-times"></i>'; // Close icon

  // Add click listener to the delete icon
  deleteIconContainer.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent the click from bubbling to the history item
    historyItem.remove(); // Remove the history item from the DOM
  });

  // Append the text and icon to the history item
  historyItem.appendChild(historyTextSpan);
  historyItem.appendChild(deleteIconContainer);

  // Append the new history item to the display area
  historyDisplay.appendChild(historyItem);

  // Scroll history display to the bottom
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
  aiMessageDiv.innerHTML = formatAIResponse(aiResponse); // Format the loaded AI response
  chatDisplay.appendChild(aiMessageDiv);

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// 更新显示当前使用的模型标签
function updateModelLabel() {
  const modelSelect = document.getElementById('modelSelect');
  let modelLabel = modelSelect.options[modelSelect.selectedIndex].text;

  // Update the existing model label on the interface, create if none exists
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

// 格式化AI响应，使其更有条理
function formatAIResponse(text) {
  if (!text) return "";

  // 替换markdown样式的标题
  text = text.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');

  // 处理无序列表
  text = text.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
  text = text.replace(/^-\s+(.+)$/gm, '<li>$1</li>');

  // 处理代码块
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // 处理段落
  const paragraphs = text.split('\n\n');
  let formattedText = '';

  paragraphs.forEach(para => {
    if (para.trim()) {
      // 跳过已经转换为HTML的内容
      if (!para.startsWith('<')) {
        // 检查是否包含列表项
        if (para.includes('<li>')) {
          formattedText += `<ul>${para}</ul>`;
        } else {
          formattedText += `<p>${para}</p>`;
        }
      } else {
        formattedText += para;
      }
    }
  });

  return formattedText || text;
}