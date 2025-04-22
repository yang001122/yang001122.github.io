const BACKEND_URL = 'https://yun1i2201.onrender.com';
let currentDeepSeekModel = 'deepseek-chat';

function getSelectedModel() {
  return document.getElementById('modelSelect').value;
}

async function callModelAPI(prompt) {
  const selectedModel = getSelectedModel();
  try {
    let url, requestBody;
    if (selectedModel === 'deepseek') {
      url = `${BACKEND_URL}/api/deepseek`;
      requestBody = { prompt, model: currentDeepSeekModel };
    } else if (selectedModel === 'gemini') {
      url = `${BACKEND_URL}/api/gemini`;
      requestBody = { prompt };
    } else {
      url = `${BACKEND_URL}/api/gpt`;
      requestBody = { prompt };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) {
      const errorData = data || { message: response.statusText };
      throw new Error(`Error: ${response.status} - ${errorData.error || errorData.message}`);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('API call failed:', error);
    return `Error: ${error.message}`;
  }
}

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
    label.style.background = '#444654';
    label.style.padding = '5px 10px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '12px';
    label.style.color = '#e0e0e0';
    document.body.appendChild(label);
  }
}

function createDeepSeekModelSwitch() {
  const switcherContainer = document.createElement('div');
  switcherContainer.classList.add('deepseek-model-switcher');
  switcherContainer.style.marginTop = '10px';
  switcherContainer.style.display = getSelectedModel() === 'deepseek' ? 'block' : 'none';

  const v3Button = document.createElement('button');
  v3Button.textContent = 'DeepSeek-V3';
  v3Button.classList.add(currentDeepSeekModel === 'deepseek-chat' ? 'active' : '');
  v3Button.style.padding = '5px 10px';
  v3Button.style.background = currentDeepSeekModel === 'deepseek-chat' ? '#565869' : '#343541';
  v3Button.style.border = '1px solid #565869';
  v3Button.style.borderRadius = '4px';
  v3Button.style.color = '#fff';
  v3Button.style.cursor = 'pointer';

  const r1Button = document.createElement('button');
  r1Button.textContent = 'DeepSeek-R1';
  r1Button.classList.add(currentDeepSeekModel === 'deepseek-reasoner' ? 'active' : '');
  r1Button.style.padding = '5px 10px';
  r1Button.style.background = currentDeepSeekModel === 'deepseek-reasoner' ? '#565869' : '#343541';
  r1Button.style.border = '1px solid #565869';
  r1Button.style.borderRadius = '4px';
  r1Button.style.color = '#fff';
  r1Button.style.cursor = 'pointer';

  v3Button.addEventListener('click', () => {
    currentDeepSeekModel = 'deepseek-chat'; // 对应 DeepSeek-V3
    v3Button.style.background = '#565869';
    r1Button.style.background = '#343541';
    updateModelLabel();
    console.log("切换至 DeepSeek-V3 模型");
  });

  r1Button.addEventListener('click', () => {
    currentDeepSeekModel = 'deepseek-reasoner'; // 对应 DeepSeek-R1
    r1Button.style.background = '#565869';
    v3Button.style.background = '#343541';
    updateModelLabel();
    console.log("切换至 DeepSeek-R1 模型");
  });

  switcherContainer.appendChild(v3Button);
  switcherContainer.appendChild(r1Button);

  const modelSelector = document.querySelector('.model-selector');
  const existingSwitcher = document.querySelector('.deepseek-model-switcher');
  if (existingSwitcher) {
    modelSelector.replaceChild(switcherContainer, existingSwitcher);
  } else {
    modelSelector.appendChild(switcherContainer);
  }
}

document.getElementById('modelSelect').addEventListener('change', (event) => {
  const switcherContainer = document.querySelector('.deepseek-model-switcher');
  if (switcherContainer) {
    switcherContainer.style.display = event.target.value === 'deepseek' ? 'block' : 'none';
  }
  updateModelLabel();
});

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
  });

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

  const result = await callModelAPI(userInput);

  const aiMessageDiv = document.createElement('div');
  aiMessageDiv.classList.add('ai-message');
  aiMessageDiv.textContent = result;
  chatDisplay.appendChild(aiMessageDiv);

  chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

document.getElementById('newChatButton').addEventListener('click', () => {
  document.getElementById('userInput').value = '';
  document.getElementById('chat-display').innerHTML = '';
});

document.getElementById('userInput').addEventListener('keydown', function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    document.getElementById('submitButton').click();
  }
});