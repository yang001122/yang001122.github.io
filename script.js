const BACKEND_URL = 'https://yunli2201.onrender.com';  // 后端URL

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
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content;
        } else {
            throw new Error(`Invalid response format from Backend/API.`);
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
     // **将省略号图标改为叉号图标**
     deleteIconContainer.innerHTML = '<i class="fas fa-times"></i>'; // Times icon


     // Add click listener to the delete icon
     deleteIconContainer.addEventListener('click', (event) => {
         event.stopPropagation(); // Prevent the click from bubbling up to the history item (which loads the chat)
         // Optional: Add confirmation dialog
         // if (confirm('确定要删除此对话历史吗？')) {
             historyItem.remove(); // Remove the history item from the DOM
             // Optional: Implement logic to remove from localStorage or backend storage
             // removeConversationFromStorage(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse);
         // }
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

    // If you have saved history (e.g., in localStorage), load it here
    // loadSavedHistory();
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

    // Optional: Save conversation to localStorage here
    // saveConversation(prompt, result);
});


// 清除历史记录 (按钮在侧边栏内部，并且可能隐藏，通过JS触发)
const clearHistoryButton = document.getElementById('clearHistoryButton');
if(clearHistoryButton) {
    clearHistoryButton.addEventListener('click', () => {
        if (confirm('确定要清除所有历史记录吗？')) {
            document.getElementById('history-display').innerHTML = '';
            document.getElementById('chat-display').innerHTML = '';
            displayInitialWelcome();
            // If history was saved (e.g., localStorage), clear it there too
            // clearSavedHistory();
        }
    });
}


// 搜索历史记录 (输入框在侧边栏内部)
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
        // Implement file upload to backend here
    }
});

// 新建对话按钮功能 (现在在侧边栏内部)
document.getElementById('newChatButton').addEventListener('click', () => {
    document.getElementById('userInput').value = '';
    document.getElementById('chat-display').innerHTML = '';
    displayInitialWelcome();
     // Optional: Save current conversation to history if needed before clearing
});


// **按下 Enter 键发送消息**
document.getElementById('userInput').addEventListener('keydown', function(event) {
    // Check if the key pressed was 'Enter' and the Shift key was NOT pressed
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent the default action (newline in textarea)
        document.getElementById('submitButton').click(); // Programmatically click the send button
    }
});


// Optional: Functions for saving/loading history to localStorage
/*
function saveConversation(userPrompt, aiResponse) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ prompt: userPrompt, response: aiResponse, timestamp: new Date() });
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function loadSavedHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const historyDisplay = document.getElementById('history-display');
    historyDisplay.innerHTML = ''; // Clear current history display

    // Example: Basic grouping by day (can be more sophisticated)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const todayItems = history.filter(item => new Date(item.timestamp) >= today.setHours(0,0,0,0));
    const last7DaysItems = history.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate < today.setHours(0,0,0,0) && itemDate >= sevenDaysAgo.setHours(0,0,0,0);
    });
    const olderItems = history.filter(item => new Date(item.timestamp) < sevenDaysAgo.setHours(0,0,0,0));

    if (todayItems.length > 0) {
         const categoryDiv = document.createElement('div');
         categoryDiv.classList.add('history-category');
         categoryDiv.textContent = '今天';
         historyDisplay.appendChild(categoryDiv);
         todayItems.forEach(item => updateHistoryItemInDisplay(item.prompt, item.response, historyDisplay));
    }
     if (last7DaysItems.length > 0) {
         const categoryDiv = document.createElement('div');
         categoryDiv.classList.add('history-category');
         categoryDiv.textContent = '前 7 天';
         historyDisplay.appendChild(categoryDiv);
         last7DaysItems.forEach(item => updateHistoryItemInDisplay(item.prompt, item.response, historyDisplay));
     }
      if (olderItems.length > 0) {
         const categoryDiv = document.createElement('div');
         categoryDiv.classList.add('history-category');
         categoryDiv.textContent = '更早'; // Or a date range
         historyDisplay.appendChild(categoryDiv);
         olderItems.forEach(item => updateHistoryItemInDisplay(item.prompt, item.response, historyDisplay));
     }


    // Helper to add history item to display without creating new full divs every time
    function updateHistoryItemInDisplay(userPrompt, aiResponse, displayElement) {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        const historyTextSpan = document.createElement('span');
        historyTextSpan.classList.add('history-text');
        const historyText = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
        historyTextSpan.textContent = historyText;
        historyTextSpan.title = `User: ${userPrompt}\nAI: ${aiResponse}`;
        historyItem.dataset.userPrompt = userPrompt;
        historyItem.dataset.aiResponse = aiResponse;
        historyTextSpan.addEventListener('click', () => loadHistoryToChat(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse));

        const deleteIconContainer = document.createElement('span');
        deleteIconContainer.classList.add('delete-history-icon');
        deleteIconContainer.innerHTML = '<i class="fas fa-times"></i>'; // Times icon
        deleteIconContainer.addEventListener('click', (event) => {
            event.stopPropagation();
            // if (confirm('确定要删除此对话历史吗？')) {
                historyItem.remove();
                // removeConversationFromStorage(historyItem.dataset.userPrompt, historyItem.dataset.aiResponse);
            // }
        });

        historyItem.appendChild(historyTextSpan);
        historyItem.appendChild(deleteIconContainer);

        displayElement.appendChild(historyItem);
    }
}

function clearSavedHistory() {
    localStorage.removeItem('chatHistory');
}

// Optional: Function to remove specific conversation from storage
/*
function removeConversationFromStorage(userPrompt, aiResponse) {
     let history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
     // Find and remove the matching conversation
     history = history.filter(item => !(item.prompt === userPrompt && item.response === aiResponse));
     localStorage.setItem('chatHistory', JSON.stringify(history));
}
*/