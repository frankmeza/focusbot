// Focus Guardian - Background Service Worker

const AI_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SUMMARY_TIMEOUT = 30000; // 30 seconds timeout for summary generation
const SUMMARY_POLL_INTERVAL = 2000; // Poll every 2 seconds

let sessionState = {
  active: false,
  purpose: '',
  startTime: null,
  apiKey: '',
  lastCheckTime: null,
  checkIntervalId: null,
  visitedUrls: [],
  responses: [],
  summaryGenerating: false,
  summaryReady: false,
  summary: null,
};

// Load session state from storage when service worker starts
chrome.storage.local.get(['sessionState'], (result) => {
  if (result.sessionState) {
    sessionState = result.sessionState;

    // If there was an active session, resume the check interval
    if (sessionState.active && sessionState.apiKey) {
      const timeSinceLastCheck = Date.now() - (sessionState.lastCheckTime || 0);
      const timeUntilNextCheck = Math.max(
        0,
        AI_CHECK_INTERVAL - timeSinceLastCheck,
      );

      sessionState.checkIntervalId = setTimeout(() => {
        performAICheck();
        // Set up regular interval after first check
        sessionState.checkIntervalId = setInterval(
          performAICheck,
          AI_CHECK_INTERVAL,
        );
      }, timeUntilNextCheck);
    }
  }
});

// Save session state to storage whenever it changes
function saveSessionState() {
  chrome.storage.local.set({ sessionState });

  // Also save in the format the popup expects
  if (sessionState.active) {
    chrome.storage.local.set({
      sessionActive: true,
      sessionData: {
        purpose: sessionState.purpose,
        startTime: sessionState.startTime,
        sites: sessionState.visitedUrls.map((url) => ({
          domain: new URL(url.url).hostname,
          url: url.url,
          timeSpent: 0, // Could calculate this if needed
          lastVisit: url.timestamp,
        })),
      },
    });
  } else {
    chrome.storage.local.set({ sessionActive: false });
  }
}

// Validate API key format (client-side only)
function validateApiKey(apiKey) {
  // Check if key exists and is a string
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valid: false,
      error: 'API key is required',
    };
  }

  // Trim whitespace
  apiKey = apiKey.trim();

  // Check if it starts with the correct prefix
  if (!apiKey.startsWith('sk-ant-')) {
    return {
      valid: false,
      error: 'API key must start with "sk-ant-"',
    };
  }

  // Check minimum length (Anthropic keys are typically 100+ characters)
  if (apiKey.length < 100) {
    return {
      valid: false,
      error: 'API key appears to be incomplete (too short)',
    };
  }

  // Check maximum reasonable length
  if (apiKey.length > 200) {
    return {
      valid: false,
      error: 'API key appears to be invalid (too long)',
    };
  }

  // Basic format check passed
  return { valid: true };
}

// Start a new focus session
async function startSession(purpose, apiKey) {
  console.log('startSession called with purpose:', purpose);

  // Validate API key format
  const validation = validateApiKey(apiKey);
  console.log('Validation result:', validation);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid API key format',
    };
  }

  sessionState = {
    active: true,
    purpose,
    startTime: Date.now(),
    apiKey: apiKey.trim(),
    lastCheckTime: Date.now(),
    checkIntervalId: null,
    visitedUrls: [],
    responses: [],
    summaryGenerating: false,
    summaryReady: false,
    summary: null,
  };

  console.log('Session state set, saving...');
  saveSessionState();

  // Set up the periodic AI check
  sessionState.checkIntervalId = setInterval(performAICheck, AI_CHECK_INTERVAL);

  console.log('Session started successfully');
  // Perform first check after 15 minutes
  return { success: true };
}

// Perform an AI relevance check
async function performAICheck() {
  if (!sessionState.active) return;

  sessionState.lastCheckTime = Date.now();
  saveSessionState();

  const recentUrls = sessionState.visitedUrls.slice(-10);
  const urlList = recentUrls
    .map((u) => `- ${u.title || 'Untitled'} (${u.url})`)
    .join('\n');

  const prompt = `The user set this focus intention: "${sessionState.purpose}"

They've recently visited these pages:
${urlList}

Generate a brief, direct question (one sentence) that helps them reflect on whether their browsing aligns with their stated purpose. Be conversational and non-judgmental.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'x-api-key': sessionState.apiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('AI check failed:', await response.text());
      return;
    }

    const data = await response.json();
    const question = data.content[0].text;

    // Show notification with the question
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Focus Check',
      message: question,
      priority: 2,
    });

    // Store the question for later reference
    sessionState.responses.push({
      timestamp: Date.now(),
      question,
      userResponse: null,
    });
    saveSessionState();
  } catch (error) {
    console.error('Error performing AI check:', error);
  }
}

// Track visited URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (sessionState.active && changeInfo.status === 'complete' && tab.url) {
    // Only track http/https URLs
    if (tab.url.startsWith('http')) {
      sessionState.visitedUrls.push({
        url: tab.url,
        title: tab.title,
        timestamp: Date.now(),
      });
      saveSessionState();
    }
  }
});

// Generate session summary
async function generateSummary() {
  if (sessionState.summaryGenerating) {
    return { success: false, error: 'Summary already generating' };
  }

  sessionState.summaryGenerating = true;
  sessionState.summaryReady = false;
  saveSessionState();

  const duration = Math.floor(
    (Date.now() - sessionState.startTime) / 1000 / 60,
  );
  const urlList = sessionState.visitedUrls
    .map((u) => `- ${u.title || 'Untitled'} (${u.url})`)
    .join('\n');

  const prompt = `The user set this focus intention: "${sessionState.purpose}"

Session duration: ${duration} minutes

Pages visited:
${urlList}

Please provide a brief, encouraging summary (3-4 sentences) of their browsing session. Acknowledge what they accomplished, note if they stayed focused or got distracted, and offer a gentle insight or suggestion for next time.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'x-api-key': sessionState.apiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const summaryText = data.content[0].text;

    sessionState.summary = summaryText;
    sessionState.summaryReady = true;
    sessionState.summaryGenerating = false;
    saveSessionState();

    // Calculate actual session duration
    const sessionDuration = Math.floor(
      (Date.now() - sessionState.startTime) / 1000 / 60,
    );

    // Save in the format the popup expects
    await chrome.storage.local.set({
      lastSessionSummary: {
        timestamp: Date.now(),
        sessionData: {
          purpose: sessionState.purpose,
          startTime: sessionState.startTime,
          duration: sessionDuration,
          sites: sessionState.visitedUrls.map((url) => ({
            domain: new URL(url.url).hostname,
            url: url.url,
            timeSpent: 0, // We don't track per-page time
            lastVisit: url.timestamp,
          })),
        },
        summary: summaryText,
        isFallback: false,
      },
    });

    console.log('Summary saved to storage');
    return { success: true };
  } catch (error) {
    console.error('Error generating summary:', error);

    // Calculate actual session duration
    const sessionDuration = Math.floor(
      (Date.now() - sessionState.startTime) / 1000 / 60,
    );

    // Provide fallback summary
    const fallbackText = `Session completed! You browsed for ${sessionDuration} minutes with the goal: "${sessionState.purpose}". You visited ${sessionState.visitedUrls.length} pages. Keep up the focused work!`;

    sessionState.summary = fallbackText;
    sessionState.summaryReady = true;
    sessionState.summaryGenerating = false;
    saveSessionState();

    // Save in the format the popup expects
    await chrome.storage.local.set({
      lastSessionSummary: {
        timestamp: Date.now(),
        sessionData: {
          purpose: sessionState.purpose,
          startTime: sessionState.startTime,
          duration: sessionDuration,
          sites: sessionState.visitedUrls.map((url) => ({
            domain: new URL(url.url).hostname,
            url: url.url,
            timeSpent: 0, // We don't track per-page time
            lastVisit: url.timestamp,
          })),
        },
        summary: fallbackText,
        isFallback: true,
      },
    });

    console.log('Fallback summary saved to storage');
    return { success: true, fallback: true };
  }
}

// End session
async function endSession() {
  // Clear the check interval
  if (sessionState.checkIntervalId) {
    clearInterval(sessionState.checkIntervalId);
  }

  // Mark session as inactive but keep data for summary
  sessionState.active = false;
  saveSessionState();

  // Start generating summary
  return await generateSummary();
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSessionState') {
    sendResponse(sessionState);
    return true;
  }

  if (request.action === 'validateApiKey') {
    const result = validateApiKey(request.apiKey);
    sendResponse(result);
    return true;
  }

  if (request.action === 'startSession') {
    startSession(request.purpose, request.apiKey)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error('Error in startSession:', error);
        sendResponse({
          success: false,
          error: 'Failed to start session: ' + error.message,
        });
      });
    return true;
  }

  if (request.action === 'endSession') {
    endSession().then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'checkSummaryStatus') {
    sendResponse({
      generating: sessionState.summaryGenerating,
      ready: sessionState.summaryReady,
      summary: sessionState.summary,
    });
    return true;
  }

  if (request.action === 'resetSession') {
    sessionState = {
      active: false,
      purpose: '',
      startTime: null,
      apiKey: '',
      lastCheckTime: null,
      checkIntervalId: null,
      visitedUrls: [],
      responses: [],
      summaryGenerating: false,
      summaryReady: false,
      summary: null,
    };
    saveSessionState();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'triggerAICheck') {
    if (sessionState.active) {
      console.log('Manual AI check triggered');
      performAICheck().then(() => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'No active session' });
    }
    return true;
  }
});
