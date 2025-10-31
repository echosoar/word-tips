// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls',
  CASE_INSENSITIVE: 'caseInsensitive'
};

// In-memory cache for remote word lists data
const remoteWordListsCache = {};

// Default remote word lists
const DEFAULT_REMOTE_LISTS = [
  'https://example.com/dict1.json',
  'https://example.com/dict2.json'
];

// Initialize default settings and fetch default word lists
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get([
    STORAGE_KEYS.WORD_LISTS,
    STORAGE_KEYS.HIDDEN_WORDS,
    STORAGE_KEYS.EXCLUDED_SITES,
    STORAGE_KEYS.REMOTE_URLS,
    STORAGE_KEYS.CASE_INSENSITIVE
  ]);
  
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
  
  if (result[STORAGE_KEYS.CASE_INSENSITIVE] === undefined) {
    defaults[STORAGE_KEYS.CASE_INSENSITIVE] = true; // Default to case-insensitive
  }
  
  // Initialize default remote lists if none exist
  if (!result[STORAGE_KEYS.REMOTE_URLS] || result[STORAGE_KEYS.REMOTE_URLS].length === 0) {
    const remoteLists = DEFAULT_REMOTE_LISTS.map(url => ({
      url: url,
      title: '加载中...',
      enabled: true,
      wordCount: 0,
      lastUpdate: null,
      status: 'loading'
    }));
    defaults[STORAGE_KEYS.REMOTE_URLS] = remoteLists;
  }
  
  if (Object.keys(defaults).length > 0) {
    await chrome.storage.sync.set(defaults);
  }
  
  // Fetch default word lists
  if (!result[STORAGE_KEYS.REMOTE_URLS] || result[STORAGE_KEYS.REMOTE_URLS].length === 0) {
    for (let i = 0; i < DEFAULT_REMOTE_LISTS.length; i++) {
      fetchRemoteWordList(i);
    }
  }
});

// Fetch remote word list
async function fetchRemoteWordList(index) {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];
    
    if (index >= remoteLists.length) {
      return;
    }

    const list = remoteLists[index];
    
    // Fetch the JSON
    const response = await fetch(list.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Extract title from _title field
    const title = data._title || list.url.split('/').pop();
    delete data._title; // Remove _title from word data

    // Count words
    const wordCount = Object.keys(data).length;

    // Store data in memory cache
    remoteWordListsCache[index] = data;

    // Update list info (without data field)
    list.title = title;
    list.wordCount = wordCount;
    list.lastUpdate = Date.now();
    list.status = 'success';

    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
  } catch (error) {
    // Mark as error but keep old data if exists
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];
    
    if (index < remoteLists.length) {
      remoteLists[index].status = 'error';
      await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
    }
  }
}

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
  
  if (request.action === 'getRemoteWordData') {
    // Return remote word data from memory cache
    sendResponse({ success: true, data: remoteWordListsCache });
  }
  
  if (request.action === 'fetchAndCacheRemoteWordList') {
    // Fetch remote word list and cache it in memory
    fetch(request.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Extract title from _title field
        const title = data._title || request.url.split('/').pop();
        delete data._title; // Remove _title from word data
        
        // Count words
        const wordCount = Object.keys(data).length;
        
        // Cache data in memory
        remoteWordListsCache[request.index] = data;
        
        sendResponse({ 
          success: true, 
          title: title,
          wordCount: wordCount
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});
