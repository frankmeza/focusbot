// Background service worker for Focus Guardian

// State management
let sessionActive = false;
let sessionData = {
  purpose: '',
  startTime: null,
  sites: [],
  currentSite: null,
  currentSiteStartTime: null,
  lastCheckTime: null,
};

// Constants
const CHECK_INTERVAL_MINUTES = 15;
const ANTHROPIC_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Initialize extension - load state on install AND startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus Guardian installed');
  loadSessionData();
});

// CRITICAL: Restore state when service worker wakes up
chrome.runtime.onStartup.addListener(() => {
  console.log('Focus Guardian service worker starting up');
  loadSessionData();
});

// Also restore state whenever the service worker restarts
loadSessionData(); // Run immediately on script load

// Load session data from storage
async function loadSessionData() {
  const data = await chrome.storage.local.get(['sessionActive', 'sessionData']);

  if (data.sessionActive && data.sessionData) {
    sessionActive = data.sessionActive;
    sessionData = data.sessionData;

    console.log('Restored active session:', sessionData.purpose);

    // Restart monitoring
    startMonitoring();

    // Recreate alarm if it doesn't exist
    const alarm = await chrome.alarms.get('relevanceCheck');
    if (!alarm) {
      console.log('Recreating relevance check alarm');
      chrome.alarms.create('relevanceCheck', {
        periodInMinutes: CHECK_INTERVAL_MINUTES,
      });
    }
  } else {
    console.log('No active session to restore');
  }
}

// Save session data to storage
async function saveSessionData() {
  await chrome.storage.local.set({
    sessionActive,
    sessionData,
  });
}

// Start a focus session
async function startSession(purpose) {
  console.log('Starting new focus session:', purpose);

  sessionActive = true;
  sessionData = {
    purpose,
    startTime: Date.now(),
    sites: [],
    currentSite: null,
    currentSiteStartTime: null,
    lastCheckTime: Date.now(),
  };

  await saveSessionData();
  console.log('Session data saved to storage');

  startMonitoring();

  // Set up periodic alarm for relevance checks
  chrome.alarms.create('relevanceCheck', {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  });
  console.log('Relevance check alarm created');
}

// End the focus session
async function endSession() {
  sessionActive = false;
  chrome.alarms.clear('relevanceCheck');

  // Generate final summary
  await generateSessionSummary();

  await saveSessionData();
}

// Start monitoring tabs
function startMonitoring() {
  // Track current tab
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
}

// Handle tab activation
async function handleTabActivated(activeInfo) {
  if (!sessionActive) return;

  const tab = await chrome.tabs.get(activeInfo.tabId);
  trackSiteChange(tab);
}

// Handle tab updates
async function handleTabUpdated(tabId, changeInfo, tab) {
  if (!sessionActive) return;
  if (changeInfo.status === 'complete') {
    const activeTab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab[0]?.id === tabId) {
      trackSiteChange(tab);
    }
  }
}

// Track when user changes sites
function trackSiteChange(tab) {
  const url = tab.url;
  if (!url || url.startsWith('chrome://')) return;

  const domain = new URL(url).hostname;
  const now = Date.now();

  console.log('Tracking site change:', domain);

  // Save time spent on previous site
  if (sessionData.currentSite && sessionData.currentSiteStartTime) {
    const timeSpent = Math.floor(
      (now - sessionData.currentSiteStartTime) / 1000 / 60,
    ); // minutes

    console.log(`Spent ${timeSpent} minutes on ${sessionData.currentSite}`);

    const existingSite = sessionData.sites.find(
      (s) => s.domain === sessionData.currentSite,
    );
    if (existingSite) {
      existingSite.timeSpent += timeSpent;
      existingSite.visits += 1;
      existingSite.lastVisit = now;
    } else {
      sessionData.sites.push({
        domain: sessionData.currentSite,
        title: tab.title,
        timeSpent,
        visits: 1,
        lastVisit: now,
      });
    }
  }

  // Update current site
  sessionData.currentSite = domain;
  sessionData.currentSiteStartTime = now;

  saveSessionData();
}

// Listen for alarm to trigger relevance check
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'relevanceCheck' && sessionActive) {
    performRelevanceCheck();
  }
});

// Perform AI-powered relevance check
async function performRelevanceCheck() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab || !currentTab.url || currentTab.url.startsWith('chrome://'))
    return;

  const domain = new URL(currentTab.url).hostname;
  const timeOnCurrentSite = Math.floor(
    (Date.now() - sessionData.currentSiteStartTime) / 1000 / 60,
  );

  // Get last 3 sites
  const recentSites = sessionData.sites
    .slice(-3)
    .map((s) => s.domain)
    .join(', ');

  // Get API key from storage
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    console.error('No API key found');
    return;
  }

  // Call Claude API for relevance check
  const question = await generateRelevanceQuestion(
    sessionData.purpose,
    currentTab.title,
    domain,
    timeOnCurrentSite,
    recentSites,
    apiKey,
  );

  // Show notification popup
  showRelevancePopup(question, currentTab.title, domain);

  sessionData.lastCheckTime = Date.now();
  await saveSessionData();
}

// Generate relevance question using Claude
async function generateRelevanceQuestion(
  purpose,
  pageTitle,
  domain,
  timeSpent,
  recentSites,
  apiKey,
) {
  const prompt = `You are a helpful focus assistant. The user is trying to stay focused on a task.

Their stated purpose: "${purpose}"
Current page: ${pageTitle} (${domain})
Time on this page: ${timeSpent} minutes
Recent pages visited: ${recentSites}

Generate ONE brief, helpful question (max 20 words) to check if they're staying on task. Be encouraging and non-judgmental. Just the question, no extra text.`;

  try {
    const response = await fetch(ANTHROPIC_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return `Is browsing ${domain} helping you with: ${purpose}?`;
  }
}

// Show relevance popup
function showRelevancePopup(question, pageTitle, domain) {
  // Send message to popup to show relevance check
  chrome.storage.local.set({
    pendingRelevanceCheck: {
      question,
      pageTitle,
      domain,
      timestamp: Date.now(),
    },
  });

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Focus Check',
    message: question,
    requireInteraction: true,
  });
}

// Generate session summary
async function generateSessionSummary() {
  console.log('Generating session summary...');

  const sessionDuration = Math.floor(
    (Date.now() - sessionData.startTime) / 1000 / 60,
  );
  const sitesVisited = sessionData.sites
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .map((s) => `${s.domain} (${s.timeSpent} min)`)
    .join(', ');

  // Create fallback summary in case AI fails
  const fallbackSummary =
    `You spent ${sessionDuration} minutes working on: ${sessionData.purpose}. ` +
    `You visited ${sessionData.sites.length} different sites. ` +
    `Keep up the focused work!`;

  const { apiKey } = await chrome.storage.local.get('apiKey');

  // If no API key, save fallback immediately
  if (!apiKey) {
    console.log('No API key found, using fallback summary');
    await chrome.storage.local.set({
      lastSessionSummary: {
        summary: fallbackSummary,
        sessionData,
        timestamp: Date.now(),
        isFallback: true,
      },
    });
    return;
  }

  const prompt = `You are a helpful focus coach. Provide a brief summary of this focus session.

Original purpose: "${sessionData.purpose}"
Session duration: ${sessionDuration} minutes
Sites visited with time: ${sitesVisited || 'No sites tracked'}

Provide a 3-sentence summary:
1. What they likely accomplished
2. Where they may have gotten distracted (if at all)
3. One encouraging tip for next time

Be positive and constructive.`;

  try {
    console.log('Calling Claude API for summary...');
    const response = await fetch(ANTHROPIC_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const summary = data.content[0].text.trim();

    console.log('AI summary generated successfully');

    // Store AI-generated summary
    await chrome.storage.local.set({
      lastSessionSummary: {
        summary,
        sessionData,
        timestamp: Date.now(),
        isFallback: false,
      },
    });
  } catch (error) {
    console.error('Error generating AI summary, using fallback:', error);

    // Save fallback summary if AI fails
    await chrome.storage.local.set({
      lastSessionSummary: {
        summary: fallbackSummary,
        sessionData,
        timestamp: Date.now(),
        isFallback: true,
      },
    });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSession') {
    startSession(request.purpose);
    sendResponse({ success: true });
  } else if (request.action === 'endSession') {
    endSession();
    sendResponse({ success: true });
  } else if (request.action === 'getSessionData') {
    sendResponse({ sessionActive, sessionData });
  }
  return true;
});
