// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls'
};

// Global state
let wordDictionary = {};
let hiddenWords = [];
let isExcluded = false;

// Custom element definition for tip
if (typeof customElements !== 'undefined' && customElements && !customElements.get('work-tip')) {
  customElements.define('work-tip', class extends HTMLElement {
    constructor() {
      super();
    }
  });
}

// Initialize
async function init() {
  try {
    // Check if current site is excluded
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.WORD_LISTS,
      STORAGE_KEYS.HIDDEN_WORDS,
      STORAGE_KEYS.EXCLUDED_SITES,
      STORAGE_KEYS.REMOTE_URLS
    ]);
    
    const excludedSites = result[STORAGE_KEYS.EXCLUDED_SITES] || [];
    const currentUrl = window.location.href;
    
    // Check if site should be excluded
    isExcluded = excludedSites.some(pattern => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(currentUrl);
      } catch (e) {
        // If not a valid regex, try exact match
        return currentUrl.includes(pattern);
      }
    });
    
    if (isExcluded) {
      return;
    }
    
    // Load hidden words
    hiddenWords = result[STORAGE_KEYS.HIDDEN_WORDS] || [];
    
    // Build word dictionary from local lists
    const wordLists = result[STORAGE_KEYS.WORD_LISTS] || [];
    wordLists.forEach(line => {
      const parts = line.split(/[：:]/); // Support both Chinese and English colons
      if (parts.length >= 2) {
        const word = parts[0].trim();
        const definition = parts.slice(1).join(':').trim();
        if (word && definition) {
          if (!wordDictionary[word]) {
            wordDictionary[word] = [];
          }
          wordDictionary[word].push(definition);
        }
      }
    });
    
    // Load remote word lists
    const remoteUrls = result[STORAGE_KEYS.REMOTE_URLS] || [];
    for (const url of remoteUrls) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        Object.keys(data).forEach(word => {
          if (!wordDictionary[word]) {
            wordDictionary[word] = [];
          }
          wordDictionary[word].push(data[word]);
        });
      } catch (e) {
        console.error('Failed to load remote word list:', url, e);
      }
    }
    
    // Start highlighting
    highlightWords();
    
    // Observe DOM changes
    observeDOM();
  } catch (error) {
    console.error('Failed to initialize Word Tips:', error);
  }
}

// Highlight words in the document
function highlightWords() {
  if (isExcluded || Object.keys(wordDictionary).length === 0) {
    return;
  }
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, and already processed nodes
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style' || tagName === 'work-tip') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip if text is empty or only whitespace
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    nodesToProcess.push(node);
  }
  
  nodesToProcess.forEach(textNode => {
    processTextNode(textNode);
  });
}

// Process a single text node
function processTextNode(textNode) {
  const text = textNode.textContent;
  const parent = textNode.parentElement;
  
  if (!text || !parent) return;
  
  let hasMatch = false;
  const words = Object.keys(wordDictionary).filter(word => !hiddenWords.includes(word));
  
  // Check if any word matches
  for (const word of words) {
    if (text.includes(word)) {
      hasMatch = true;
      break;
    }
  }
  
  if (!hasMatch) return;
  
  // Create a fragment with highlighted words
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let modified = false;
  
  // Sort words by length (longest first) to avoid partial matches
  const sortedWords = words.sort((a, b) => b.length - a.length);
  
  // Find all matches
  const matches = [];
  sortedWords.forEach(word => {
    let index = text.indexOf(word);
    while (index !== -1) {
      // Check if this position is already matched
      const overlaps = matches.some(m => 
        (index >= m.start && index < m.end) ||
        (index + word.length > m.start && index < m.end)
      );
      
      if (!overlaps) {
        matches.push({
          word: word,
          start: index,
          end: index + word.length
        });
      }
      
      index = text.indexOf(word, index + 1);
    }
  });
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);
  
  // Build the fragment
  matches.forEach(match => {
    if (match.start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.start)));
    }
    
    const tip = document.createElement('work-tip');
    tip.textContent = match.word;
    tip.setAttribute('data-word', match.word);
    tip.className = 'work-tip-highlight';
    fragment.appendChild(tip);
    
    lastIndex = match.end;
    modified = true;
  });
  
  if (modified) {
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    parent.replaceChild(fragment, textNode);
  }
}

// Observe DOM changes
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'WORK-TIP') {
          // Process new elements
          const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function(textNode) {
                const parent = textNode.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                const tagName = parent.tagName.toLowerCase();
                if (tagName === 'script' || tagName === 'style' || tagName === 'work-tip') {
                  return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );
          
          const nodesToProcess = [];
          let textNode;
          while (textNode = walker.nextNode()) {
            nodesToProcess.push(textNode);
          }
          
          nodesToProcess.forEach(processTextNode);
        } else if (node.nodeType === Node.TEXT_NODE) {
          processTextNode(node);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Create and show tooltip
let currentTooltip = null;

function showTooltip(element, word) {
  // Remove existing tooltip
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
  
  const definitions = wordDictionary[word];
  if (!definitions || definitions.length === 0) return;
  
  const tooltip = document.createElement('div');
  tooltip.className = 'work-tip-tooltip';
  
  // Add definitions
  const content = document.createElement('div');
  content.className = 'work-tip-content';
  
  // Create definition elements safely without innerHTML to prevent XSS
  definitions.forEach((definition, index) => {
    if (index > 0) {
      const separator = document.createElement('hr');
      separator.className = 'work-tip-separator';
      content.appendChild(separator);
    }
    const defText = document.createElement('div');
    defText.textContent = definition;
    content.appendChild(defText);
  });
  
  tooltip.appendChild(content);
  
  // Add hide button
  const hideBtn = document.createElement('div');
  hideBtn.className = 'work-tip-hide-btn';
  hideBtn.textContent = '不再显示';
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideWord(word);
  });
  tooltip.appendChild(hideBtn);
  
  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
  
  // Position tooltip
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.bottom + 5;
  
  // Adjust if tooltip goes off screen
  if (left < 5) left = 5;
  if (left + tooltipRect.width > window.innerWidth - 5) {
    left = window.innerWidth - tooltipRect.width - 5;
  }
  
  if (top + tooltipRect.height > window.innerHeight - 5) {
    top = rect.top - tooltipRect.height - 5;
  }
  
  tooltip.style.left = left + window.scrollX + 'px';
  tooltip.style.top = top + window.scrollY + 'px';
}

function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// Hide word functionality
async function hideWord(word) {
  try {
    await chrome.runtime.sendMessage({ action: 'hideWord', word: word });
    
    // Add to local hidden words
    hiddenWords.push(word);
    
    // Remove all highlights for this word
    document.querySelectorAll(`work-tip[data-word="${word}"]`).forEach(tip => {
      const text = tip.textContent;
      const textNode = document.createTextNode(text);
      tip.parentNode.replaceChild(textNode, tip);
    });
    
    // Hide tooltip
    hideTooltip();
  } catch (error) {
    console.error('Failed to hide word:', error);
  }
}

// Event delegation for hover
document.addEventListener('mouseover', (e) => {
  if (e.target.tagName === 'WORK-TIP') {
    const word = e.target.getAttribute('data-word');
    showTooltip(e.target, word);
  }
});

document.addEventListener('mouseout', (e) => {
  if (e.target.tagName === 'WORK-TIP') {
    // Delay hiding to allow moving to tooltip
    setTimeout(() => {
      if (currentTooltip && !currentTooltip.matches(':hover')) {
        hideTooltip();
      }
    }, 100);
  }
});

// Hide tooltip when clicking outside
document.addEventListener('click', (e) => {
  if (currentTooltip && !e.target.closest('.work-tip-tooltip') && e.target.tagName !== 'WORK-TIP') {
    hideTooltip();
  }
});

// Keep tooltip visible when hovering over it
document.addEventListener('mouseover', (e) => {
  if (e.target.closest('.work-tip-tooltip')) {
    // Keep tooltip visible
  }
});

document.addEventListener('mouseout', (e) => {
  if (e.target.closest('.work-tip-tooltip') && !e.relatedTarget?.closest('.work-tip-tooltip')) {
    hideTooltip();
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    // Reload if settings changed
    window.location.reload();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
