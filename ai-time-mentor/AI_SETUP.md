# AI Time Mentor - AI Setup Guide

## 🤖 AI Integration Overview

AI Time Mentor now supports **free and open AI** integration to provide intelligent insights about your productivity patterns!

### Supported AI Providers

1. **Google Gemini** (Recommended - Free!)
   - ✅ Completely free
   - ✅ Excellent Georgian language support
   - ✅ Fast and reliable
   - Model: `gemini-pro`, `gemini-1.5-flash`

2. **Groq** (Free & Ultra-Fast)
   - ✅ Completely free
   - ✅ Lightning-fast inference
   - ✅ Great for real-time analysis
   - Models: `llama-3.1-8b-instant`, `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`

3. **OpenAI** (Paid but Powerful)
   - ❌ Requires payment
   - ✅ Most capable models
   - ✅ Best for complex analysis
   - Models: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`

---

## 🚀 Quick Start Guide

### Step 1: Get Your Free API Key

#### Option A: Google Gemini (Recommended)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select or create a project
5. Copy your API key

#### Option B: Groq (Ultra-Fast)

1. Visit [Groq Console](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys** section
4. Click **"Create API Key"**
5. Copy your API key

#### Option C: OpenAI (Paid)

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **"Create new secret key"**
5. Add payment method and credits
6. Copy your API key

---

### Step 2: Configure AI in Extension

1. **Open Settings:**
   - Click the extension icon
   - Click the **"⚙️ AI Settings"** button
   - OR right-click extension icon → Options

2. **Select Provider:**
   - Choose your AI provider (Gemini, Groq, or OpenAI)
   - The info box will show instructions for getting an API key

3. **Enter API Key:**
   - Paste your API key in the input field
   - Select your preferred model

4. **Test Connection:**
   - Click **"🔌 Test Connection"**
   - Wait for confirmation

5. **Save Configuration:**
   - Click **"💾 Save"**
   - Your AI is now configured!

---

## ✨ AI Features

Once configured, you'll have access to:

### 1. **AI-Powered Insights**
- Real-time analysis of your productivity patterns
- Context-aware recommendations in Georgian
- Automatic mood and stress detection
- Located in: Popup → Daily Insight section

### 2. **Personalized Goals**
- SMART goals based on your work patterns
- Realistic targets with timeframes
- Progress tracking
- Located in: Dashboard → AI Features → Generate Goals

### 3. **Weekly Reports**
- Comprehensive productivity analysis
- Trend identification
- Actionable recommendations
- Located in: Dashboard → AI Features → Weekly Report

### 4. **Intelligent Reminders**
- Context-aware break suggestions
- Stress-based notifications
- Focus time optimization

---

## 🔒 Privacy & Security

**Your data is safe:**
- ✅ API keys stored **locally** in browser
- ✅ Data never sent to third parties (except your chosen AI provider)
- ✅ All processing happens client-side
- ✅ You control what data is analyzed
- ✅ Text samples require explicit consent

**What data is sent to AI:**
- Aggregated time statistics (not URLs)
- Category summaries (productive/distracting)
- Metrics (focus score, stress level, etc.)
- Optional: Text samples (only with consent)

**What is NOT sent:**
- Browsing history
- Personal information
- Passwords or credentials
- Raw URLs

---

## 💡 Tips for Best Results

1. **Use Georgian-friendly models:**
   - Google Gemini has excellent Georgian support
   - Results will be in Georgian language

2. **Start with Gemini:**
   - It's free and works great
   - Try other providers if you want

3. **Enable text sampling:**
   - Provides richer insights
   - Only samples text you explicitly select
   - Use Ctrl+Shift+S to sample text

4. **Generate weekly reports:**
   - Best with at least 3-4 days of data
   - More data = better insights

5. **Check AI status:**
   - Dashboard shows if AI is configured
   - Green badge in popup means AI is working

---

## 🛠️ Troubleshooting

### "AI not configured" message
- Go to Settings and enter your API key
- Make sure to click "Save Configuration"
- Test connection to verify

### "API error" when generating insights
- Check your API key is correct
- Verify you have credits (for OpenAI)
- Check internet connection
- Try a different model

### Insights are in English instead of Georgian
- Google Gemini works best for Georgian
- The prompts are configured for Georgian output
- Some models may default to English

### "Failed to generate report"
- Make sure you have enough usage data
- Try refreshing the dashboard first
- Check console for error messages

---

## 📊 Usage & Costs

### Google Gemini
- **Free tier:** 60 requests per minute
- **Cost:** $0 (completely free!)
- **Best for:** Most users, Georgian language

### Groq
- **Free tier:** Very generous limits
- **Cost:** $0 (free!)
- **Best for:** Speed, real-time insights

### OpenAI
- **Cost:** Pay per token
  - GPT-3.5-turbo: ~$0.001 per insight
  - GPT-4: ~$0.03 per insight
- **Best for:** Complex analysis, if you need the best

**Estimated costs:**
- Daily insights: ~100 tokens
- Weekly report: ~500 tokens
- Goals generation: ~300 tokens

For Gemini/Groq: **Free!**
For OpenAI GPT-3.5: ~$0.10/month
For OpenAI GPT-4: ~$3/month

---

## 🆘 Support

If you encounter issues:

1. Check this guide first
2. Open browser console (F12) for error messages
3. Try disabling and re-enabling AI
4. Clear extension data and reconfigure
5. Report issues on GitHub

---

## 🎯 Examples

### AI Insight Example:
```
შენი ფოკუსი დღეს შესანიშნავია! 85% პროდუქტიულობა და
დაბალი სტრესის დონე. გააგრძელე ასე!

💡 რჩევა: გამოიყენე პომოდორო ტექნიკა მომდევნო 2 საათში
შედეგების გასაუმჯობესებლად.
```

### Generated Goal Example:
```json
{
  "goal": "გაზარდე დღიური პროდუქტიული დრო 5 საათამდე",
  "current": "3.5 საათი",
  "target": "5 საათი",
  "timeframe": "ორი კვირა"
}
```

---

## 🌟 Best Practices

1. **Be consistent:** Use the extension daily for better insights
2. **Review weekly reports:** Identify patterns and trends
3. **Act on recommendations:** AI suggestions are personalized for you
4. **Adjust goals:** Based on AI-generated targets
5. **Monitor progress:** Check dashboard regularly

---

Enjoy your AI-powered productivity mentor! 🚀🧠
