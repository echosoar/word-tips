// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls'
};

// Load stats on popup open
document.addEventListener('DOMContentLoaded', loadStats);

async function loadStats() {
  try {
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.WORD_LISTS,
      STORAGE_KEYS.HIDDEN_WORDS,
      STORAGE_KEYS.EXCLUDED_SITES,
      STORAGE_KEYS.REMOTE_URLS
    ]);

    // Count unique words
    const wordLists = result[STORAGE_KEYS.WORD_LISTS] || [];
    const uniqueWords = new Set();
    
    wordLists.forEach(line => {
      const parts = line.split(/[：:]/);
      if (parts.length >= 2) {
        const word = parts[0].trim();
        if (word) {
          uniqueWords.add(word);
        }
      }
    });

    // Update stats
    document.getElementById('wordCount').textContent = uniqueWords.size;
    document.getElementById('hiddenCount').textContent = (result[STORAGE_KEYS.HIDDEN_WORDS] || []).length;
    document.getElementById('excludedCount').textContent = (result[STORAGE_KEYS.EXCLUDED_SITES] || []).length;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Open settings page
document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
