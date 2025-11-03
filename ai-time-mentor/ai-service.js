/**
 * AI Service Module for AI Time Mentor
 * Supports multiple AI providers: Google Gemini (Free), Groq (Free), OpenAI (Paid)
 *
 * Features:
 * - Input validation and sanitization
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Response caching
 * - Rate limiting
 * - Comprehensive error handling
 */

class AIService {
  constructor() {
    this.providers = {
      gemini: {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        free: true,
        models: ['gemini-pro', 'gemini-1.5-flash']
      },
      groq: {
        name: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        free: true,
        models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768']
      },
      openai: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        free: false,
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
      }
    };

    // Configuration
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
      rateLimitWindow: 60000, // 1 minute
      maxRequestsPerWindow: 20
    };

    // Rate limiting
    this.requestTimestamps = [];

    // Cache for insights
    this.cache = new Map();

    // In-flight request tracking for deduplication
    this.inFlightRequests = new Map();
  }

  /**
   * Get AI configuration from storage
   */
  async getConfig() {
    const result = await chrome.storage.local.get(['aiConfig']);
    return result.aiConfig || {
      provider: 'gemini',
      model: 'gemini-pro',
      apiKey: '',
      enabled: false
    };
  }

  /**
   * Save AI configuration to storage
   */
  async saveConfig(config) {
    // Validate config before saving
    this.validateConfig(config);
    await chrome.storage.local.set({ aiConfig: config });
  }

  /**
   * Validate AI configuration
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config: must be an object');
    }

    if (config.provider && !this.providers[config.provider]) {
      throw new Error(`Invalid provider: ${config.provider}`);
    }

    if (config.provider && config.model) {
      const provider = this.providers[config.provider];
      if (!provider.models.includes(config.model)) {
        throw new Error(`Invalid model ${config.model} for provider ${config.provider}`);
      }
    }

    if (config.apiKey && typeof config.apiKey !== 'string') {
      throw new Error('Invalid apiKey: must be a string');
    }
  }

  /**
   * Validate productivity data
   */
  validateProductivityData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid productivity data: must be an object');
    }

    const requiredFields = ['productive', 'distracting'];
    for (const field of requiredFields) {
      if (typeof data[field] !== 'number' || data[field] < 0) {
        throw new Error(`Invalid ${field}: must be a non-negative number`);
      }
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit() {
    const now = Date.now();

    // Remove old timestamps outside the window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.config.rateLimitWindow
    );

    if (this.requestTimestamps.length >= this.config.maxRequestsPerWindow) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = Math.ceil((oldestTimestamp + this.config.rateLimitWindow - now) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }

    this.requestTimestamps.push(now);
  }

  /**
   * Get cached response
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached response
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Generate cache key
   */
  generateCacheKey(provider, model, prompt) {
    // Simple hash function for cache key
    const str = `${provider}:${model}:${prompt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${hash}`;
  }

  /**
   * Fetch with timeout
   */
  async fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = this.config.maxRetries) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.message.includes('API error') && error.message.includes('400')) {
          throw error;
        }

        if (attempt < maxRetries - 1) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection(provider, apiKey, model) {
    try {
      const response = await this.generateText(
        provider,
        apiKey,
        model,
        'Respond with only "OK" if you can read this message.',
        { maxTokens: 10 }
      );
      return { success: true, message: response };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate AI insights from productivity data
   */
  async generateInsights(productivityData) {
    try {
      // Validate input
      this.validateProductivityData(productivityData);

      const config = await this.getConfig();
      if (!config.enabled || !config.apiKey) {
        console.log('AI not enabled or API key missing');
        return null;
      }

      const prompt = this.buildInsightsPrompt(productivityData);

      // Check cache
      const cacheKey = this.generateCacheKey(config.provider, config.model, prompt);
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log('Returning cached insights');
        return cached;
      }

      // Check rate limit
      this.checkRateLimit();

      const response = await this.generateText(
        config.provider,
        config.apiKey,
        config.model,
        prompt,
        { maxTokens: 500 }
      );

      const insights = this.parseInsightsResponse(response);

      // Cache the result
      this.setCache(cacheKey, insights);

      return insights;
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return null;
    }
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(weeklyData) {
    try {
      // Validate input
      if (!weeklyData || typeof weeklyData !== 'object') {
        throw new Error('Invalid weekly data: must be an object');
      }

      const config = await this.getConfig();
      if (!config.enabled || !config.apiKey) {
        throw new Error('AI not configured or not enabled');
      }

      const prompt = this.buildWeeklyReportPrompt(weeklyData);

      // Check rate limit
      this.checkRateLimit();

      const response = await this.generateText(
        config.provider,
        config.apiKey,
        config.model,
        prompt,
        { maxTokens: 1000 }
      );

      return response;
    } catch (error) {
      console.error('Weekly report generation failed:', error.message);
      throw new Error(`Failed to generate weekly report: ${error.message}`);
    }
  }

  /**
   * Generate personalized goals
   */
  async generateGoals(productivityData) {
    try {
      // Validate input
      this.validateProductivityData(productivityData);

      const config = await this.getConfig();
      if (!config.enabled || !config.apiKey) {
        throw new Error('AI not configured or not enabled');
      }

      const prompt = this.buildGoalsPrompt(productivityData);

      // Check rate limit
      this.checkRateLimit();

      const response = await this.generateText(
        config.provider,
        config.apiKey,
        config.model,
        prompt,
        { maxTokens: 600 }
      );

      return this.parseGoalsResponse(response);
    } catch (error) {
      console.error('Goals generation failed:', error.message);
      throw new Error(`Failed to generate goals: ${error.message}`);
    }
  }

  /**
   * Build prompt for insights generation
   */
  buildInsightsPrompt(data) {
    // Safe defaults for optional fields
    const productive = data.productive || 0;
    const distracting = data.distracting || 0;
    const other = data.other || 0;
    const tabSwitches = data.tabSwitches || 0;
    const typingKeystrokes = data.typingKeystrokes || 0;
    const idleMs = data.idleMs || 0;
    const focusPct = data.focusPct || 0;
    const stress = data.stress || 0;
    const mood = data.mood || 'unknown';

    const totalTime = productive + distracting + other;
    const productivePct = totalTime > 0 ? ((productive / totalTime) * 100).toFixed(1) : 0;
    const distractingPct = totalTime > 0 ? ((distracting / totalTime) * 100).toFixed(1) : 0;

    return `You are an AI productivity coach analyzing user's work patterns. Based on the following data, provide a brief insight and actionable recommendation.

DATA:
- Productive time: ${this.formatTime(productive)} (${productivePct}%)
- Distracting time: ${this.formatTime(distracting)} (${distractingPct}%)
- Tab switches: ${tabSwitches}
- Keystrokes: ${typingKeystrokes}
- Idle time: ${this.formatTime(idleMs)}
- Focus score: ${focusPct}%
- Stress level: ${(stress * 100).toFixed(0)}%
- Current mood: ${mood}

Respond in JSON format:
{
  "insight": "A brief (1-2 sentences) observation about their productivity pattern in Georgian language",
  "action": "A specific actionable recommendation in Georgian language",
  "mood": "A one-word mood assessment (focused/calm/stressed/tired)"
}`;
  }

  /**
   * Build prompt for weekly report
   */
  buildWeeklyReportPrompt(weeklyData) {
    return `You are an AI productivity coach. Analyze this week's productivity data and create a comprehensive report in Georgian language.

WEEKLY DATA:
${JSON.stringify(weeklyData, null, 2)}

Provide a detailed analysis covering:
1. Overall productivity trends
2. Best and worst performing days
3. Focus patterns and optimal work hours
4. Stress levels and their causes
5. Specific recommendations for improvement

Write in a friendly, encouraging tone in Georgian language. Keep it concise (3-4 paragraphs).`;
  }

  /**
   * Build prompt for goals generation
   */
  buildGoalsPrompt(data) {
    return `You are an AI productivity coach. Based on the user's current productivity metrics, generate 3 SMART goals.

CURRENT METRICS:
- Focus score: ${data.focusPct || 0}%
- Daily productive time: ${this.formatTime(data.productive)}
- Daily distracting time: ${this.formatTime(data.distracting)}
- Stress level: ${data.stress ? (data.stress * 100).toFixed(0) : 0}%

Generate 3 specific, measurable, achievable goals in JSON format:
[
  {
    "goal": "Goal description in Georgian",
    "current": "Current metric value",
    "target": "Target metric value",
    "timeframe": "Timeframe (e.g., 'ერთი კვირა', 'ორი კვირა')"
  }
]`;
  }

  /**
   * Parse insights response
   */
  parseInsightsResponse(response) {
    try {
      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: extract text
      return {
        insight: response.split('\n')[0] || response.substring(0, 200),
        action: 'გააგრძელე კარგი მუშაობა!',
        mood: 'focused'
      };
    } catch (error) {
      return {
        insight: response.substring(0, 200),
        action: 'გააგრძელე კარგი მუშაობა!',
        mood: 'focused'
      };
    }
  }

  /**
   * Parse goals response
   */
  parseGoalsResponse(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Core text generation function - handles all providers
   */
  async generateText(provider, apiKey, model, prompt, options = {}) {
    const maxTokens = options.maxTokens || 500;

    // Validate inputs
    if (!provider || !this.providers[provider]) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key');
    }

    if (!model || !this.providers[provider].models.includes(model)) {
      throw new Error(`Invalid model ${model} for provider ${provider}`);
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt: must be a non-empty string');
    }

    // Use retry logic for all API calls
    return await this.retryWithBackoff(async () => {
      switch (provider) {
        case 'gemini':
          return await this.callGemini(apiKey, model, prompt, maxTokens);
        case 'groq':
          return await this.callGroq(apiKey, model, prompt, maxTokens);
        case 'openai':
          return await this.callOpenAI(apiKey, model, prompt, maxTokens);
        default:
          throw new Error('Unknown provider: ' + provider);
      }
    });
  }

  /**
   * Call Google Gemini API
   */
  async callGemini(apiKey, model, prompt, maxTokens) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7
        }
      })
    }, this.config.timeoutMs);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use statusText
      }
      throw new Error(`Gemini API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Call Groq API
   */
  async callGroq(apiKey, model, prompt, maxTokens) {
    const response = await this.fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful AI productivity coach.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    }, this.config.timeoutMs);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use statusText
      }
      throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(apiKey, model, prompt, maxTokens) {
    const response = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful AI productivity coach.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    }, this.config.timeoutMs);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use statusText
      }
      throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Format time helper
   */
  formatTime(ms) {
    if (!ms || ms < 0) return '0m';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
