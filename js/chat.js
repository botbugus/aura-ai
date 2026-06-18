// ─── Chat Manager with Sidebar History ────────────────────────────────────────
import { escapeHtml, escapeAttr, formatAIText, truncateText, generateId, formatTime, getTimeCategory } from './utils.js';
import { AICore } from '../ai/core.js';

export class ChatManager {
  constructor() {
    console.log('💬 ChatManager initializing...');
    
    this.aiCore = new AICore();
    this.pendingImages = [];
    this.isProcessing = false;
    this.currentChatId = null;
    this.chatHistory = this.loadChatHistory();
    
    // Cache DOM elements
    this.cacheElements();
    
    // Initialize
    this.bindEvents();
    this.renderSidebarChats();
    this.createNewChat();
    this.focusInput();
    
    console.log('✅ ChatManager ready');
  }

  cacheElements() {
    this.chatArea = document.getElementById('chat-area');
    this.msgInput = document.getElementById('msg-input');
    this.chatTitle = document.getElementById('chat-title');
    this.uploadPreview = document.getElementById('upload-preview');
    this.sendBtn = document.getElementById('send-btn');
    this.fileInput = document.getElementById('file-input');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.searchInput = document.getElementById('search-chats');
    this.btnNewChat = document.getElementById('btn-new-chat');
    this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnClearAll = document.getElementById('btn-clear-all');
    this.btnExport = document.getElementById('btn-export');
    this.closeSettingsBtn = document.getElementById('close-settings');
    this.settingsModal = document.getElementById('settings-modal');
  }

  bindEvents() {
    // Send button click
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    // Enter key to send
    if (this.msgInput) {
      this.msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Auto resize textarea
      this.msgInput.addEventListener('input', () => {
        this.msgInput.style.height = 'auto';
        this.msgInput.style.height = Math.min(this.msgInput.scrollHeight, 150) + 'px';
      });
    }

    // File input
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // New chat button
    if (this.btnNewChat) {
      this.btnNewChat.addEventListener('click', (e) => {
        e.preventDefault();
        this.createNewChat();
      });
    }

    // Mobile menu button
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSidebar();
      });
    }

    // Sidebar overlay
    if (this.sidebarOverlay) {
      this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
    }

    // Settings
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.openSettings());
    }
    if (this.closeSettingsBtn) {
      this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    }

    // Clear all chats
    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => this.clearAllChats());
    }

    // Export chat
    if (this.btnExport) {
      this.btnExport.addEventListener('click', () => this.exportCurrentChat());
    }

    // Search chats
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => this.filterChats(e.target.value));
    }

    // Sidebar chat item clicks (event delegation)
    const sidebarContent = document.querySelector('.sidebar-content');
    if (sidebarContent) {
      sidebarContent.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.chat-item-delete');
        if (deleteBtn) {
          e.stopPropagation();
          const chatId = deleteBtn.getAttribute('data-chat-id');
          if (chatId) this.deleteChat(chatId);
          return;
        }
        
        const chatItem = e.target.closest('.chat-item');
        if (chatItem) {
          const chatId = chatItem.getAttribute('data-chat-id');
          if (chatId) this.loadChat(chatId);
        }
      });
    }

    // Suggestion cards (event delegation)
    if (this.chatArea) {
      this.chatArea.addEventListener('click', (e) => {
        const card = e.target.closest('.suggestion-card');
        if (card && card.dataset.prompt) {
          this.useSuggestion(card.dataset.prompt);
        }
      });
    }

    // Paste image
    document.addEventListener('paste', (e) => this.handlePaste(e));

    // Ctrl+N for new chat
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.createNewChat();
      }
    });

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSettings();
        this.closeSidebar();
      }
    });
  }

  focusInput() {
    setTimeout(() => {
      if (this.msgInput) {
        this.msgInput.focus();
      }
    }, 200);
  }

  // ─── LOCAL STORAGE ─────────────────────────────────────────────────────────
  
  loadChatHistory() {
    try {
      const saved = localStorage.getItem('auraai_chats');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return {};
    }
  }

  saveChatHistory() {
    try {
      localStorage.setItem('auraai_chats', JSON.stringify(this.chatHistory));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  // ─── SIDEBAR RENDERING ─────────────────────────────────────────────────────

  renderSidebarChats(filter = '') {
    const todayList = document.getElementById('chat-list-today');
    const yesterdayList = document.getElementById('chat-list-yesterday');
    const weekList = document.getElementById('chat-list-week');
    const monthList = document.getElementById('chat-list-month');
    
    // Clear all lists
    [todayList, yesterdayList, weekList, monthList].forEach(list => {
      if (list) list.innerHTML = '';
    });
    
    if (!this.chatHistory || Object.keys(this.chatHistory).length === 0) {
      // Hide all section labels
      document.querySelectorAll('.section-label').forEach(label => {
        const nextList = label.nextElementSibling;
        if (nextList && nextList.classList.contains('chat-list')) {
          label.style.display = 'none';
        }
      });
      return;
    }
    
    // Sort chats by last update
    const chats = Object.entries(this.chatHistory)
      .sort(([, a], [, b]) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    let hasToday = false, hasYesterday = false, hasWeek = false, hasMonth = false;
    
    for (const [chatId, chat] of chats) {
      // Apply filter
      if (filter && chat.title && !chat.title.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }
      
      const category = getTimeCategory(chat.updatedAt);
      const item = this.createChatItemElement(chatId, chat);
      
      switch (category) {
        case 'today':
          if (todayList) { todayList.appendChild(item); hasToday = true; }
          break;
        case 'yesterday':
          if (yesterdayList) { yesterdayList.appendChild(item); hasYesterday = true; }
          break;
        case 'week':
          if (weekList) { weekList.appendChild(item); hasWeek = true; }
          break;
        default:
          if (monthList) { monthList.appendChild(item); hasMonth = true; }
      }
    }
    
    // Show/hide section labels
    this.updateSectionLabel('chat-list-today', hasToday);
    this.updateSectionLabel('chat-list-yesterday', hasYesterday);
    this.updateSectionLabel('chat-list-week', hasWeek);
    this.updateSectionLabel('chat-list-month', hasMonth);
  }

  updateSectionLabel(listId, hasItems) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const label = list.previousElementSibling;
    if (label && label.classList.contains('section-label')) {
      label.style.display = hasItems ? 'block' : 'none';
    }
  }

  createChatItemElement(chatId, chat) {
    const div = document.createElement('div');
    div.className = `chat-item ${chatId === this.currentChatId ? 'active' : ''}`;
    div.setAttribute('data-chat-id', chatId);
    
    const lastMsg = chat.messages && chat.messages.length > 0 
      ? chat.messages[chat.messages.length - 1] 
      : null;
    
    const preview = lastMsg 
      ? (lastMsg.role === 'user' ? 'Anda: ' : 'AI: ') + truncateText(lastMsg.content, 30)
      : 'Percakapan kosong';
    
    div.innerHTML = `
      <i class="ti ti-message chat-item-icon"></i>
      <div class="chat-item-content">
        <div class="chat-item-title">${escapeHtml(chat.title || 'Percakapan Baru')}</div>
        <div class="chat-item-preview">${escapeHtml(preview)}</div>
      </div>
      <span class="chat-item-time">${formatTime(chat.updatedAt)}</span>
      <button class="chat-item-delete" data-chat-id="${chatId}">
        <i class="ti ti-trash"></i>
      </button>
    `;
    
    return div;
  }

  filterChats(query) {
    this.renderSidebarChats(query);
  }

  // ─── CHAT MANAGEMENT ───────────────────────────────────────────────────────

  createNewChat() {
    const chatId = generateId();
    this.currentChatId = chatId;
    
    this.chatHistory[chatId] = {
      id: chatId,
      title: 'Percakapan Baru',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.aiCore.clearHistory();
    this.renderWelcomeScreen();
    this.renderSidebarChats();
    this.saveChatHistory();
    
    if (this.chatTitle) {
      this.chatTitle.textContent = 'Percakapan Baru';
    }
    
    this.closeSidebar();
    this.focusInput();
  }

  loadChat(chatId) {
    const chat = this.chatHistory[chatId];
    if (!chat) return;
    
    this.currentChatId = chatId;
    this.aiCore.clearHistory();
    
    // Clear chat area
    if (this.chatArea) {
      this.chatArea.innerHTML = '';
    }
    
    // Render messages
    if (chat.messages && chat.messages.length > 0) {
      for (const msg of chat.messages) {
        this.aiCore.addToHistory(msg.role, msg.content);
        if (msg.role === 'user') {
          this.renderUserBubble(msg.content, []);
        } else {
          this.renderAIBubble(msg.content);
        }
      }
    } else {
      this.renderWelcomeScreen();
    }
    
    this.renderSidebarChats();
    
    if (this.chatTitle) {
      this.chatTitle.textContent = chat.title || 'Percakapan Baru';
    }
    
    this.closeSidebar();
    this.scrollToBottom();
    this.focusInput();
  }

  deleteChat(chatId) {
    if (!confirm('Hapus percakapan ini?')) return;
    
    delete this.chatHistory[chatId];
    
    if (this.currentChatId === chatId) {
      this.createNewChat();
    }
    
    this.saveChatHistory();
    this.renderSidebarChats();
  }

  clearAllChats() {
    if (!confirm('Hapus SEMUA riwayat percakapan? Tindakan ini tidak dapat dibatalkan.')) return;
    
    this.chatHistory = {};
    this.saveChatHistory();
    this.createNewChat();
    this.renderSidebarChats();
  }

  exportCurrentChat() {
    const chat = this.chatHistory[this.currentChatId];
    if (!chat) return;
    
    let text = `# ${chat.title}\n`;
    text += `Tanggal: ${new Date(chat.createdAt).toLocaleString('id-ID')}\n`;
    text += `${'='.repeat(40)}\n\n`;
    
    for (const msg of (chat.messages || [])) {
      const role = msg.role === 'user' ? '🧑 Anda' : '🤖 AuraAI';
      text += `**${role}:**\n${msg.content}\n\n`;
      text += `${'-'.repeat(30)}\n\n`;
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auraai-chat-${chat.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── MESSAGE SENDING ───────────────────────────────────────────────────────

  async sendMessage() {
    const text = this.msgInput ? this.msgInput.value.trim() : '';
    
    if (!text && this.pendingImages.length === 0) return;
    if (this.isProcessing) return;
    
    console.log('📤 Sending message:', text);
    
    this.isProcessing = true;
    if (this.sendBtn) this.sendBtn.disabled = true;
    
    // Remove welcome screen if exists
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) welcomeScreen.remove();
    
    // Render user message
    this.renderUserBubble(text, this.pendingImages);
    
    // Update title
    if (text && this.chatHistory[this.currentChatId]) {
      const title = truncateText(text, 40);
      if (this.chatTitle) this.chatTitle.textContent = title;
      this.chatHistory[this.currentChatId].title = title;
      this.chatHistory[this.currentChatId].updatedAt = new Date().toISOString();
    }
    
    // Save images and clear
    const images = [...this.pendingImages];
    this.pendingImages = [];
    this.renderUploadPreview();
    
    // Clear input
    if (this.msgInput) {
      this.msgInput.value = '';
      this.msgInput.style.height = 'auto';
    }
    
    // Show typing indicator
    const typingId = this.showTypingIndicator();
    
    try {
      // Process with AI
      const result = await this.aiCore.processInput(text, images);
      
      // Remove typing indicator
      this.removeTypingIndicator(typingId);
      
      // Save to history
      if (this.chatHistory[this.currentChatId]) {
        if (!this.chatHistory[this.currentChatId].messages) {
          this.chatHistory[this.currentChatId].messages = [];
        }
        this.chatHistory[this.currentChatId].messages.push({
          role: 'user',
          content: text,
          timestamp: new Date().toISOString()
        });
        this.chatHistory[this.currentChatId].messages.push({
          role: 'assistant',
          content: result.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Render response
      if (result.blocked) {
        this.renderSystemBubble(result.message);
      } else {
        this.renderAIBubble(result.message);
      }
      
      this.saveChatHistory();
      this.renderSidebarChats();
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      this.removeTypingIndicator(typingId);
      this.renderSystemBubble('Maaf, terjadi kesalahan. Silakan coba lagi.');
    } finally {
      this.isProcessing = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      this.scrollToBottom();
      this.focusInput();
    }
  }

  // ─── RENDER BUBBLES ────────────────────────────────────────────────────────

  renderWelcomeScreen() {
    if (!this.chatArea) return;
    
    this.chatArea.innerHTML = `
      <div class="welcome" id="welcome-screen">
        <div class="welcome-icon"><i class="ti ti-sparkles"></i></div>
        <h1>Selamat Datang di AuraAI</h1>
        <p class="welcome-subtitle">Asisten AI cerdas yang siap membantu Anda kapan saja</p>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">✍️</div>
            <div class="feature-title">Penulisan</div>
            <div class="feature-desc">Konten & copywriting</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🛠</div>
            <div class="feature-title">Koding</div>
            <div class="feature-desc">Debug & generate</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🌐</div>
            <div class="feature-title">Bahasa</div>
            <div class="feature-desc">Terjemahan akurat</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💡</div>
            <div class="feature-title">Ide</div>
            <div class="feature-desc">Brainstorming</div>
          </div>
        </div>
        <p class="welcome-hint">Mulai dengan mengetik pesan di bawah atau pilih saran</p>
        <div class="suggestion-grid">
          <div class="suggestion-card" data-prompt="Bantu saya menganalisis data penjualan dan berikan rekomendasi strategi">
            <div class="sg-icon">📊</div>
            <div class="sg-content">
              <div class="sg-title">Analisis Data Bisnis</div>
              <div class="sg-desc">Dapatkan insight dari data Anda</div>
            </div>
          </div>
          <div class="suggestion-card" data-prompt="Tuliskan kode Python untuk mengotomatisasi laporan Excel">
            <div class="sg-icon">🐍</div>
            <div class="sg-content">
              <div class="sg-title">Otomatisasi dengan Python</div>
              <div class="sg-desc">Script untuk pekerjaan rutin</div>
            </div>
          </div>
          <div class="suggestion-card" data-prompt="Buatkan rencana konten Instagram untuk bisnis fashion selama 1 bulan">
            <div class="sg-icon">📱</div>
            <div class="sg-content">
              <div class="sg-title">Strategi Konten</div>
              <div class="sg-desc">Rencana posting 30 hari</div>
            </div>
          </div>
          <div class="suggestion-card" data-prompt="Jelaskan konsep machine learning seperti saya baru berusia 10 tahun">
            <div class="sg-icon">🧠</div>
            <div class="sg-content">
              <div class="sg-title">Belajar Hal Baru</div>
              <div class="sg-desc">Penjelasan sederhana & mudah</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderUserBubble(text, images) {
    if (!this.chatArea) return;
    
    const row = document.createElement('div');
    row.className = 'msg-row user';
    
    let imgHTML = '';
    if (images && images.length > 0) {
      for (const img of images) {
        imgHTML += `
          <div class="img-attach">
            <div class="img-attach-thumb">
              <img src="${img.data}" alt="${escapeAttr(img.name || 'Gambar')}">
            </div>
            <div class="img-attach-info">
              <div class="fn">${escapeHtml(img.name || 'Gambar')}</div>
              <div class="fs">${escapeHtml(img.size || '')}</div>
            </div>
          </div>`;
      }
    }
    
    row.innerHTML = `
      <div class="avatar user-av"><i class="ti ti-user"></i></div>
      <div class="bubble user">${imgHTML}${escapeHtml(text || '')}</div>
    `;
    
    this.chatArea.appendChild(row);
    this.scrollToBottom();
  }

  renderAIBubble(text) {
    if (!this.chatArea) return;
    
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.innerHTML = `
      <div class="avatar ai"><i class="ti ti-sparkles"></i></div>
      <div>
        <div class="bubble ai">${formatAIText(text)}</div>
      </div>
    `;
    
    this.chatArea.appendChild(row);
    this.scrollToBottom();
  }

  renderSystemBubble(text) {
    if (!this.chatArea) return;
    
    const row = document.createElement('div');
    row.className = 'msg-row system';
    row.innerHTML = `
      <div class="bubble system">${formatAIText(text)}</div>
    `;
    
    this.chatArea.appendChild(row);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    if (!this.chatArea) return null;
    
    const id = 'typing-' + generateId();
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.id = id;
    row.innerHTML = `
      <div class="avatar ai"><i class="ti ti-sparkles"></i></div>
      <div class="bubble ai">
        <div class="typing-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    `;
    
    this.chatArea.appendChild(row);
    this.scrollToBottom();
    return id;
  }

  removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // ─── IMAGE HANDLING ────────────────────────────────────────────────────────

  handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      this.readAndAddImage(file);
    }
    e.target.value = '';
  }

  handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        this.readAndAddImage(item.getAsFile());
      }
    }
  }

  readAndAddImage(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.pendingImages.push({
        name: file.name || 'pasted-image.png',
        size: this.formatFileSize(file.size),
        data: ev.target.result
      });
      this.renderUploadPreview();
    };
    reader.readAsDataURL(file);
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  renderUploadPreview() {
    if (!this.uploadPreview) return;
    
    this.uploadPreview.innerHTML = '';
    
    if (this.pendingImages.length === 0) {
      this.uploadPreview.style.display = 'none';
      return;
    }
    
    this.uploadPreview.style.display = 'flex';
    
    this.pendingImages.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'upload-thumb';
      thumb.innerHTML = `
        <img src="${img.data}" alt="${escapeAttr(img.name)}">
        <button class="remove-img" data-idx="${idx}">
          <i class="ti ti-x"></i>
        </button>
      `;
      
      thumb.querySelector('.remove-img')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(idx);
      });
      
      this.uploadPreview.appendChild(thumb);
    });
  }

  removeImage(idx) {
    this.pendingImages.splice(idx, 1);
    this.renderUploadPreview();
  }

  // ─── NAVIGATION ────────────────────────────────────────────────────────────

  useSuggestion(text) {
    if (!this.msgInput) return;
    this.msgInput.value = text;
    this.msgInput.focus();
    this.msgInput.style.height = 'auto';
    this.msgInput.style.height = Math.min(this.msgInput.scrollHeight, 150) + 'px';
    this.sendMessage();
  }

  toggleSidebar() {
    if (this.sidebar) this.sidebar.classList.toggle('open');
    if (this.sidebarOverlay) this.sidebarOverlay.classList.toggle('show');
  }

  closeSidebar() {
    if (this.sidebar) this.sidebar.classList.remove('open');
    if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('show');
  }

  openSettings() {
    if (this.settingsModal) this.settingsModal.classList.add('show');
  }

  closeSettings() {
    if (this.settingsModal) this.settingsModal.classList.remove('show');
  }

  // ─── UTILITIES ─────────────────────────────────────────────────────────────

  scrollToBottom() {
    requestAnimationFrame(() => {
      if (this.chatArea) {
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
      }
    });
  }
}

export default ChatManager;
