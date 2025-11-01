// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls',
  CASE_INSENSITIVE: 'caseInsensitive'
};

// Global state
let wordDictionary = {};
let hiddenWords = [];
let isExcluded = false;
let caseInsensitive = true; // Default to case-insensitive matching
let tooltipContentElement = null;
let tooltipHideButton = null;
let words = [];

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
      STORAGE_KEYS.REMOTE_URLS,
      STORAGE_KEYS.CASE_INSENSITIVE
    ]);
    
    const excludedSites = result[STORAGE_KEYS.EXCLUDED_SITES] || [];
    const currentUrl = window.location.href;
    
    // Load case sensitivity setting (default to true for case-insensitive)
    caseInsensitive = result[STORAGE_KEYS.CASE_INSENSITIVE] !== undefined 
      ? result[STORAGE_KEYS.CASE_INSENSITIVE] 
      : true;
    
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
    
    // Load remote word lists from background memory
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];
    if (remoteLists.some(list => list.enabled !== false && list.status === 'success')) {
      try {
        // Request remote word data from background
        const response = await chrome.runtime.sendMessage({ action: 'getRemoteWordData' });
        if (response && response.success && response.data) {
          remoteLists.forEach((list, index) => {
            // Only use enabled lists with successfully loaded data
            if (list.enabled !== false && list.status === 'success' && response.data[index]) {
              Object.keys(response.data[index]).forEach(word => {
                if (!wordDictionary[word]) {
                  wordDictionary[word] = [];
                }
                wordDictionary[word].push(response.data[index][word]);
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to load remote word lists from background:', error);
      }
    }

    words = Object.keys(wordDictionary).map(word => {
      // format definitions by splitting on commas
      const wordInfo = wordDictionary[word];
      const newDefList = [];
      wordInfo.forEach(def => {
        const newDef = def.trim();
        if (!def) {
          return;
        }
        const list = def.split(/\s*,\s*/);
        newDefList.push(...list);
      });
      wordDictionary[word] = newDefList;
      return word;
    }).filter(word => !hiddenWords.includes(word));
    
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
        
        if (typeof parent.closest === 'function') {
          const owner = parent.closest('work-tip, .work-tip-tooltip');
          if (owner) {
            return NodeFilter.FILTER_REJECT;
          }
        }

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

// Helper function for finding word matches (case-sensitive or insensitive)
function findWordInText(text, word, startIndex = 0) {
  let index = -1
  if (caseInsensitive) {
    const lowerText = text.toLowerCase();
    const lowerWord = word.toLowerCase();
    index = lowerText.indexOf(lowerWord, startIndex);
  } else {
    index = text.indexOf(word, startIndex);
  }
  if (index !== -1) {
    if (/[a-z]/i.test(word[0])) {
      // Check word boundaries for alphabetic words
      if (index > 0 && /[a-z]/i.test(text[index - 1])) {
        return findWordInText(text, word, index + 1);
      }
      // Check character after the word
      if (index + word.length < text.length && /[a-z]/i.test(text[index + word.length])) {
        return findWordInText(text, word, index + 1);
      }
    }
  }
  return index;
}

// Process a single text node
function processTextNode(textNode) {
  const text = textNode.textContent;
  const parent = textNode.parentElement;
  
  if (!text || !parent) return;
  if (typeof parent.closest === 'function') {
    const owner = parent.closest('work-tip, .work-tip-tooltip');
    if (owner) return;
  }
  
  let hasMatch = false;
  
  // Check if any word matches
  for (const word of words) {
    if (findWordInText(text, word) !== -1) {
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
    let index = findWordInText(text, word);
    while (index !== -1) {
      // Check if this position is already matched
      const overlaps = matches.some(m => 
        (index >= m.start && index < m.end) ||
        (index + word.length > m.start && index < m.end)
      );
      
      if (!overlaps) {
        matches.push({
          word: word,
          matchedText: text.substring(index, index + word.length), // Store actual matched text
          start: index,
          end: index + word.length
        });
      }
      
      index = findWordInText(text, word, index + 1);
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
    tip.textContent = match.matchedText; // Use actual matched text to preserve case
    tip.setAttribute('data-word', match.word); // Store dictionary word for lookup
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
      if (mutation.target instanceof Element && typeof mutation.target.closest === 'function' && mutation.target.closest('.work-tip-tooltip')) {
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const elementNode = node;
          if (elementNode.tagName === 'WORK-TIP') {
            return;
          }
          if (typeof elementNode.closest === 'function') {
            const owner = elementNode.closest('.work-tip-tooltip');
            if (owner) {
              return;
            }
          }
          if (elementNode.classList && elementNode.classList.contains('work-tip-tooltip')) {
            return;
          }
          // Process new elements
          const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function(textNode) {
                const parent = textNode.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                if (typeof parent.closest === 'function') {
                  const owner = parent.closest('work-tip, .work-tip-tooltip');
                  if (owner) {
                    return NodeFilter.FILTER_REJECT;
                  }
                }

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
          const parent = node.parentElement;
          if (parent && typeof parent.closest === 'function' && parent.closest('work-tip, .work-tip-tooltip')) {
            return;
          }
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

// Tooltip management
let currentTooltip = null;

function ensureTooltipElement() {
  let tooltip = currentTooltip;
  if (!tooltip || !tooltip.isConnected) {
    tooltip = document.querySelector('.work-tip-tooltip');
  }

  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'work-tip-tooltip';
    tooltip.style.display = 'none';
    tooltip.style.visibility = 'hidden';
    document.body.appendChild(tooltip);
  } else if (!tooltip.isConnected) {
    document.body.appendChild(tooltip);
  }

  currentTooltip = tooltip;

  if (!tooltipContentElement || !tooltipContentElement.isConnected || tooltipContentElement.parentElement !== tooltip) {
    tooltipContentElement = tooltip.querySelector('.work-tip-content');
  }
  if (!tooltipContentElement) {
    tooltipContentElement = document.createElement('div');
    tooltipContentElement.className = 'work-tip-content';
    tooltip.insertBefore(tooltipContentElement, tooltip.firstChild);
  }

  let hideButton = tooltip.querySelector('.work-tip-hide-btn');
  if (!hideButton) {
    hideButton = document.createElement('div');
    hideButton.className = 'work-tip-hide-btn';
    hideButton.textContent = '不再显示';
    tooltip.appendChild(hideButton);
  }
  tooltipHideButton = hideButton;

  tooltipHideButton.onclick = (e) => {
    e.stopPropagation();
    const word = tooltip.dataset.word;
    if (word) {
      hideWord(word);
    }
  };

  return tooltip;
}

function showTooltip(element, word) {
  const definitions = wordDictionary[word];
  if (!definitions || definitions.length === 0) return;

  const tooltip = ensureTooltipElement();

  if (!tooltipContentElement) {
    return;
  }

  while (tooltipContentElement.firstChild) {
    tooltipContentElement.removeChild(tooltipContentElement.firstChild);
  }

  definitions.forEach((definition, index) => {
    if (index > 0) {
      const separator = document.createElement('hr');
      separator.className = 'work-tip-separator';
      tooltipContentElement.appendChild(separator);
    }
    const defText = document.createElement('div');
    defText.textContent = definition;
    tooltipContentElement.appendChild(defText);
  });

  tooltip.dataset.word = word;
  tooltip.style.display = 'block';
  tooltip.style.visibility = 'hidden';

  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.bottom + 5;

  if (left < 5) left = 5;
  if (left + tooltipRect.width > window.innerWidth - 5) {
    left = window.innerWidth - tooltipRect.width - 5;
  }

  if (top + tooltipRect.height > window.innerHeight - 5) {
    top = rect.top - tooltipRect.height - 5;
  }

  tooltip.style.left = left + window.scrollX + 'px';
  tooltip.style.top = top + window.scrollY + 'px';
  tooltip.style.visibility = 'visible';
}

function hideTooltip() {
  if (!currentTooltip) {
    return;
  }

  if (tooltipContentElement) {
    while (tooltipContentElement.firstChild) {
      tooltipContentElement.removeChild(tooltipContentElement.firstChild);
    }
  }

  currentTooltip.style.display = 'none';
  currentTooltip.style.visibility = 'hidden';
  currentTooltip.dataset.word = '';
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
