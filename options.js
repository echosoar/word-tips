// Storage key constants
const STORAGE_KEYS = {
  WORD_LISTS: 'wordLists',
  HIDDEN_WORDS: 'hiddenWords',
  EXCLUDED_SITES: 'excludedSites',
  REMOTE_URLS: 'remoteUrls',
  CASE_INSENSITIVE: 'caseInsensitive'
};

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

function renderRemoteUrls(urls) {
  const container = document.getElementById('remoteUrlList');
  container.innerHTML = '';

  if (urls.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无远程词表</div>';
    return;
  }

  urls.forEach((url, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    
    const span = document.createElement('span');
    span.textContent = url;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.onclick = () => removeRemoteUrl(index);
    
    item.appendChild(span);
    item.appendChild(deleteBtn);
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
    const remoteUrls = result[STORAGE_KEYS.REMOTE_URLS] || [];

    if (remoteUrls.includes(url)) {
      showMessage('该 URL 已存在', 'error');
      return;
    }

    remoteUrls.push(url);
    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteUrls });

    renderRemoteUrls(remoteUrls);
    input.value = '';
    showMessage('远程词表添加成功', 'success');
  } catch (error) {
    showMessage('添加失败: ' + error.message, 'error');
  }
}

async function removeRemoteUrl(index) {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.REMOTE_URLS]);
    const remoteUrls = result[STORAGE_KEYS.REMOTE_URLS] || [];

    remoteUrls.splice(index, 1);
    await chrome.storage.sync.set({ [STORAGE_KEYS.REMOTE_URLS]: remoteUrls });

    renderRemoteUrls(remoteUrls);
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
