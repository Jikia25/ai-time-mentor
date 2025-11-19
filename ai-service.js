/**
 * AI Service Module for AI Time Mentor
 * Supports multiple AI providers: Google Gemini (Free), Groq (Free), OpenAI (Paid)
 */

class AIService {
  constructor() {
    this.providers = {
      gemini: {
        name: "Google Gemini",
        endpoint:
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        free: true,
        models: ["gemini-pro", "gemini-1.5-flash"],
      },
      groq: {
        name: "Groq",
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        free: true,
        models: [
          "llama-3.1-8b-instant",
          "llama-3.1-70b-versatile",
          "mixtral-8x7b-32768",
        ],
      },
      openai: {
        name: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
        free: false,
        models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
      },
    };
  }

  /**
   * Get AI configuration from storage
   */
  async getConfig() {
    const result = await chrome.storage.local.get(["aiConfig"]);
    return (
      result.aiConfig || {
        provider: "gemini",
        model: "gemini-pro",
        apiKey: "",
        enabled: false,
      }
    );
  }

  /**
   * Save AI configuration to storage
   */
  async saveConfig(config) {
    await chrome.storage.local.set({ aiConfig: config });
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
    const config = await this.getConfig();
    if (!config.enabled || !config.apiKey) {
      return null;
    }

    const prompt = this.buildInsightsPrompt(productivityData);

    try {
      const response = await this.generateText(
        config.provider,
        config.apiKey,
        config.model,
        prompt,
        { maxTokens: 500 }
      );

      return this.parseInsightsResponse(response);
    } catch (error) {
      console.error("AI insights generation failed:", error);
      return null;
    }
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(weeklyData) {
    const config = await this.getConfig();
    if (!config.enabled || !config.apiKey) {
      throw new Error("AI not configured");
    }

    const prompt = this.buildWeeklyReportPrompt(weeklyData);

    try {
      const response = await this.generateText(
        config.provider,
        config.apiKey,
        config.model,
        prompt,
        { maxTokens: 1000 }
      );

      return response;
    } catch (error) {
      console.error("Weekly report generation failed:", error);
      throw error;
    }
  }

  /**
   * Generate personalized goals
   */
  async generateGoals(productivityData) {
    const config = await this.getConfig();
    if (!config.enabled || !config.apiKey) {
      throw new Error("AI not configured");
    }

    const prompt = this.buildGoalsPrompt(productivityData);

    try {
      const response = await this.generateText(
        config.provider,
        config.apiKey,
        config.model,
        prompt,
        { maxTokens: 600 }
      );

      return this.parseGoalsResponse(response);
    } catch (error) {
      console.error("Goals generation failed:", error);
      throw error;
    }
  }

  /**
   * Build prompt for insights generation
   */
  buildInsightsPrompt(data) {
    const totalTime = data.productive + data.distracting + data.other;
    const productivePct =
      totalTime > 0 ? ((data.productive / totalTime) * 100).toFixed(1) : 0;
    const distractingPct =
      totalTime > 0 ? ((data.distracting / totalTime) * 100).toFixed(1) : 0;

    return `You are an AI productivity coach analyzing user's work patterns. Based on the following data, provide a brief insight and actionable recommendation.

DATA:
- Productive time: ${this.formatTime(data.productive)} (${productivePct}%)
- Distracting time: ${this.formatTime(data.distracting)} (${distractingPct}%)
- Tab switches: ${data.tabSwitches}
- Keystrokes: ${data.typingKeystrokes}
- Idle time: ${this.formatTime(data.idleMs)}
- Focus score: ${data.focusPct || 0}%
- Stress level: ${data.stress ? (data.stress * 100).toFixed(0) : 0}%
- Current mood: ${data.mood || "unknown"}

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
        insight: response.split("\n")[0] || response.substring(0, 200),
        action: "გააგრძელე კარგი მუშაობა!",
        mood: "focused",
      };
    } catch (error) {
      return {
        insight: response.substring(0, 200),
        action: "გააგრძელე კარგი მუშაობა!",
        mood: "focused",
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

    switch (provider) {
      case "gemini":
        return await this.callGemini(apiKey, model, prompt, maxTokens);
      case "groq":
        return await this.callGroq(apiKey, model, prompt, maxTokens);
      case "openai":
        return await this.callOpenAI(apiKey, model, prompt, maxTokens);
      default:
        throw new Error("Unknown provider: " + provider);
    }
  }

  /**
   * Call Google Gemini API
   */
  async callGemini(apiKey, model, prompt, maxTokens) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Gemini API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "";
  }

  /**
   * Call Groq API
   */
  async callGroq(apiKey, model, prompt, maxTokens) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a helpful AI productivity coach.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Groq API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(apiKey, model, prompt, maxTokens) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI productivity coach.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  /**
   * Format time helper
   */
  formatTime(ms) {
    if (!ms || ms < 0) return "0m";
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

export default AIService;
