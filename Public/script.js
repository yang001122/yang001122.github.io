//代码内容：script.js
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
        // 添加可用模型，过滤掉Gemini (如果需要的话)
        data.availableModels.forEach(model => {
           // 如果你不想在下拉菜单中显示Gemini，可以保留这个判断
          if (model.toLowerCase() !== 'gemini') {
            const option = document.createElement('option');
            option.value = model.toLowerCase();
            option.textContent = model;
            modelSelect.appendChild(option);
          } else {
             // 如果你想显示Gemini但不可选，可以添加一个 disabled 的 option
             // const option = document.createElement('option');
             // option.value = model.toLowerCase();
             // option.textContent = `${model} (暂不支持流式)`; // 或者其他提示
             // option.disabled = true;
             // modelSelect.appendChild(option);
          }
        });
      }
      // 更新模型标签
      updateModelLabel();
    })
    .catch(error => console.error('获取可用模型失败:', error));

   // 监听模型选择器的变化
   document.getElementById('modelSelect').addEventListener('change', updateModelLabel);
}

// 处理用户输入并提交
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

  const userMessageDiv = document.createElement('div');
  userMessageDiv.classList.add('user-message');
  userMessageDiv.textContent = `${prompt}`;
  chatDisplay.appendChild(userMessageDiv);

  // 创建AI消息容器，用于逐步填充内容
  const aiMessageDiv = document.createElement('div');
  aiMessageDiv.classList.add('ai-message');
  chatDisplay.appendChild(aiMessageDiv); // 先添加到DOM中

  // 添加加载指示器
  const loadingIndicator = document.createElement('span');
  loadingIndicator.classList.add('loading-indicator');
  loadingIndicator.textContent = '思考中...';
  aiMessageDiv.appendChild(loadingIndicator); // 将加载指示器添加到消息容器中


  document.getElementById('userInput').value = '';

  const selectedModel = getSelectedModel();
  let modelLabel = selectedModel.toUpperCase();

  const modelLabelDiv = document.createElement('div');
  modelLabelDiv.classList.add('model-label');
  modelLabelDiv.textContent = `使用模型: ${modelLabel}`;
  chatDisplay.appendChild(modelLabelDiv);

  // 调用流式API并处理Markdown渲染
  const fullResponse = await callModelAPI(prompt, aiMessageDiv, loadingIndicator); // 传递aiMessageDiv和loadingIndicator

  chatDisplay.scrollTop = chatDisplay.scrollHeight;

  // 更新左侧历史记录 (使用完整的AI响应)
  if (fullResponse) {
      updateHistory(prompt, fullResponse);
  } else {
      // 如果发生错误没有完整响应，可以考虑记录用户输入或错误信息
      updateHistory(prompt, "响应出错或为空");
  }
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

// 调用后端API与不同模型交互 (处理流式响应并渲染Markdown)
async function callModelAPI(prompt, aiMessageDiv, loadingIndicator) {
  const selectedModel = getSelectedModel();
  let fullResponseContent = ''; // 用于存储完整的AI响应（Markdown格式）
  let accumulatedText = ''; // 用于累积流式接收到的文本

  try {
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 延长超时时间，例如120秒

    // 根据选择的模型确定API端点
    let url = `${BACKEND_URL}/api/${selectedModel}`;
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
      const errorText = await response.text().catch(() => '未知错误');
      throw new Error(`后端错误: ${response.status} - ${errorText}`);
    }

    // 移除加载指示器
    if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: true });

      // 处理接收到的数据块 (SSE 格式)
      const lines = chunk.split('\n');
      for (const line of lines) {
          if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                  done = true;
                  break;
              }
              try {
                  const json = JSON.parse(data);
                  if (json.content) {
                      // 累积接收到的文本
                      accumulatedText += json.content;
                      fullResponseContent += json.content; // 也累加用于历史记录

                      // 解析Markdown并清理HTML
                      // 确保 marked 和 DOMPurify 已经通过 CDN 或其他方式加载
                      const html = marked.parse(accumulatedText);
                      const sanitizedHtml = DOMPurify.sanitize(html);

                      // 更新AI消息容器的innerHTML
                      aiMessageDiv.innerHTML = sanitizedHtml;

                      // 保持滚动到底部
                      aiMessageDiv.parentNode.scrollTop = aiMessageDiv.parentNode.scrollHeight;
                  } else if (json.error) {
                       // 显示后端返回的错误信息
                       aiMessageDiv.textContent = `错误：${json.details || json.error}`;
                       fullResponseContent = aiMessageDiv.textContent; // 将错误信息作为完整响应
                       done = true; // 遇到错误也停止
                       break;
                  }
              } catch (e) {
                  console.error("解析数据块失败:", e, "数据:", data);
                  // 可以选择显示解析错误或忽略
              }
          }
      }
    }

    return fullResponseContent; // 返回完整的AI响应 (Markdown格式)

  } catch (error) {
    console.error('错误:', error);
    // 移除加载指示器（如果还在）
    if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
    // 在AI消息容器中显示错误信息
    aiMessageDiv.textContent = `错误：无法获取模型响应 - ${error.message}`;
    return aiMessageDiv.textContent; // 返回错误信息作为完整响应
  }
}


// 将消息添加到历史记录
// 注意：这里将原始Markdown文本存储在 historyItem 的 dataset 中
function updateHistory(userPrompt, aiResponse) {
  const historyDisplay = document.getElementById('history-display');
  const historyItem = document.createElement('div');
  historyItem.classList.add('history-item');

  // 创建文本span
  const historyTextSpan = document.createElement('span');
  historyTextSpan.classList.add('history-text');
  const historyText = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
  historyTextSpan.textContent = historyText;
  // 提示显示用户输入和AI响应的简略或完整内容
  historyTextSpan.title = `User: ${userPrompt}\nAI: ${aiResponse.substring(0, 100)}...`; // 提示只显示AI响应的前100字

  // 存储完整对话数据以便后续加载
  historyItem.dataset.userPrompt = userPrompt;
  // 在 dataset 中存储原始的 Markdown 文本
  historyItem.dataset.aiResponseMarkdown = aiResponse;
  historyItem.dataset.model = getSelectedModel(); // 记录使用的模型

  // 添加点击监听器到文本部分以加载对话
  historyTextSpan.addEventListener('click', () => {
    // 从 dataset 中读取存储的原始 Markdown 文本进行加载
    loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponseMarkdown);
    // 自动选择之前使用的模型
    document.getElementById('modelSelect').value = historyItem.dataset.model;
    updateModelLabel();
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
// 现在这个函数会接收并渲染 Markdown 文本
function loadHistoryToChat(userPrompt, aiResponseMarkdown) {
  const chatDisplay = document.getElementById('chat-display');
  chatDisplay.innerHTML = '';

  const userMessageDiv = document.createElement('div');
  userMessageDiv.classList.add('user-message');
  userMessageDiv.textContent = `${userPrompt}`;
  chatDisplay.appendChild(userMessageDiv);

  const aiMessageDiv = document.createElement('div');
  aiMessageDiv.classList.add('ai-message');

  // 对存储的AI响应（Markdown）进行渲染和清理
  // 确保 marked 和 DOMPurify 已经通过 CDN 或其他方式加载
  const html = marked.parse(aiResponseMarkdown);
  const sanitizedHtml = DOMPurify.sanitize(html);
  aiMessageDiv.innerHTML = sanitizedHtml;

  chatDisplay.appendChild(aiMessageDiv);

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// 更新显示当前使用的模型标签
function updateModelLabel() {
  const modelSelect = document.getElementById('modelSelect');
  let modelLabel = modelSelect.options[modelSelect.selectedIndex].text;

  // 更新界面上已有的模型标签，如果没有则创建
  let existingLabel = document.querySelector('.model-type-indicator');
  if (!existingLabel) {
      existingLabel = document.createElement('div');
      existingLabel.classList.add('model-type-indicator');
      // 将标签添加到主应用容器中，而不是body，以便更好地管理位置
      document.getElementById('app-container').appendChild(existingLabel);
       existingLabel.style.position = 'absolute'; // 改为absolute，相对于app-container定位
       existingLabel.style.top = '10px';
       existingLabel.style.right = '10px';
       existingLabel.style.background = '#444654';
       existingLabel.style.padding = '5px 10px';
       existingLabel.style.borderRadius = '4px';
       existingLabel.style.fontSize = '12px';
       existingLabel.style.color = '#e0e0e0';
       existingLabel.style.zIndex = '10'; // 确保在其他元素之上
  }
  existingLabel.textContent = `当前模型: ${modelLabel}`;
}


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

// 监听模型选择器的变化 (确保在 initializeApp 后绑定)
// 这里的监听器是多余的，因为已经在 initializeApp 中绑定了，可以删除这个重复的
// document.getElementById('modelSelect').addEventListener('change', updateModelLabel);