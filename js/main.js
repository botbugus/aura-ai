import { chatManager } from './chat.js';
import { SidebarManager } from './sidebar.js';
import { ImageUploadManager } from './image-upload.js';
import { chatStorage } from './storage.js';
import { deepseekAPI } from './api.js';

class OxCornerApp {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        this.chatIdBadge = document.getElementById('current-chat-badge');
        this.clock = document.getElementById('clock');

        this.sidebarManager = null;
        this.imageUploadManager = null;
        this.isProcessing = false;
        this.hasMessages = false;
        this.initialized = false;

        this.init();
    }

    init() {
        try {
            console.log('🚀 Initializing Ox-Corner AI...');
            console.log('📋 Available models:', deepseekAPI.getModels());

            this.sidebarManager = new SidebarManager();
            this.imageUploadManager = new ImageUploadManager();

            const chat = chatManager.init();
            if (!chat) {
                throw new Error('Gagal menginisialisasi chat manager');
            }

            this.renderMessages();
            this.createModelSelector();

            this.sendButton.addEventListener('click', () => this.handleSend());
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });

            chatManager.on('chatChanged', (chat) => {
                try {
                    this.renderMessages();
                    this.updateBadge(chat);
                } catch (error) {
                    console.error('❌ Chat changed error:', error);
                }
            });

            chatManager.on('messageSent', (msg) => {
                try {
                    this.renderMessage(msg);
                    this.scrollToBottom();
                } catch (error) {
                    console.error('❌ Message sent error:', error);
                }
            });

            chatManager.on('messageReceived', (msg) => {
                try {
                    this.renderMessage(msg);
                    this.scrollToBottom();
                    this.isProcessing = false;
                    this.setInputEnabled(true);
                } catch (error) {
                    console.error('❌ Message received error:', error);
                }
            });

            chatManager.on('processingStart', () => {
                this.isProcessing = true;
                this.setInputEnabled(false);
                this.showTypingIndicator();
            });

            chatManager.on('processingEnd', () => {
                this.isProcessing = false;
                this.setInputEnabled(true);
                this.hideTypingIndicator();
            });

            chatManager.on('error', (error) => {
                console.error('❌ Chat error:', error);
                this.showToast(error || 'Terjadi kesalahan.', 'error');
                this.isProcessing = false;
                this.setInputEnabled(true);
                this.hideTypingIndicator();
            });

            chatManager.on('newChatCreated', () => {
                this.renderMessages();
                this.showToast('Chat baru dibuat.', 'success');
            });

            chatManager.on('modelChanged', (model) => {
                console.log(`📦 Model changed to: ${model}`);
                this.showToast(`Model: ${model}`, 'info');
            });

            this.chatInput.focus();
            this.updateClock();
            setInterval(() => this.updateClock(), 1000);

            this.initialized = true;
            console.log('✅ Ox-Corner AI initialized successfully');

        } catch (error) {
            console.error('❌ Init error:', error);
            this.showToast('Gagal menginisialisasi aplikasi: ' + error.message, 'error');
        }
    }

    createModelSelector() {
        try {
            const models = deepseekAPI.getModels();
            const headerRight = document.querySelector('.chat-header-right');
            
            const selector = document.createElement('select');
            selector.id = 'model-selector';
            selector.style.cssText = `
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--ox-border);
                color: var(--ox-text);
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 0.7rem;
                font-family: var(--font-sans);
                cursor: pointer;
                outline: none;
                margin-right: 8px;
            `;

            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === 'gpt-5.5') {
                    option.selected = true;
                }
                selector.appendChild(option);
            });

            selector.addEventListener('change', (e) => {
                const model = e.target.value;
                if (chatManager.setModel(model)) {
                    this.showToast(`Model diubah ke: ${model}`, 'info');
                } else {
                    this.showToast(`Gagal mengubah model ke: ${model}`, 'error');
                }
            });

            // Insert before badge
            const badge = document.querySelector('.chat-id-badge');
            headerRight.insertBefore(selector, badge);

            // Reasoning effort selector
            const effortSelector = document.createElement('select');
            effortSelector.id = 'effort-selector';
            effortSelector.style.cssText = `
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--ox-border);
                color: var(--ox-text);
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 0.7rem;
                font-family: var(--font-sans);
                cursor: pointer;
                outline: none;
            `;

            const efforts = ['low', 'medium', 'high', 'xhigh'];
            efforts.forEach(level => {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = level.toUpperCase();
                if (level === 'xhigh') {
                    option.selected = true;
                }
                effortSelector.appendChild(option);
            });

            effortSelector.addEventListener('change', (e) => {
                const level = e.target.value;
                if (chatManager.setReasoningEffort(level)) {
                    this.showToast(`Reasoning: ${level}`, 'info');
                }
            });

            headerRight.insertBefore(effortSelector, badge);

        } catch (error) {
            console.error('❌ Create model selector error:', error);
        }
    }

    renderMessages() {
        try {
            const messages = chatManager.getMessages();
            const container = this.messagesContainer;

            const typingIndicator = container.querySelector('.typing-indicator-container');
            container.innerHTML = '';
            if (typingIndicator) {
                container.appendChild(typingIndicator);
            }

            if (!messages || messages.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'chat-empty-state';
                emptyState.innerHTML = `
                    <div class="chat-empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                    <h3>Mulai Percakapan</h3>
                    <p>Kirim pesan untuk memulai interaksi dengan Ox-Corner AI.</p>
                `;
                container.appendChild(emptyState);
                this.hasMessages = false;
                return;
            }

            this.hasMessages = true;
            messages.forEach(msg => {
                this.renderMessage(msg, false);
            });

            this.scrollToBottom();
        } catch (error) {
            console.error('❌ Render messages error:', error);
        }
    }

    renderMessage(msg, animate = true) {
        try {
            const container = this.messagesContainer;

            const emptyState = container.querySelector('.chat-empty-state');
            if (emptyState) emptyState.remove();

            this.hideTypingIndicator();

            const isUser = msg.role === 'user';
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'message-user' : 'message-assistant'}`;
            if (animate) {
                messageDiv.style.animation = 'messageSlideIn 0.35s ease-out';
            }

            const avatar = document.createElement('div');
            avatar.className = `message-avatar ${isUser ? 'message-avatar-user' : 'message-avatar-assistant'}`;
            if (isUser) {
                avatar.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                `;
            } else {
                avatar.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                    </svg>
                `;
            }

            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`;

            if (msg.image && msg.image.dataUrl) {
                const img = document.createElement('img');
                img.src = msg.image.dataUrl;
                img.className = 'message-image';
                img.alt = msg.image.name || 'Gambar terlampir';
                img.loading = 'lazy';
                bubble.appendChild(img);
            }

            const p = document.createElement('p');
            p.textContent = msg.content || (isUser ? '...' : '(respon kosong)');
            
            if (msg.isError) {
                p.style.color = 'var(--ox-danger)';
            }
            
            bubble.appendChild(p);

            if (msg.timestamp) {
                const time = document.createElement('div');
                time.style.cssText = 'font-size: 0.6rem; color: var(--ox-muted); margin-top: 4px; opacity: 0.6;';
                time.textContent = chatManager.formatTimestamp(msg.timestamp);
                bubble.appendChild(time);
            }

            messageDiv.appendChild(avatar);
            messageDiv.appendChild(bubble);
            container.appendChild(messageDiv);

            this.scrollToBottom();
        } catch (error) {
            console.error('❌ Render message error:', error);
        }
    }

    showTypingIndicator() {
        try {
            const container = this.messagesContainer;
            this.hideTypingIndicator();

            const wrapper = document.createElement('div');
            wrapper.className = 'message message-assistant typing-indicator-container';
            wrapper.style.animation = 'messageSlideIn 0.3s ease-out';

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar message-avatar-assistant';
            avatar.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                </svg>
            `;

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble message-bubble-assistant';
            bubble.innerHTML = `
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;

            wrapper.appendChild(avatar);
            wrapper.appendChild(bubble);
            container.appendChild(wrapper);
            this.scrollToBottom();
        } catch (error) {
            console.error('❌ Show typing indicator error:', error);
        }
    }

    hideTypingIndicator() {
        try {
            const container = this.messagesContainer;
            const existing = container.querySelector('.typing-indicator-container');
            if (existing) existing.remove();
        } catch (error) {
            console.error('❌ Hide typing indicator error:', error);
        }
    }

    async handleSend() {
        if (this.isProcessing) {
            this.showToast('Tunggu proses selesai.', 'info');
            return;
        }

        const text = this.chatInput.value.trim();
        const imageData = this.imageUploadManager.getImageData();

        if (!text && !imageData) {
            this.showToast('Masukkan pesan atau gambar.', 'info');
            return;
        }

        this.setInputEnabled(false);

        try {
            await chatManager.sendMessage(text, imageData);
            
            this.chatInput.value = '';
            this.chatInput.style.height = 'auto';
            this.imageUploadManager.clearPreview();

        } catch (error) {
            console.error('❌ Handle send error:', error);
            this.showToast(error.message || 'Gagal mengirim pesan.', 'error');
            this.setInputEnabled(true);
        }
    }

    setInputEnabled(enabled) {
        this.chatInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        if (enabled) {
            this.chatInput.focus();
            this.sendButton.querySelector('.send-icon').classList.remove('hidden');
            this.sendButton.querySelector('.spinner-icon').classList.add('hidden');
        } else {
            this.sendButton.querySelector('.send-icon').classList.add('hidden');
            this.sendButton.querySelector('.spinner-icon').classList.remove('hidden');
        }
    }

    updateBadge(chat) {
        try {
            if (chat) {
                const chats = chatStorage.getAll();
                const index = chats.findIndex(c => c.id === chat.id);
                this.chatIdBadge.textContent = `Chat #${index + 1}`;
            }
        } catch (error) {
            console.error('❌ Update badge error:', error);
        }
    }

    scrollToBottom() {
        try {
            const container = this.messagesContainer;
            container.scrollTop = container.scrollHeight;
        } catch (error) {
            console.error('❌ Scroll error:', error);
        }
    }

    updateClock() {
        try {
            const now = new Date();
            const time = now.toTimeString().split(' ')[0];
            this.clock.textContent = time;
        } catch (error) {
            console.error('❌ Clock error:', error);
        }
    }

    showToast(message, type = 'info') {
        if (this.sidebarManager && this.sidebarManager.showToast) {
            this.sidebarManager.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new OxCornerApp();
    } catch (error) {
        console.error('❌ Fatal error:', error);
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#f87171;font-family:system-ui;padding:20px;text-align:center;flex-direction:column;gap:16px;">
                <h1 style="font-size:24px;">⚠️ Gagal Memuat Aplikasi</h1>
                <p style="color:#6b6b80;max-width:400px;">${error.message || 'Terjadi kesalahan fatal. Periksa console untuk detail.'}</p>
                <button onclick="location.reload()" style="padding:10px 24px;border-radius:10px;background:#c084fc;border:none;color:#fff;cursor:pointer;font-weight:500;">Muat Ulang</button>
            </div>
        `;
    }
});

export { OxCornerApp };
