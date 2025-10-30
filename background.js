// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls',
  CASE_INSENSITIVE: 'caseInsensitive'
};

// Initialize default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([STORAGE_KEYS.WORD_LISTS, STORAGE_KEYS.HIDDEN_WORDS, STORAGE_KEYS.EXCLUDED_SITES, STORAGE_KEYS.REMOTE_URLS, STORAGE_KEYS.CASE_INSENSITIVE], (result) => {
    const defaults = {};
    
    if (!result[STORAGE_KEYS.WORD_LISTS]) {
      defaults[STORAGE_KEYS.WORD_LISTS] = [];
    }
    
    if (!result[STORAGE_KEYS.HIDDEN_WORDS]) {
      defaults[STORAGE_KEYS.HIDDEN_WORDS] = [];
    }
    
    if (!result[STORAGE_KEYS.EXCLUDED_SITES]) {
      defaults[STORAGE_KEYS.EXCLUDED_SITES] = [];
    }
    
    if (!result[STORAGE_KEYS.REMOTE_URLS]) {
      defaults[STORAGE_KEYS.REMOTE_URLS] = [];
    }
    
    if (result[STORAGE_KEYS.CASE_INSENSITIVE] === undefined) {
      defaults[STORAGE_KEYS.CASE_INSENSITIVE] = true; // Default to case-insensitive
    }
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'hideWord') {
    chrome.storage.sync.get([STORAGE_KEYS.HIDDEN_WORDS], (result) => {
      const hiddenWords = result[STORAGE_KEYS.HIDDEN_WORDS] || [];
      if (!hiddenWords.includes(request.word)) {
        hiddenWords.push(request.word);
        chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_WORDS]: hiddenWords }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'fetchRemoteWordList') {
    fetch(request.url)
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});
