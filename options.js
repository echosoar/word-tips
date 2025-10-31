// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls', // Now stores array of {url, title, enabled, wordCount, lastUpdate, status, data}
  REMOTE_WORD_DATA: 'remoteWordData', // Cached word data from remote sources
  CASE_INSENSITIVE: 'caseInsensitive'
};

// Default remote word lists
const DEFAULT_REMOTE_LISTS = [
  'https://example.com/dict1.json',
  'https://example.com/dict2.json'
];

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Add event listeners
  document.getElementById('addRemoteUrlBtn').addEventListener('click', addRemoteUrl);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
});

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.WORD_LISTS,
      STORAGE_KEYS.HIDDEN_WORDS,
      STORAGE_KEYS.EXCLUDED_SITES,
      STORAGE_KEYS.REMOTE_URLS,
      STORAGE_KEYS.CASE_INSENSITIVE
    ]);

    // Load word list
    const wordLists = result[STORAGE_KEYS.WORD_LISTS] || [];
    document.getElementById('wordList').value = wordLists.join('\n');

    // Load excluded sites
    const excludedSites = result[STORAGE_KEYS.EXCLUDED_SITES] || [];
    document.getElementById('excludedSites').value = excludedSites.join('\n');

    // Load case-insensitive setting (default to true)
    const caseInsensitive = result[STORAGE_KEYS.CASE_INSENSITIVE] !== undefined 
      ? result[STORAGE_KEYS.CASE_INSENSITIVE] 
      : true;
    document.getElementById('caseInsensitive').checked = caseInsensitive;

    // Load remote URLs
    const remoteUrls = result[STORAGE_KEYS.REMOTE_URLS] || [];
    renderRemoteUrls(remoteUrls);

    // Load hidden words
    const hiddenWords = result[STORAGE_KEYS.HIDDEN_WORDS] || [];
    renderHiddenWords(hiddenWords);
  } catch (error) {
    showMessage('加载设置失败: ' + error.message, 'error');
  }
}

async function saveSettings() {
  try {
    // Get word list
    const wordListText = document.getElementById('wordList').value;
    const wordLists = wordListText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Check word list limit (max 50 entries)
    if (wordLists.length > 50) {
      showMessage('本地词表不能超过 50 个词汇，当前有 ' + wordLists.length + ' 个', 'error');
      return;
    }

    // Get excluded sites
    const excludedSitesText = document.getElementById('excludedSites').value;
    const excludedSites = excludedSitesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Get case-insensitive setting
    const caseInsensitive = document.getElementById('caseInsensitive').checked;

    // Get current remote URLs and hidden words from storage
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.REMOTE_URLS,
      STORAGE_KEYS.HIDDEN_WORDS
    ]);

    // Save to storage
    await chrome.storage.sync.set({
      [STORAGE_KEYS.WORD_LISTS]: wordLists,
      [STORAGE_KEYS.EXCLUDED_SITES]: excludedSites,
      [STORAGE_KEYS.CASE_INSENSITIVE]: caseInsensitive,
      [STORAGE_KEYS.REMOTE_URLS]: result[STORAGE_KEYS.REMOTE_URLS] || [],
      [STORAGE_KEYS.HIDDEN_WORDS]: result[STORAGE_KEYS.HIDDEN_WORDS] || []
    });

    showMessage('设置保存成功！', 'success');
  } catch (error) {
    showMessage('保存设置失败: ' + error.message, 'error');
  }
}

function renderRemoteUrls(remoteLists) {
  const container = document.getElementById('remoteUrlList');
  container.innerHTML = '';

  if (remoteLists.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无远程词表</div>';
    return;
  }

  remoteLists.forEach((list, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    
    // Checkbox for enable/disable
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = list.enabled !== false; // Default to enabled
    checkbox.className = 'url-enable-checkbox';
    checkbox.onchange = () => toggleRemoteUrl(index, checkbox.checked);
    
    // Content container
    const content = document.createElement('div');
    content.className = 'url-content';
    
    // Title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'url-title';
    titleDiv.textContent = list.title || '未命名词表';
    
    // Metadata
    const metaDiv = document.createElement('div');
    metaDiv.className = 'url-meta';
    
    let metaText = '';
    if (list.status === 'loading') {
      metaText = '加载中...';
    } else if (list.status === 'error') {
      metaText = `❌ 加载失败`;
    } else if (list.wordCount !== undefined) {
      metaText = `${list.wordCount} 个词汇`;
      if (list.lastUpdate) {
        const date = new Date(list.lastUpdate);
        metaText += ` · 更新于 ${date.toLocaleString('zh-CN')}`;
      }
    } else {
      metaText = '未加载';
    }
    metaDiv.textContent = metaText;
    
    // URL at the bottom
    const urlDiv = document.createElement('div');
    urlDiv.className = 'url-address';
    urlDiv.textContent = list.url;
    
    content.appendChild(titleDiv);
    content.appendChild(metaDiv);
    content.appendChild(urlDiv);
    
    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'url-actions';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 刷新';
    refreshBtn.className = 'button-refresh';
    refreshBtn.disabled = list.status === 'loading';
    refreshBtn.onclick = () => refreshRemoteUrl(index);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.className = 'button-danger';
    deleteBtn.onclick = () => removeRemoteUrl(index);
    
    actions.appendChild(refreshBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

async function addRemoteUrl() {
  const input = document.getElementById('newRemoteUrl');
  const url = input.value.trim();

  if (!url) {
    showMessage('请输入有效的 URL', 'error');
    return;
  }

  try {
    // Validate URL format
    new URL(url);

    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];

    // Check if URL already exists
    if (remoteLists.some(list => list.url === url)) {
      showMessage('该 URL 已存在', 'error');
      return;
    }

    // Create new list entry with loading status
    const newList = {
      url: url,
      title: '加载中...',
      enabled: true,
      wordCount: 0,
      lastUpdate: null,
      status: 'loading'
    };

    remoteLists.push(newList);
    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
    renderRemoteUrls(remoteLists);
    input.value = '';

    // Fetch the word list
    await fetchRemoteWordList(remoteLists.length - 1);
  } catch (error) {
    showMessage('添加失败: ' + error.message, 'error');
  }
}

async function fetchRemoteWordList(index) {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];
    
    if (index >= remoteLists.length) {
      return;
    }

    const list = remoteLists[index];
    list.status = 'loading';
    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
    renderRemoteUrls(remoteLists);

    // Use background script to fetch and cache the data
    const response = await chrome.runtime.sendMessage({ 
      action: 'fetchRemoteWordList', 
      url: list.url 
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const data = response.data;
    
    // Extract title from _title field
    const title = data._title || list.url.split('/').pop();
    delete data._title; // Remove _title from word data

    // Count words (excluding _title)
    const wordCount = Object.keys(data).length;

    // Update list info (data will be cached in background)
    list.title = title;
    list.wordCount = wordCount;
    list.lastUpdate = Date.now();
    list.status = 'success';

    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
    renderRemoteUrls(remoteLists);
    showMessage(`词表「${title}」加载成功`, 'success');
    
    // Notify background to update cache
    await chrome.runtime.sendMessage({
      action: 'updateRemoteCache',
      index: index,
      data: data
    });
  } catch (error) {
    // Mark as error but keep old data if exists
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];
    
    if (index < remoteLists.length) {
      remoteLists[index].status = 'error';
      await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
      renderRemoteUrls(remoteLists);
    }
    
    showMessage('加载失败: ' + error.message, 'error');
  }
}

async function refreshRemoteUrl(index) {
  await fetchRemoteWordList(index);
}

async function toggleRemoteUrl(index, enabled) {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];

    if (index < remoteLists.length) {
      remoteLists[index].enabled = enabled;
      await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });
      showMessage(enabled ? '词表已启用' : '词表已禁用', 'success');
    }
  } catch (error) {
    showMessage('操作失败: ' + error.message, 'error');
  }
}

async function removeRemoteUrl(index) {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteLists = result[STORAGE_KEYS.REMOTE_URLS] || [];

    remoteLists.splice(index, 1);
    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteLists });

    renderRemoteUrls(remoteLists);
    showMessage('远程词表删除成功', 'success');
  } catch (error) {
    showMessage('删除失败: ' + error.message, 'error');
  }
}

function renderHiddenWords(words) {
  const container = document.getElementById('hiddenWordsList');
  container.innerHTML = '';

  if (words.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无隐藏的词汇</div>';
    return;
  }

  words.forEach((word, index) => {
    const tag = document.createElement('div');
    tag.className = 'hidden-word-tag';
    
    const span = document.createElement('span');
    span.textContent = word;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '恢复';
    removeBtn.onclick = () => unhideWord(index);
    
    tag.appendChild(span);
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  });
}

async function unhideWord(index) {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.HIDDEN_WORDS]);
    const hiddenWords = result[STORAGE_KEYS.HIDDEN_WORDS] || [];

    hiddenWords.splice(index, 1);
    await chrome.storage.sync.set({ [STORAGE_KEYS.HIDDEN_WORDS]: hiddenWords });

    renderHiddenWords(hiddenWords);
    showMessage('词汇恢复成功', 'success');
  } catch (error) {
    showMessage('恢复失败: ' + error.message, 'error');
  }
}

function showMessage(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = 'status-message ' + type;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}
