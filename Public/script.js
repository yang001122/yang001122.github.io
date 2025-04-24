// 代码内容：script.js (修改后支持流式输出和Markdown渲染)
const BACKEND_URL = 'http://165.232.161.255:3000'; // 后端URL
const CORRECT_PASSWORD = '20191130'; // 正确的密码

let currentEventSource = null; // 用于管理EventSource连接

// 页面加载时
document.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  if (isLoggedIn === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    initializeApp();
  } else {
    document.getElementById('loginButton').addEventListener('click', handleLogin);
    document.getElementById('passwordInput').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        handleLogin();
      }
    });
  }
});

// 处理登录
function handleLogin() {
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');
  if (passwordInput.value === CORRECT_PASSWORD) {
    sessionStorage.setItem('isLoggedIn', 'true');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    initializeApp();
  } else {
    errorMessage.textContent = '密码错误，请重试';
    passwordInput.value = '';
    setTimeout(() => { errorMessage.textContent = ''; }, 3000);
  }
}

// 初始化应用
function initializeApp() {
  displayInitialWelcome();
  setupEventListeners();
  fetchAvailableModels();
  updateModelLabel(); // Initial label update
}

// 设置事件监听器
function setupEventListeners() {
  document.getElementById('submitButton').addEventListener('click', handleSubmit);
  document.getElementById('userInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  });
  document.getElementById('newChatButton').addEventListener('click', startNewChat);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
  document.getElementById('modelSelect').addEventListener('change', updateModelLabel); // Update label on model change
}

// 获取可用模型
function fetchAvailableModels() {
  fetch(`${BACKEND_URL}/`)
    .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok.'))
    .then(data => {
      if (data.availableModels && Array.isArray(data.availableModels)) {
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = ''; // 清除现有选项
        data.availableModels.forEach(model => {
          if (model && model.toLowerCase() !== 'gemini') { // 过滤掉 null 和 gemini
            const option = document.createElement('option');
            option.value = model.toLowerCase();
            option.textContent = model;
            modelSelect.appendChild(option);
          }
        });
        updateModelLabel(); // Update label after fetching
      } else {
         console.warn("No available models found or invalid format:", data);
      }
    })
    .catch(error => console.error('获取可用模型失败:', error));
}

// 开始新对话
function startNewChat() {
   if (currentEventSource) {
        currentEventSource.close(); // 关闭之前的流
        currentEventSource = null;
        console.log("Previous EventSource closed.");
    }
  document.getElementById('userInput').value = '';
  document.getElementById('chat-display').innerHTML = '';
  displayInitialWelcome();
}

// 处理历史记录搜索
function handleSearch() {
  const searchTerm = this.value.toLowerCase();
  const historyItems = document.querySelectorAll('#history-display .history-item');
  historyItems.forEach(item => {
    const itemText = item.querySelector('.history-text').textContent.toLowerCase();
    item.style.display = itemText.includes(searchTerm) ? 'flex' : 'none';
  });
}

// 处理文件选择 (仅提示)
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    alert(`文件选中: ${file.name}. 文件处理功能需要进一步开发。`);
    // 这里可以添加文件上传和处理逻辑
     event.target.value = null; // 重置文件输入，以便可以再次选择相同文件
  }
}


// 处理用户提交
function handleSubmit() {
  const prompt = document.getElementById('userInput').value.trim();
  if (!prompt) return;

  const chatDisplay = document.getElementById('chat-display');
  const initialWelcome = chatDisplay.querySelector('.initial-welcome');
  if (initialWelcome) {
    chatDisplay.removeChild(initialWelcome);
  }

   // 关闭任何正在进行的流
    if (currentEventSource) {
        currentEventSource.close();
        console.log("Closing existing EventSource before starting new request.");
    }

  // 显示用户消息
  appendMessage(prompt, 'user-message');
  document.getElementById('userInput').value = ''; // 清空输入框

  // 准备 AI 消息容器和加载指示器
  const aiMessageDiv = appendMessage('', 'ai-message'); // 创建空的 AI 消息容器
  const loadingIndicator = document.createElement('span');
  loadingIndicator.classList.add('loading-indicator');
  loadingIndicator.textContent = '思考中...';
  aiMessageDiv.appendChild(loadingIndicator); // 将加载指示器添加到 AI 消息容器
  chatDisplay.scrollTop = chatDisplay.scrollHeight; // 滚动到底部


  // 开始流式请求
  streamModelResponse(prompt, aiMessageDiv, loadingIndicator);

  // 注意：历史记录现在在流结束后添加
}


// 流式请求模型响应
function streamModelResponse(prompt, aiMessageDiv, loadingIndicator) {
    const selectedModel = getSelectedModel();
    const url = `${BACKEND_URL}/api/${selectedModel}`;
    let fullResponse = ''; // 存储完整响应以供历史记录使用

    // 确保显示模型标签
    const modelLabelDiv = document.createElement('div');
    modelLabelDiv.classList.add('model-label');
    modelLabelDiv.textContent = `使用模型: ${selectedModel.toUpperCase()}`;
    aiMessageDiv.parentNode.insertBefore(modelLabelDiv, aiMessageDiv); // 插入到AI消息之前


    currentEventSource = new EventSource(url, {
        method: 'POST', // EventSource 不直接支持POST, 需要通过后端调整或使用fetch API + ReadableStream
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }) // body 在标准 EventSource 中无效, 这是为什么通常需要fetch
    });

     // ---- 使用 fetch API 实现 SSE POST 请求 ----
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream' // 明确期望 SSE
        },
        body: JSON.stringify({ prompt })
    })
    .then(response => {
        if (!response.ok) {
             // 尝试解析错误体
            return response.json().then(err => Promise.reject(err)).catch(() => Promise.reject({ error: `HTTP error! status: ${response.status}`}));
        }
        if (!response.body) {
             throw new Error("Response body is null");
        }
        // 移除加载指示器，开始接收内容
        if (loadingIndicator && loadingIndicator.parentNode === aiMessageDiv) {
            aiMessageDiv.removeChild(loadingIndicator);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function push() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('Stream complete.');
                     // 更新历史记录
                    updateHistory(prompt, fullResponse);
                    // 滚动到底部
                    aiMessageDiv.parentNode.scrollTop = aiMessageDiv.parentNode.scrollHeight;
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                // SSE 数据通常以 "data: " 开头，并以 "\n\n" 结尾
                const lines = chunk.split('\n\n');
                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                         try {
                            const jsonString = line.substring(6); // 移除 "data: "
                            if(jsonString.trim()){ // 确保不是空字符串
                                const data = JSON.parse(jsonString);

                                // 检查特殊事件
                                if (data.event === 'done') {
                                    console.log('Received done event from stream.');
                                    // 可以在这里做最终处理，但通常 reader.read() 的 done 标志更可靠
                                    return; // 结束处理这个数据块
                                }
                                if (data.event === 'error' || data.error) {
                                    console.error("Stream error received:", data);
                                    aiMessageDiv.innerHTML = marked.parse(`错误: ${data.error || '未知流错误'}`); // 显示错误信息
                                    return; // 结束处理
                                }

                                // 处理内容块
                                if (data.content) {
                                    fullResponse += data.content;
                                    // 使用 marked.js 渲染 Markdown
                                    aiMessageDiv.innerHTML = marked.parse(fullResponse);
                                     // 实时滚动
                                    aiMessageDiv.parentNode.scrollTop = aiMessageDiv.parentNode.scrollHeight;
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing SSE data chunk:", e, "Line:", line);
                        }
                    }
                });
                push(); // 继续读取下一块
            }).catch(error => {
                 console.error('Error reading stream:', error);
                 aiMessageDiv.innerHTML = marked.parse(`错误：读取响应流失败 - ${error.message}`);
                  // 更新历史记录（即使是错误）
                 updateHistory(prompt, `错误：读取响应流失败 - ${error.message}`);
            });
        }
        push(); // 开始读取流

    })
    .catch(error => {
        console.error('Fetch/SSE error:', error);
         if (loadingIndicator && loadingIndicator.parentNode === aiMessageDiv) {
             aiMessageDiv.removeChild(loadingIndicator);
         }
        const errorMessage = `错误：无法连接到模型 - ${error.error || error.message || '未知错误'}`;
        aiMessageDiv.innerHTML = marked.parse(errorMessage); // 在AI消息框显示错误
         // 更新历史记录（记录错误）
        updateHistory(prompt, errorMessage);
        // 滚动到底部
        aiMessageDiv.parentNode.scrollTop = aiMessageDiv.parentNode.scrollHeight;
    });
}


// 动态获取选择的模型
function getSelectedModel() {
  const modelSelect = document.getElementById('modelSelect');
  return modelSelect.value;
}

// 显示初始欢迎消息
function displayInitialWelcome() {
  const chatDisplay = document.getElementById('chat-display');
  chatDisplay.innerHTML = ''; // 清空
  appendMessage("有什么可以帮忙的?", 'ai-message initial-welcome');
}

// 辅助函数：添加消息到聊天窗口
function appendMessage(text, className, useMarkdown = false) {
  const chatDisplay = document.getElementById('chat-display');
  const messageDiv = document.createElement('div');
  messageDiv.classList.add(...className.split(' ')); // 支持多个 class
  if (useMarkdown) {
      messageDiv.innerHTML = marked.parse(text); // 使用 marked.js 渲染
  } else {
      messageDiv.textContent = text; // 处理纯文本
  }

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight; // 滚动到底部
  return messageDiv; // 返回创建的元素，方便后续操作（如添加加载指示器）
}


// 更新历史记录 (现在在流结束后调用)
function updateHistory(userPrompt, aiResponse) {
  const historyDisplay = document.getElementById('history-display');
  const historyItem = document.createElement('div');
  historyItem.classList.add('history-item');

  const historyTextSpan = document.createElement('span');
  historyTextSpan.classList.add('history-text');
  historyTextSpan.textContent = userPrompt.substring(0, 30) + (userPrompt.length > 30 ? '...' : ''); // 缩短预览
  historyTextSpan.title = `User: ${userPrompt}\nAI: ${aiResponse.substring(0, 100)}...`; // 提示显示更多内容

  // 存储完整对话数据
  historyItem.dataset.userPrompt = userPrompt;
  historyItem.dataset.aiResponse = aiResponse; // 存储完整的AI响应
  historyItem.dataset.model = getSelectedModel();

  historyTextSpan.addEventListener('click', () => {
    loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse);
    document.getElementById('modelSelect').value = historyItem.dataset.model;
    updateModelLabel();
  });

  const deleteIconContainer = document.createElement('span');
  deleteIconContainer.classList.add('delete-history-icon');
  deleteIconContainer.innerHTML = '<i class="fas fa-times"></i>';
  deleteIconContainer.addEventListener('click', (event) => {
    event.stopPropagation();
    historyItem.remove();
  });

  historyItem.appendChild(historyTextSpan);
  historyItem.appendChild(deleteIconContainer);

   // 添加到顶部（最新的在上面）
  historyDisplay.insertBefore(historyItem, historyDisplay.firstChild);

  // 可选：限制历史记录数量
  const maxHistoryItems = 50;
  while (historyDisplay.children.length > maxHistoryItems) {
      historyDisplay.removeChild(historyDisplay.lastChild);
  }
}

// 加载历史对话到聊天区域
function loadHistoryToChat(userPrompt, aiResponse) {
   if (currentEventSource) {
        currentEventSource.close(); // 关闭可能正在进行的流
        currentEventSource = null;
    }
  const chatDisplay = document.getElementById('chat-display');
  chatDisplay.innerHTML = ''; // 清空当前聊天
  appendMessage(userPrompt, 'user-message');
  appendMessage(aiResponse, 'ai-message', true); // 渲染历史 AI 消息为 Markdown
}

// 更新显示当前使用的模型标签 (改进为在聊天区域顶部显示)
function updateModelLabel() {
  const modelSelect = document.getElementById('modelSelect');
  if (!modelSelect.options || modelSelect.selectedIndex < 0) return; // 防止在选项加载前出错
  let modelLabel = modelSelect.options[modelSelect.selectedIndex].text;

  let indicator = document.getElementById('model-type-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'model-type-indicator';
    indicator.style.textAlign = 'center';
    indicator.style.padding = '5px';
    indicator.style.fontSize = '12px';
    indicator.style.color = '#8e8ea0';
    indicator.style.borderBottom = '1px solid #4d4d4f'; // 加个分隔线
     // 插入到聊天区域顶部
     const chatArea = document.querySelector('.chat-area');
     if (chatArea) {
         chatArea.insertBefore(indicator, chatArea.firstChild);
     } else {
         document.body.appendChild(indicator); // Fallback
     }

  }
   indicator.textContent = `当前模型: ${modelLabel}`;
}