# Focus Guardian - Chrome Extension

An AI-powered Chrome extension that helps you stay focused on your tasks by periodically checking if you're on track and providing session summaries.

## Features

- **Purpose-Driven Sessions** - Set a clear goal for each focus session
- **AI Relevance Checks** - Get gentle nudges every 15 minutes asking if you're still on task
- **Smart Summaries** - End-of-session analysis of what you accomplished and tips for improvement
- **Privacy-First** - All data stored locally, API key never leaves your computer
- **Lightweight** - Minimal performance impact

## Prerequisites

- Chrome Browser (v88 or higher)
- Anthropic API Key ([Get one here](https://console.anthropic.com/))

## Installation

1. **Clone or download this repository**

   ```bash
   git clone [your-repo-url]
   cd focus-guardian
   ```

2. **Load the extension in Chrome**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `focus-guardian` folder

3. **Get your API key**
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create an account (if needed)
   - Generate an API key
   - You'll enter this in the extension on first use

## Usage

### Starting a Focus Session

1. Click the Focus Guardian extension icon in your toolbar
2. Enter what you're working on (e.g., "Research React frameworks for client project")
3. Enter your Anthropic API key (only needed once)
4. Click "Start Focus Session"

### During Your Session

- The extension monitors your browsing in the background
- Every 15 minutes, you'll get a notification with an AI-generated question
- Click the extension icon to see your session stats at any time
- Answer relevance check questions honestly

### Ending Your Session

1. Click the extension icon
2. Click "End Session & Get Summary"
3. Wait a moment for your AI-generated summary
4. Review what you accomplished and tips for next time

## Project Structure

```
focus-guardian/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (tab monitoring, AI calls)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and interactions
├── popup.css              # Popup styles
├── content.js             # Content script (minimal for MVP)
├── icons/                 # Extension icons (16px, 48px, 128px)
└── AI_PROMPTING_STRATEGY.md  # Detailed prompting documentation
```

## How It Works

1. **Session Tracking** - Monitors active tabs and time spent on each site
2. **Periodic Checks** - Uses Chrome alarms API to trigger checks every 15 minutes
3. **AI Integration** - Calls Claude API to generate contextual questions and summaries
4. **Local Storage** - Saves session data and API key in chrome.storage.local

## Development

### Testing Locally

1. Make changes to any file
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Focus Guardian card
4. Test your changes

### Debugging

- **Background script**: Right-click extension icon → "Inspect popup" → Console tab
- **Service worker**: Go to `chrome://extensions/` → Click "service worker" link
- **Content script**: Open DevTools on any page → Console tab

## API Costs

- **Relevance Check**: ~$0.001 per check (every 15 min)
- **Session Summary**: ~$0.002 per summary
- **Typical Session** (2 hours): ~$0.01

At this rate:

- 100 sessions = $1
- Monthly active user (20 sessions) = $0.20

## Privacy & Security

- ✅ API key stored locally in chrome.storage.local
- ✅ Only URLs and page titles are tracked (not page content)
- ✅ Data never sent anywhere except Anthropic API
- ✅ No user accounts, no tracking, no analytics
- ✅ Session data cleared on request

## Future Enhancements

### MVP+ Features

- [ ] Block distracting sites option
- [ ] Focus mode timer (Pomodoro-style)
- [ ] Weekly focus reports
- [ ] Export session data

### Advanced Features

- [ ] Team focus sessions
- [ ] Integration with task management tools
- [ ] Browser history analysis
- [ ] Chrome sync for settings
- [ ] Firefox support

## Troubleshooting

**Extension not working:**

- Check Chrome DevTools console for errors
- Verify API key is correct
- Ensure permissions are granted

**Relevance checks not appearing:**

- Check that 15 minutes have passed
- Verify chrome.alarms permission
- Check background service worker console

**API errors:**

- Verify API key is valid
- Check API rate limits
- Ensure network connection

## Contributing

This is an MVP built as a proof-of-concept. Feel free to:

- Report bugs or suggest features
- Submit pull requests
- Fork and customize for your needs

## License

MIT License - Use freely for personal or commercial projects

## Credits

Built with:

- Claude API by Anthropic
- Chrome Extensions API
- Vanilla JavaScript (no frameworks)

## Support

For issues or questions:

- Open a GitHub issue
- Check AI_PROMPTING_STRATEGY.md for prompting details
- Review Chrome extension docs: https://developer.chrome.com/docs/extensions/

---

**Built by [Your Name]** | Version 1.0.0
