# 🧠 AI Time Mentor

A Chrome extension that tracks your browsing habits, analyzes your focus patterns, and provides AI-powered insights to improve your productivity.

## ✨ Features

### Core Features
- **🎯 Focus Tracking**: Monitors time spent on productive vs. distracting websites
- **😌 Emotion Detection**: Analyzes your work patterns to detect stress and mood
- **💡 Smart Insights**: Provides actionable recommendations based on your behavior
- **📊 Visual Dashboard**: Beautiful analytics showing your productivity metrics
- **⚡ Real-time Monitoring**: Tracks tab switches, typing intensity, and idle time

### 🤖 NEW: AI-Powered Features
- **✨ AI Insights**: Get intelligent productivity analysis from Google Gemini, Groq, or OpenAI
- **🎯 Personalized Goals**: AI generates SMART goals based on your patterns
- **📈 Weekly Reports**: Comprehensive AI-generated productivity reports in Georgian
- **🧠 Smart Recommendations**: Context-aware suggestions from AI
- **🆓 Free AI Options**: Use Google Gemini or Groq for free!

> **See [AI_SETUP.md](AI_SETUP.md) for detailed AI configuration guide**

## 🚀 Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/YOUR-USERNAME/ai-time-mentor.git
cd ai-time-mentor
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (top-right corner)

4. Click "Load unpacked" and select the project folder

5. The extension icon should appear in your browser toolbar!

## 📖 Usage

### Popup Interface
- Click the extension icon to view quick stats
- See your current focus level and mood
- Access emotion insights and recommendations
- Click "Refresh Insight" to update your profile
- Click "View Dashboard" for detailed analytics

### Dashboard
- View comprehensive time breakdown by category
- See emotion & focus profile with metrics:
  - Focus Score percentage
  - Stress Level indicator
  - Current Mood with emoji
  - Tab Switch Rate
- Get actionable insights and recommendations
- Track keystrokes, tab switches, and idle time

### Keyboard Shortcuts
- **Ctrl+Shift+S**: Capture selected text for sentiment analysis (optional)

## 🛠️ Technology Stack

- **JavaScript** - Core logic
- **Chrome Extension APIs** - Browser integration
- **Chrome Storage API** - Data persistence
- **Manifest V3** - Latest extension standards

## 📁 Project Structure

```
ai-time-mentor/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker (includes emotion tracker & AI)
├── content_script.js      # Content script for page tracking
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── dashboard.html        # Full dashboard page
├── dashboard.js          # Dashboard logic
├── settings.html         # AI configuration page
├── settings.js           # Settings page logic
├── ai-service.js         # AI service module (Gemini, Groq, OpenAI)
├── style.css             # Styles for popup and dashboard
├── README.md             # Main documentation
├── AI_SETUP.md           # AI setup guide
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🎨 Customization

### Adding Custom Domains

Edit `background.js` to customize productive/distracting sites:

```javascript
const PRODUCTIVE_DOMAINS = [
  'github.com',
  'stackoverflow.com',
  'gitlab.com',
  'docs.google.com',
  // Add your own...
];

const DISTRACTING_DOMAINS = [
  'youtube.com',
  'facebook.com',
  'twitter.com',
  // Add your own...
];
```

### Adjusting Emotion Detection

Modify sentiment lexicon in `background.js`:

```javascript
const SENTIMENT_LEXICON = {
  good: 1, great: 1, awesome: 1,
  bad: -1, terrible: -1, hate: -1,
  // Add your keywords...
};
```

## 🔒 Privacy

- **All data stays local** - stored in your browser using Chrome's storage API
- **No external servers** - extension code runs entirely in your browser
- **No tracking** - your browsing patterns never leave your device
- **AI is optional** - works great without AI, AI features require your chosen provider
- **You control AI data** - only aggregated stats sent to AI, never raw URLs or personal info
- **API keys secure** - stored locally in browser, never transmitted to third parties
- **Open source** - inspect the code yourself!

See [AI_SETUP.md](AI_SETUP.md) for details on AI privacy.

## 📊 Emotion Detection Algorithm

The extension uses a heuristic-based approach to detect focus and emotional patterns:

1. **Focus Score**: Ratio of productive to total active time
2. **Stress Level**: Calculated from tab switch rate, typing intensity, and sentiment
3. **Mood Detection**: Categorizes into focused, calm, frustrated, tired, restless, or mixed
4. **Sentiment Analysis**: Analyzes text patterns (if consent given)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Emotion profile requires 5-10 minutes of browsing to generate accurate insights
- Tab switching detection may be delayed in some cases
- Works only on websites (not on browser settings pages)

## 🔮 Future Features

- [x] ~~Weekly/monthly analytics reports~~ ✅ Implemented with AI
- [x] ~~Custom productivity goals~~ ✅ AI generates personalized goals
- [x] ~~Break reminders based on stress level~~ ✅ Smart reminders implemented
- [ ] Export data to CSV
- [ ] Dark mode for dashboard
- [ ] Pomodoro timer integration
- [ ] Historical data charts
- [ ] Browser sync across devices
- [ ] Mobile companion app

## 👨‍💻 Author

Created with ❤️ by [Your Name]

## 🙏 Acknowledgments

- Inspired by productivity tracking tools like RescueTime
- Built using Chrome Extension APIs
- Thanks to the open-source community

---

**Star ⭐ this repo if you find it helpful!**



![Chrome](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-blue)
![Status](https://img.shields.io/badge/Status-Active-success)
```

---
```
https://github.com/YOUR-USERNAME/ai-time-mentor
