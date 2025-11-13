# Focus Guardian - Quick Start Guide

## What You Have

I've created a complete Chrome extension MVP with:

- ✅ Working manifest and file structure
- ✅ Background service worker for monitoring
- ✅ Complete UI with 4 screens
- ✅ AI prompting strategy document
- ✅ Visual mockups
- ✅ README with full documentation

## File Overview

### Core Extension Files (Ready to Use)

1. **manifest.json** - Chrome extension configuration
2. **background.js** - Main logic (tab tracking, AI calls, alarms)
3. **popup.html** - Extension popup interface
4. **popup.js** - UI interactions and state management
5. **popup.css** - Styling for the popup
6. **content.js** - Minimal content script (for future use)

### Documentation

7. **README.md** - Complete setup and usage guide
8. **AI_PROMPTING_STRATEGY.md** - Detailed prompting patterns and best practices
9. **mockups.html** - Visual mockups of all 4 screens

## How to Test Right Now

### 1. Add Extension Icons (Quick Placeholder)

You need to create 3 icon sizes. Here's the fastest way:

**Option A: Use a placeholder service**

- Go to https://placehold.co/128x128/3498db/white?text=FG
- Save as icon128.svg
- Repeat for 48x48 and 16x16
- Put in `/icons/` folder

**Option B: Use an emoji**

- Open any graphics app
- Create 128x128, 48x48, 16x16 images with 🎯 emoji
- Save as svg in `/icons/` folder

### 2. Load in Chrome

```bash
cd focus-guardian
# Create icons folder
mkdir icons
# Add your icon files here

# Then in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the focus-guardian folder
```

### 3. Get Your API Key

1. Visit https://console.anthropic.com/
2. Sign up/login
3. Go to API Keys
4. Generate new key
5. Copy it (starts with `sk-ant-`)

### 4. Test It!

1. Click the extension icon
2. Enter a purpose: "Test the Focus Guardian extension"
3. Paste your API key
4. Click "Start Focus Session"
5. Browse some sites for 15+ minutes
6. Wait for the AI relevance check popup
7. End the session to see your summary

## What Each Screen Does

### 1. Setup Screen

- **Shows**: Purpose input + API key field
- **User does**: Sets goal and enters API key (once)
- **Then**: Clicks "Start Focus Session"

### 2. Active Session Screen

- **Shows**: Current session stats, sites visited
- **User does**: Browses normally, checks stats occasionally
- **Background**: Extension monitors tabs, triggers checks every 15 min

### 3. Relevance Check (Popup)

- **Shows**: AI-generated question about current page
- **User does**: Answers "Yes, on task" or "Got distracted"
- **Triggers**: Every 15 minutes during active session

### 4. Summary Screen

- **Shows**: AI-generated session summary with stats
- **User does**: Reviews insights, starts new session
- **Triggers**: When user clicks "End Session"

## Key Features in the Code

### Background.js Highlights

```javascript
// Tracks sites automatically
handleTabActivated();
handleTabUpdated();

// Calls Claude API every 15 min
performRelevanceCheck();

// Generates end summary
generateSessionSummary();
```

### AI Calls (Already Implemented)

**Relevance Check:**

- Sends: Purpose, current site, time spent, recent sites
- Gets: Brief question (max 20 words)
- Cost: ~$0.001 per check

**Summary:**

- Sends: Purpose, duration, all sites visited
- Gets: 3-sentence summary (accomplishment + distraction + tip)
- Cost: ~$0.002 per summary

## Customization Ideas

### Easy Tweaks

**Change check frequency:**

```javascript
// In background.js, line 25
const CHECK_INTERVAL_MINUTES = 15; // Change to 10 or 20
```

**Adjust AI tone:**

```javascript
// In background.js, relevance check prompt
// Change: "Be encouraging and non-judgmental"
// To: "Be humorous and casual" or "Be direct and concise"
```

**Modify summary format:**

```javascript
// In background.js, summary prompt
// Change: "3 sentences"
// To: "2 sentences" or add "4. Celebrate a win"
```

## What's NOT Implemented (for later)

- ❌ Icon files (you need to add these)
- ❌ Site blocking
- ❌ Pomodoro timer
- ❌ Data export
- ❌ Settings panel
- ❌ Multiple API key options

These can be added incrementally.

## Cost Estimate

**Per 2-hour session:**

- 8 relevance checks: $0.008
- 1 summary: $0.002
- **Total: $0.01**

**For validation (100 test sessions):**

- Cost: ~$1 in API calls
- Perfect for MVP testing

## Next Steps

### Phase 1: Test MVP (This Weekend)

1. Add icons
2. Load extension
3. Do 5 real focus sessions
4. Note what feels good/annoying

### Phase 2: Iterate (Week 1)

1. Adjust check frequency based on feel
2. Refine AI prompts for better questions
3. Polish UI if needed
4. Share with 3-5 friends for feedback

### Phase 3: Validate (Week 2-3)

1. Post in r/productivity, r/ADHD
2. Collect 20+ user sessions
3. Analyze feedback patterns
4. Decide: worth building further?

### Phase 4: Monetize (If validated)

1. Add payments (Stripe)
2. Free: 10 sessions
3. Pro: $4.99/mo unlimited
4. Launch on Chrome Web Store

## Troubleshooting

**Extension won't load:**

- Check all files are in same folder
- Verify manifest.json is valid JSON
- Add icons folder with any placeholder images

**API errors:**

- Verify API key format (starts with sk-ant-)
- Check you have credits on Anthropic account
- Look at DevTools console for exact error

**Checks not appearing:**

- Wait full 15 minutes
- Check chrome://extensions/ → Focus Guardian → Service worker console
- Verify chrome.alarms permission

## Files You Can View

**Visual mockups:**

- Open `mockups.html` in any browser
- See all 4 screens side by side
- This is what the extension will look like

**Code structure:**

- All files are documented with comments
- Read AI_PROMPTING_STRATEGY.md for prompt details
- README.md has full technical details

## The "Boring But Useful" Check ✓

Your idea passes the SaaS validation test:

- ✓ Solves a real pain point (distracted browsing)
- ✓ Clear value proposition (stay focused)
- ✓ Simple to explain ("AI asks if you're on task")
- ✓ Existing market (productivity extensions)
- ✓ Low initial cost to test (<$10)
- ✓ Recurring value (use daily)

## Ready to Build?

1. Add icons (5 minutes)
2. Load in Chrome (2 minutes)
3. Get API key (3 minutes)
4. Start testing! (Now!)

Total setup time: ~10 minutes

---

**You have everything you need to test this today.** The code is complete, documented, and ready to run. Just add icons and an API key!

Good luck! 🎯
