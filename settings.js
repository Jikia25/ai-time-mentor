/**
 * Settings Page JavaScript for AI Time Mentor
 */

const aiService = new AIService();

// Provider information
const providerInfo = {
  gemini: {
    title: 'Google Gemini',
    description: 'Google-ის უფასო AI მოდელი. ძალიან კარგია ქართული ენისთვის და არ საჭიროებს საფასურს.',
    getKeyUrl: 'https://makersuite.google.com/app/apikey',
    steps: [
      'გადადი <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>-ზე',
      'დააჭირე "Create API Key"',
      'აირჩიე ან შექმენი პროექტი',
      'დააკოპირე API key და ჩასვი ზემოთ'
    ]
  },
  groq: {
    title: 'Groq',
    description: 'უსწრაფესი უფასო AI. იდეალურია რეალურ დროში ანალიზისთვის.',
    getKeyUrl: 'https://console.groq.com/keys',
    steps: [
      'გადადი <a href="https://console.groq.com" target="_blank">Groq Console</a>-ზე',
      'შექმენი ანგარიში ან შესვლა',
      'გადადი API Keys განყოფილებაში',
      'დააჭირე "Create API Key"',
      'დააკოპირე key და ჩასვი ზემოთ'
    ]
  },
  openai: {
    title: 'OpenAI',
    description: 'ყველაზე მძლავრი AI, მაგრამ საჭიროებს გადახდას. GPT-4 საუკეთესოა რთული ანალიზისთვის.',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    steps: [
      'გადადი <a href="https://platform.openai.com" target="_blank">OpenAI Platform</a>-ზე',
      'შექმენი ანგარიში ან შესვლა',
      'გადადი API Keys განყოფილებაში',
      'დააჭირე "Create new secret key"',
      'დააკოპირე key და ჩასვი ზემოთ',
      '<strong>შენიშვნა:</strong> საჭიროა ბარათის დამატება და თანხის შევსება'
    ]
  }
};

// Model information for each provider
const modelInfo = {
  'gemini-pro': 'ბალანსირებული მოდელი ყველა ტიპის დავალებისთვის',
  'gemini-1.5-flash': 'უფრო სწრაფი, იდეალურია რეალურ დროში ანალიზისთვის',
  'llama-3.1-8b-instant': 'სწრაფი და ეფექტური მოდელი',
  'llama-3.1-70b-versatile': 'უფრო მძლავრი და ზუსტი მოდელი',
  'mixtral-8x7b-32768': 'დიდი კონტექსტის მოდელი რთული ანალიზისთვის',
  'gpt-3.5-turbo': 'სწრაფი და ეკონომიური',
  'gpt-4': 'ყველაზე მძლავრი და ზუსტი',
  'gpt-4-turbo': 'უახლესი GPT-4, სწრაფი და გაუმჯობესებული'
};

let currentProvider = 'gemini';
let isKeyVisible = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  setupEventListeners();
  updateFeatureStates();
});

/**
 * Load saved configuration
 */
async function loadConfig() {
  const config = await aiService.getConfig();

  currentProvider = config.provider || 'gemini';
  document.getElementById('apiKey').value = config.apiKey || '';

  // Update provider selection
  document.querySelectorAll('.provider-card').forEach(card => {
    card.classList.toggle('active', card.dataset.provider === currentProvider);
  });

  // Update model options
  updateModelOptions();

  // Set selected model
  const modelSelect = document.getElementById('modelSelect');
  if (config.model) {
    modelSelect.value = config.model;
  }

  // Update provider info
  updateProviderInfo();

  // Update status
  if (config.enabled && config.apiKey) {
    updateStatus('connected', 'კონფიგურირებულია ✓');
  } else {
    updateStatus('disconnected', 'არ არის კონფიგურირებული');
  }

  // Update model info
  updateModelInfo();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Provider selection
  document.querySelectorAll('.provider-card').forEach(card => {
    card.addEventListener('click', () => {
      currentProvider = card.dataset.provider;
      document.querySelectorAll('.provider-card').forEach(c => {
        c.classList.remove('active');
      });
      card.classList.add('active');
      updateModelOptions();
      updateProviderInfo();
      updateModelInfo();
    });
  });

  // Toggle key visibility
  document.getElementById('toggleKey').addEventListener('click', () => {
    isKeyVisible = !isKeyVisible;
    const input = document.getElementById('apiKey');
    input.type = isKeyVisible ? 'text' : 'password';
    document.getElementById('toggleKey').textContent = isKeyVisible ? '🙈' : '👁️';
  });

  // Model selection
  document.getElementById('modelSelect').addEventListener('change', () => {
    updateModelInfo();
  });

  // Save configuration
  document.getElementById('saveConfig').addEventListener('click', saveConfig);

  // Test connection
  document.getElementById('testConnection').addEventListener('click', testConnection);

  // Navigation
  document.getElementById('backToPopup').addEventListener('click', () => {
    window.close();
  });

  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
  });
}

/**
 * Update model options based on provider
 */
function updateModelOptions() {
  const modelSelect = document.getElementById('modelSelect');
  modelSelect.innerHTML = '';

  const models = aiService.providers[currentProvider].models;
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
}

/**
 * Update provider information box
 */
function updateProviderInfo() {
  const info = providerInfo[currentProvider];
  const infoBox = document.getElementById('providerInfo');

  const stepsHtml = info.steps.map(step => `<li>${step}</li>`).join('');

  infoBox.innerHTML = `
    <strong>📘 როგორ მოვიპოვოთ ${info.title} API Key:</strong>
    <ol style="margin: 10px 0 10px 20px; padding: 0;">
      ${stepsHtml}
    </ol>
    <p style="margin: 10px 0 0 0;">
      <strong>🔒 პრივატულობა:</strong> შენი API key ინახება ლოკალურად ბრაუზერში.
      ის არასდროს იგზავნება მესამე მხარის სერვერებზე, გარდა ${info.title}-ის.
    </p>
  `;
}

/**
 * Update model information
 */
function updateModelInfo() {
  const modelSelect = document.getElementById('modelSelect');
  const selectedModel = modelSelect.value;
  const modelInfoEl = document.getElementById('modelInfo');

  if (modelInfo[selectedModel]) {
    modelInfoEl.textContent = modelInfo[selectedModel];
  } else {
    modelInfoEl.textContent = '';
  }
}

/**
 * Update connection status
 */
function updateStatus(status, message) {
  const statusEl = document.getElementById('apiStatus');
  statusEl.className = `status-indicator status-${status}`;

  const icons = {
    connected: '✅',
    disconnected: '❌',
    testing: '⏳'
  };

  statusEl.innerHTML = `<span>${icons[status]}</span> ${message}`;
}

/**
 * Update feature states based on configuration
 */
function updateFeatureStates() {
  aiService.getConfig().then(config => {
    const enabled = config.enabled && config.apiKey;

    document.querySelectorAll('.feature-item').forEach(item => {
      item.classList.toggle('disabled', !enabled);
    });
  });
}

/**
 * Save configuration
 */
async function saveConfig() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('modelSelect').value;

  if (!apiKey) {
    alert('გთხოვთ შეიყვანოთ API Key');
    return;
  }

  const config = {
    provider: currentProvider,
    model: model,
    apiKey: apiKey,
    enabled: true
  };

  try {
    await aiService.saveConfig(config);
    updateStatus('connected', 'შენახულია წარმატებით ✓');
    updateFeatureStates();

    // Show success message
    const saveBtn = document.getElementById('saveConfig');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span>✓</span> შენახულია';
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
    }, 2000);
  } catch (error) {
    alert('შეცდომა კონფიგურაციის შენახვისას: ' + error.message);
  }
}

/**
 * Test API connection
 */
async function testConnection() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('modelSelect').value;

  if (!apiKey) {
    alert('გთხოვთ შეიყვანოთ API Key');
    return;
  }

  updateStatus('testing', 'კავშირის შემოწმება...');

  const testBtn = document.getElementById('testConnection');
  testBtn.disabled = true;

  try {
    const result = await aiService.testConnection(currentProvider, apiKey, model);

    if (result.success) {
      updateStatus('connected', 'კავშირი წარმატებულია! ✓');
      setTimeout(() => {
        if (document.getElementById('apiKey').value === apiKey) {
          updateStatus('connected', 'კონფიგურირებულია ✓');
        }
      }, 3000);
    } else {
      updateStatus('disconnected', 'კავშირის შეცდომა: ' + result.message);
    }
  } catch (error) {
    updateStatus('disconnected', 'შეცდომა: ' + error.message);
  } finally {
    testBtn.disabled = false;
  }
}
