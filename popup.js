// Popup script for Focus Guardian

let updateInterval;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Focus Guardian popup loaded');
  await loadApiKey();
  await checkSessionState();
  await loadLastSummary();
  setupEventListeners();
  checkForPendingRelevanceCheck();
});

// Load stored API key
async function loadApiKey() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  const apiKeyInput = document.getElementById('apiKeyInput');

  // Always clear the field first to prevent duplication
  apiKeyInput.value = '';

  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
}

// Check if session is active
async function checkSessionState() {
  // Check storage directly (more reliable than background script state)
  const { sessionActive, sessionData } = await chrome.storage.local.get([
    'sessionActive',
    'sessionData',
  ]);

  console.log('Checking session state:', { sessionActive, sessionData });

  if (sessionActive && sessionData) {
    showActiveView(sessionData);
  } else {
    showSetupView();
  }
}

// Load last session summary
async function loadLastSummary() {
  const { lastSessionSummary } = await chrome.storage.local.get(
    'lastSessionSummary',
  );

  if (lastSessionSummary) {
    const summaryDiv = document.getElementById('lastSummary');
    const contentDiv = document.getElementById('lastSummaryContent');

    const sessionDuration =
      lastSessionSummary.sessionData.duration ||
      Math.floor(
        (Date.now() - lastSessionSummary.sessionData.startTime) / 1000 / 60,
      );

    contentDiv.innerHTML = `
      <p class="summary-timestamp">${new Date(
        lastSessionSummary.timestamp,
      ).toLocaleString()}</p>
      <p><strong>Purpose:</strong> ${lastSessionSummary.sessionData.purpose}</p>
      <p><strong>Duration:</strong> ${sessionDuration} minutes</p>
      <div class="ai-summary">${lastSessionSummary.summary}</div>
    `;

    summaryDiv.style.display = 'block';
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('startBtn').addEventListener('click', startSession);
  document.getElementById('endBtn').addEventListener('click', endSession);
  document.getElementById('newSessionBtn').addEventListener('click', () => {
    showSetupView();
  });

  // Dev reset button
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      showResetModal();
    });
  }

  // Reset modal handlers
  document
    .getElementById('confirmReset')
    .addEventListener('click', async () => {
      const keepApiKey = document.getElementById('keepApiKey').checked;

      if (keepApiKey) {
        // Get API key before clearing
        const { apiKey } = await chrome.storage.local.get('apiKey');

        // Clear all storage
        await chrome.storage.local.clear();

        // Restore API key
        if (apiKey) {
          await chrome.storage.local.set({ apiKey });
        }

        console.log('Storage cleared! API key preserved.');
      } else {
        // Clear everything including API key
        await chrome.storage.local.clear();
        console.log('Storage cleared completely!');
      }

      hideResetModal();
      chrome.runtime.reload();
      window.location.reload();
    });

  document.getElementById('cancelReset').addEventListener('click', () => {
    hideResetModal();
  });

  // Relevance check responses
  document.getElementById('yesRelevant').addEventListener('click', () => {
    hideRelevanceCheck();
  });

  document.getElementById('noDistracted').addEventListener('click', () => {
    hideRelevanceCheck();
    // Could track distraction events here
  });
}

// Start a new focus session
async function startSession() {
  const purpose = document.getElementById('purposeInput').value.trim();
  const apiKey = document.getElementById('apiKeyInput').value.trim();

  if (!purpose) {
    alert("Please enter what you're working on");
    return;
  }

  if (!apiKey) {
    alert('Please enter your Anthropic API key');
    return;
  }

  // Disable button and show loading state
  const startBtn = document.getElementById('startBtn');
  const originalText = startBtn.textContent;
  startBtn.disabled = true;
  startBtn.textContent = 'Validating API key...';

  try {
    // Validate API key first
    console.log('Validating API key before starting session...');
    const validation = await chrome.runtime.sendMessage({
      action: 'validateApiKey',
      apiKey,
    });

    if (!validation.valid) {
      // Show error and re-enable button
      alert(`API Key Error: ${validation.error}`);
      startBtn.disabled = false;
      startBtn.textContent = originalText;
      return;
    }

    console.log('API key validated successfully');

    // Save API key
    await chrome.storage.local.set({ apiKey });

    // Start session
    startBtn.textContent = 'Starting session...';
    const startResult = await chrome.runtime.sendMessage({
      action: 'startSession',
      purpose,
      apiKey, // FIXED: Now passing the API key!
    });

    // Check if session started successfully
    if (!startResult || !startResult.success) {
      alert(
        `Failed to start session: ${startResult?.error || 'Unknown error'}`,
      );
      startBtn.disabled = false;
      startBtn.textContent = originalText;
      return;
    }

    console.log('Session started successfully!');

    // Update UI - construct session data if it doesn't exist yet
    const { sessionData } = await chrome.storage.local.get('sessionData');
    const dataToShow = sessionData || {
      purpose,
      startTime: Date.now(),
      sites: [],
    };
    showActiveView(dataToShow);
  } catch (error) {
    console.error('Error starting session:', error);
    alert('Error starting session. Please try again.');
    startBtn.disabled = false;
    startBtn.textContent = originalText;
  }
}

// End the focus session
async function endSession() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  console.log('Ending session and requesting summary...');
  await chrome.runtime.sendMessage({ action: 'endSession' });

  // Show summary view immediately with loading state
  showSummaryView();

  // Poll for summary (AI generation takes 3-5 seconds)
  let attempts = 0;
  const maxAttempts = 15; // 15 seconds max wait

  const checkForSummary = setInterval(async () => {
    attempts++;
    console.log(`Checking for summary (attempt ${attempts}/${maxAttempts})...`);

    const { lastSessionSummary } = await chrome.storage.local.get(
      'lastSessionSummary',
    );

    if (lastSessionSummary) {
      console.log('Summary found!');
      clearInterval(checkForSummary);
      loadSummaryData();
    } else if (attempts >= maxAttempts) {
      console.log('Summary timeout, showing fallback');
      clearInterval(checkForSummary);
      showFallbackSummary();
    }
  }, 1000); // Check every second
}

// Show setup view
function showSetupView() {
  document.getElementById('setupView').style.display = 'block';
  document.getElementById('activeView').style.display = 'none';
  document.getElementById('summaryView').style.display = 'none';

  // Clear purpose input
  document.getElementById('purposeInput').value = '';

  // Don't clear API key - it should persist, but reload it from storage to avoid duplication
  loadApiKey();
}

// Show active session view
function showActiveView(sessionData) {
  document.getElementById('setupView').style.display = 'none';
  document.getElementById('activeView').style.display = 'block';
  document.getElementById('summaryView').style.display = 'none';

  // Update purpose display
  document.getElementById('activePurpose').textContent = sessionData.purpose;

  // Update stats
  updateSessionStats(sessionData);

  // Start update interval
  updateInterval = setInterval(async () => {
    // Read from storage directly for reliability
    const { sessionData } = await chrome.storage.local.get('sessionData');
    if (sessionData) {
      updateSessionStats(sessionData);
    }
  }, 10000); // Update every 10 seconds
}

// Show summary view
function showSummaryView() {
  document.getElementById('setupView').style.display = 'none';
  document.getElementById('activeView').style.display = 'none';
  document.getElementById('summaryView').style.display = 'block';

  // Show loading state immediately
  loadSummaryData();
}

// Update session stats
function updateSessionStats(sessionData) {
  const duration = Math.floor((Date.now() - sessionData.startTime) / 1000 / 60);
  document.getElementById('sessionDuration').textContent = `${duration}m`;
  document.getElementById('sitesVisited').textContent =
    sessionData.sites.length;

  // Update recent sites
  const sitesList = document.getElementById('sitesList');
  const recentSites = sessionData.sites
    .sort((a, b) => b.lastVisit - a.lastVisit)
    .slice(0, 5);

  sitesList.innerHTML = recentSites
    .map(
      (site) => `
    <div class="site-item">
      <div class="site-name">${site.domain}</div>
      <div class="site-time">${site.timeSpent}m</div>
    </div>
  `,
    )
    .join('');
}

// Load summary data
async function loadSummaryData() {
  const { lastSessionSummary, sessionData } = await chrome.storage.local.get([
    'lastSessionSummary',
    'sessionData',
  ]);

  if (lastSessionSummary) {
    console.log(
      'Displaying summary:',
      lastSessionSummary.isFallback ? 'fallback' : 'AI-generated',
    );

    const duration =
      lastSessionSummary.sessionData.duration ||
      Math.floor(
        (Date.now() - lastSessionSummary.sessionData.startTime) / 1000 / 60,
      );

    document.getElementById('summaryDuration').textContent = `${duration}m`;
    document.getElementById('summarySites').textContent =
      lastSessionSummary.sessionData.sites.length;
    document.getElementById('summaryText').innerHTML = `
      <p><strong>Your Goal:</strong> ${
        lastSessionSummary.sessionData.purpose
      }</p>
      <div class="ai-summary">${lastSessionSummary.summary}</div>
      ${
        lastSessionSummary.isFallback
          ? '<p style="color: #95a5a6; font-size: 12px; margin-top: 8px;">Note: Basic summary (AI generation unavailable)</p>'
          : ''
      }
    `;
  } else if (sessionData) {
    // Show loading state with basic info
    document.getElementById('summaryDuration').textContent = '...';
    document.getElementById('summarySites').textContent = '...';
    document.getElementById('summaryText').innerHTML = `
      <p><strong>Your Goal:</strong> ${sessionData.purpose}</p>
      <div class="ai-summary" style="text-align: center; color: #7f8c8d;">
        <p>⏳ Generating your summary...</p>
        <p style="font-size: 12px;">This may take a few seconds</p>
      </div>
    `;
  }
}

// Show fallback summary if AI generation times out
function showFallbackSummary() {
  document.getElementById('summaryText').innerHTML = `
    <div class="ai-summary" style="text-align: center; color: #e74c3c;">
      <p>⚠️ Unable to generate AI summary</p>
      <p style="font-size: 13px; color: #7f8c8d; margin-top: 8px;">
        Your session was saved, but we couldn't generate an AI summary.
        Check your API key and try again.
      </p>
    </div>
  `;
}

// Check for pending relevance check
async function checkForPendingRelevanceCheck() {
  const { pendingRelevanceCheck } = await chrome.storage.local.get(
    'pendingRelevanceCheck',
  );

  if (pendingRelevanceCheck) {
    // Check if it's recent (within last 5 minutes)
    const age = Date.now() - pendingRelevanceCheck.timestamp;
    if (age < 5 * 60 * 1000) {
      showRelevanceCheck(pendingRelevanceCheck);
    }
  }
}

// Show relevance check
function showRelevanceCheck(checkData) {
  const relevanceDiv = document.getElementById('relevanceCheck');
  document.getElementById('relevanceQuestion').textContent = checkData.question;
  document.getElementById(
    'relevanceContext',
  ).textContent = `Currently viewing: ${checkData.pageTitle}`;

  relevanceDiv.style.display = 'block';
}

// Hide relevance check
async function hideRelevanceCheck() {
  document.getElementById('relevanceCheck').style.display = 'none';
  await chrome.storage.local.remove('pendingRelevanceCheck');
}

// Show reset modal
function showResetModal() {
  document.getElementById('resetModal').style.display = 'flex';
}

// Hide reset modal
function hideResetModal() {
  document.getElementById('resetModal').style.display = 'none';
}
