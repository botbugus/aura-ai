import { escapeHtml, escapeAttr, formatAIText, truncateText, generateId, formatTime, getTimeCategory } from './utils.js';
import { AICore } from '../ai/core.js';

export class ChatManager {
  constructor() {
    this.aiCore = new AICore();
    this.pendingImages = [];
    this.isProcessing = false;
    this.currentChatId = null;
    this.chatHistory = this.loadChatHistory();
    
    this.chatArea = document.getElementById('chat-area');
    this.msgInput = document.getElementById('msg-input');
    this.chatTitle = document.getElementById('chat-title');
    this.uploadPreview = document.getElementById('upload-preview');
    this.sendBtn = document.getElementById('send-btn');
    this.fileInput = document.getElementById('file-input');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.searchInput = document.getElementById('search-chats');
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderSidebarChats();
    this.createNewChat();
    this.focusInput();
  }

  bindEvents() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    this.msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.msgInput.addEventListener('input', () => {
      this.msgInput.style.height = 'auto';
      this.msgInput.style.height = Math.min(this.msgInput.scrollHeight, 150) + 'px';
    });
    
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    this.chatArea.addEventListener('click', (e) => {
      const card = e.target.closest('.suggestion-card');
      if (card?.dataset.prompt) this.useSuggestion(card.dataset.prompt);
    });
    
    document.addEventListener('paste', (e) => this.handlePaste(e));
    document.getElementById('btn-new-chat')?.addEventListener('click', () => this.createNewChat());
    
    document.querySelector('.sidebar-content')?.addEventListener('click', (e) => {
      const chatItem = e.target.closest('.chat-item');
      const deleteBtn = e.target.closest('.chat-item-delete');
      
      if (deleteBtn) {
        e.stopPropagation();
        this.deleteChat(deleteBtn.dataset.chatId);
        return;
      }
      
      if (chatItem) this.loadChat(chatItem.dataset.chatId);
    });
    
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => this.toggleSidebar());
    this.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());
    this.searchInput?.addEventListener('input', (e) => this.filterChats(e.target.value));
    document.getElementById('btn-settings')?.addEventListener('click', () => this.openSettings());
    document.getElementById('close-settings')?.addEventListener('click', () => this.closeSettings());
    document.getElementById('btn-clear-all')?.addEventListener('click', () => this.clearAllChats());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportCurrentChat());
    
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.createNewChat();
      }
    });
  }

  focusInput() {
    setTimeout(() => this.msgInput?.focus(), 100);
  }

  loadChatHistory() {
    try {
      return JSON.parse(localStorage.getItem('auraai_chats')) || {};
    } catch { return {}; }
  }

  saveChatHistory() {
    localStorage.setItem('auraai_chats', JSON.stringify(this.chatHistory));
  }

  renderSidebarChats(filter = '') {
    const todayList = document.getElementById('chat-list-today');
    const yesterdayList = document.getElementById('chat-list-yesterday');
    const weekList = document.getElementById('chat-list-week');
    const monthList = document.getElementById('chat-list-month');
    
    [todayList, yesterdayList, weekList, monthList].forEach(list => { if (list) list.innerHTML = ''; });
    
    const chats = Object.entries(this.chatHistory).sort(([, a], [, b]) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    let hasToday = false, hasYesterday = false, hasWeek = false, hasMonth = false;
    
    for (const [chatId, chat] of chats) {
      if (filter && !chat.title.toLowerCase().includes(filter.toLowerCase())) continue;
      
      const category = getTimeCategory(chat.updatedAt);
      const div = document.createElement('div');
      div.className = `chat-item ${chatId === this.currentChatId ? 'active' : ''}`;
      div.dataset.chatId = chatId;
      
      const lastMsg = chat.messages?.slice(-1)[0];
      const preview = lastMsg ? (lastMsg.role === 'user' ? 'Anda: ' : 'AI: ') + truncateText(lastMsg.content, 30) : 'Percakapan kosong';
      
      div.innerHTML = `
        <i class="ti ti-message chat-item-icon"></i>
        <div class="chat-item-content">
          <div class="chat-item-title">${escapeHtml(chat.title || 'Percakapan Baru')}</div>
          <div class="chat-item-preview">${escapeHtml(preview)}</div>
        </div>
        <span class="chat-item-time">${formatTime(chat.updatedAt)}</span>
        <button class="chat-item-delete" data-chat-id="${chatId}"><i class="ti ti-trash"></i></button>
      `;
      
      switch (category) {
        case 'today': todayList.appendChild(div); hasToday = true; break;
        case 'yesterday': yesterdayList.appendChild(div); hasYesterday = true; break;
        case 'week': weekList.appendChild(div); hasWeek = true; break;
        default: monthList.appendChild(div); hasMonth = true;
      }
    }
    
    document.querySelectorAll('.section-label').forEach(label => {
      const listId = label.nextElementSibling?.id;
      if (listId === 'chat-list-today') label.style.display = hasToday ? '' : 'none';
      if (listId === 'chat-list-yesterday') label.style.display = hasYesterday ? '' : 'none';
      if (listId === 'chat-list-week') label.style.display = hasWeek ? '' : 'none';
      if (listId === 'chat-list-month') label.style.display = hasMonth ? '' : 'none';
    });
  }

  filterChats(query) { this.renderSidebarChats(query); }

  createNewChat() {
    const chatId = generateId();
    this.currentChatId = chatId;
    
    this.chatHistory[chatId] = {
      id: chatId, title: 'Percakapan Baru', messages: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    
    this.aiCore.clearHistory();
    this.renderWelcomeScreen();
    this.renderSidebarChats();
    this.saveChatHistory();
    this.chatTitle.textContent = 'Percakapan Baru';
    this.closeSidebar();
    this.focusInput();
  }

  loadChat(chatId) {
    const chat = this.chatHistory[chatId];
    if (!chat) return;
    
    this.currentChatId = chatId;
    this.aiCore.clearHistory();
    
    if (chat.messages) {
      this.chatArea.innerHTML = '';
      for (const msg of chat.messages) {
        this.aiCore.addToHistory(msg.role, msg.content);
        if (msg.role === 'user') this.appendUserBubbleElement(msg.content, []);
        else this.appendAIBubbleElement(msg.content);
      }
    }
    
    this.renderSidebarChats();
    this.chatTitle.textContent = chat.title || 'Percakapan Baru';
    this.closeSidebar();
    this.scrollToBottom();
  }

  deleteChat(chatId) {
    if (confirm('Hapus percakapan ini?')) {
      delete this.chatHistory[chatId];
      if (this.currentChatId === chatId) this.createNewChat();
      this.saveChatHistory();
      this.renderSidebarChats();
    }
  }

  clearAllChats() {
    if (confirm('Hapus SEMUA riwayat percakapan?')) {
      this.chatHistory = {};
      this.saveChatHistory();
      this.createNewChat();
      this.renderSidebarChats();
    }
  }

  exportCurrentChat() {
    const chat = this.chatHistory[this.currentChatId];
    if (!chat) return;
    
    let text = `# ${chat.title}\nTanggal: ${new Date(chat.createdAt).toLocaleString('id-ID')}\n\n`;
    for (const msg of (chat.messages || [])) {
      text += `**${msg.role === 'user' ? 'Anda' : 'AuraAI'}:** ${msg.content}\n\n`;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `auraai-chat-${chat.id}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  renderWelcomeScreen() {
    this.chatArea.innerHTML = `
      <div class="welcome" id="welcome-screen">
        <div class="welcome-icon"><i class="ti ti-sparkles"></i></div>
        <h1>Selamat Datang di AuraAI</h1>
        <p class="welcome-subtitle">Asisten AI cerdas yang siap membantu Anda kapan saja</p>
        <div class="feature-grid">
          <div class="feature-card"><div class="feature-icon">✍️</div><div class="feature-title">Penulisan</div><div class="feature-desc">Konten & copy</div></div>
          <div class="feature-card"><div class="feature-icon">🛠</div><div class="feature-title">Koding</div><div class="feature-desc">Debug & generate</div></div>
          <div class="feature-card"><div class="feature-icon">🌐</div><div class="feature-title">Bahasa</div><div class="feature-desc">Terjemahan</div></div>
          <div class="feature-card"><div class="feature-icon">💡</div><div class="feature-title">Ide</div><div class="feature-desc">Brainstorming</div></div>
        </div>
        <div class="suggestion-grid">
          <div class="suggestion-card" data-prompt="Bantu saya menganalisis data penjualan dan berikan rekomendasi strategi"><div class="sg-icon">📊</div><div class="sg-content"><div class="sg-title">Analisis Data Bisnis</div><div class="sg-desc">Dapatkan insight</div></div></div>
          <div class="suggestion-card" data-prompt="Tuliskan kode Python untuk mengotomatisasi laporan Excel"><div class="sg-icon">🐍</div><div class="sg-content"><div class="sg-title">Otomatisasi Python</div><div class="sg-desc">Script siap pakai</div></div></div>
          <div class="suggestion-card" data-prompt="Buatkan rencana konten Instagram untuk bisnis fashion selama 1 bulan"><div class="sg-icon">📱</div><div class="sg-content"><div class="sg-title">Strategi Konten</div><div class="sg-desc">Rencana 30 hari</div></div></div>
          <div class="suggestion-card" data-prompt="Jelaskan konsep machine learning seperti saya baru berusia 10 tahun"><div class="sg-icon">🧠</div><div class="sg-content"><div class="sg-title">Belajar Hal Baru</div><div class="sg-desc">Penjelasan mudah</div></div></div>
        </div>
      </div>
    `;
  }

  async sendMessage() {
    const text = this.msgInput.value.trim();
    if (!text && this.pendingImages.length === 0) return;
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.sendBtn.disabled = true;
    
    document.getElementById('welcome-screen')?.remove();
    this.appendUserBubbleElement(text, this.pendingImages);
    
    if (text) {
      const title = truncateText(text);
      this.chatTitle.textContent = title;
      if (this.chatHistory[this.currentChatId]) {
        this.chatHistory[this.currentChatId].title = title;
        this.chatHistory[this.currentChatId].updatedAt = new Date().toISOString();
      }
    }
    
    const images = [...this.pendingImages];
    this.pendingImages = [];
    this.renderUploadPreview();
    this.msgInput.value = '';
    this.msgInput.style.height = 'auto';
    
    const typingId = this.appendTypingIndicator();
    
    try {
      const result = await this.aiCore.processInput(text, images);
      this.removeTypingIndicator(typingId);
      
      if (this.chatHistory[this.currentChatId]) {
        if (!this.chatHistory[this.currentChatId].messages) this.chatHistory[this.currentChatId].messages = [];
        this.chatHistory[this.currentChatId].messages.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
        this.chatHistory[this.currentChatId].messages.push({ role: 'assistant', content: result.message, timestamp: new Date().toISOString() });
      }
      
      if (result.blocked) {
        this.appendSystemBubbleElement(result.message);
      } else {
        this.appendAIBubbleElement(result.message);
      }
      
      this.saveChatHistory();
      this.renderSidebarChats();
    } catch (error) {
      this.removeTypingIndicator(typingId);
      this.appendSystemBubbleElement('Maaf, terjadi kesalahan. Silakan coba lagi.');
      console.error('Chat Error:', error);
    } finally {
      this.isProcessing = false;
      this.sendBtn.disabled = false;
      this.scrollToBottom();
      this.focusInput();
    }
  }

  appendUserBubbleElement(text, images) {
    const row = document.createElement('div');
    row.className = 'msg-row user';
    let imgHTML = '';
    if (images?.length) {
      for (const img of images) {
        imgHTML += `<div class="img-attach"><div class="img-attach-thumb"><img src="${img.data}" alt="${escapeAttr(img.name || 'Gambar')}"></div><div class="img-attach-info"><div class="fn">${escapeHtml(img.name || 'Gambar')}</div><div class="fs">${escapeHtml(img.size || '')}</div></div></div>`;
      }
    }
    row.innerHTML = `<div class="avatar user-av"><i class="ti ti-user"></i></div><div class="bubble user">${imgHTML}${escapeHtml(text)}</div>`;
    this.chatArea.appendChild(row);
    this.scrollToBottom();
  }

  appendAIBubbleElement(text) {
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.innerHTML = `<div class="avatar ai"><i class="ti ti-sparkles"></i></div><div><div class="bubble ai">${formatAIText(text)}</div></div>`;
    this.chatArea.appendChild(row);
    this.scrollToBottom();
  }

  appendSystemBubbleElement(text) {
    const row = document.createElement('div');
    row.className = 'msg-row system';
    row.innerHTML = `<div class="bubble system">${formatAIText(text)}</div>`;
    this.chatArea.appendChild(row);
    this.scrollToBottom();
  }

  appendTypingIndicator() {
    const id = 'typing-' + generateId();
    const row = document.createElement('div');
    row.className = 'msg-row'; row.id = id;
    row.innerHTML = `<div class="avatar ai"><i class="ti ti-sparkles"></i></div><div class="bubble ai"><div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
    this.chatArea.appendChild(row);
    this.scrollToBottom();
    return id;
  }

  removeTypingIndicator(id) { document.getElementById(id)?.remove(); }

  handleFileSelect(e) {
    for (const file of Array.from(e.target.files)) {
      if (!file.type.startsWith('image/')) continue;
      this.readAndAddImage(file);
    }
    e.target.value = '';
  }

  handlePaste(e) {
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        this.readAndAddImage(item.getAsFile());
      }
    }
  }

  readAndAddImage(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.pendingImages.push({ name: file.name || 'pasted-image.png', size: this.formatFileSize(file.size), data: ev.target.result });
      this.renderUploadPreview();
    };
    reader.readAsDataURL(file);
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  renderUploadPreview() {
    this.uploadPreview.innerHTML = '';
    if (this.pendingImages.length === 0) { this.uploadPreview.style.display = 'none'; return; }
    this.uploadPreview.style.display = 'flex';
    this.pendingImages.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'upload-thumb';
      thumb.innerHTML = `<img src="${img.data}" alt="${escapeAttr(img.name)}"><button class="remove-img"><i class="ti ti-x"></i></button>`;
      thumb.querySelector('.remove-img').addEventListener('click', (e) => { e.stopPropagation(); this.removeImage(idx); });
      this.uploadPreview.appendChild(thumb);
    });
  }

  removeImage(idx) { this.pendingImages.splice(idx, 1); this.renderUploadPreview(); }

  useSuggestion(text) {
    this.msgInput.value = text;
    this.msgInput.focus();
    this.msgInput.style.height = 'auto';
    this.msgInput.style.height = Math.min(this.msgInput.scrollHeight, 150) + 'px';
    this.sendMessage();
  }

  toggleSidebar() { this.sidebar.classList.toggle('open'); this.sidebarOverlay.classList.toggle('show'); }
  closeSidebar() { this.sidebar.classList.remove('open'); this.sidebarOverlay.classList.remove('show'); }
  openSettings() { document.getElementById('settings-modal')?.classList.add('show'); }
  closeSettings() { document.getElementById('settings-modal')?.classList.remove('show'); }

  scrollToBottom() {
    requestAnimationFrame(() => { if (this.chatArea) this.chatArea.scrollTop = this.chatArea.scrollHeight; });
  }
}

export default ChatManager;
