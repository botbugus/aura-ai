import { chatManager } from './chat.js';
import { SidebarManager } from './sidebar.js';
import { ImageUploadManager } from './image-upload.js';
import { chatStorage } from './storage.js';

class OxCornerApp {
    constructor() {
        // DOM Elements
        this.messagesContainer = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-button');
        this.chatIdBadge = document.getElementById('current-chat-badge');
        this.clock = document.getElementById('clock');

        // Managers
        this.sidebarManager = new SidebarManager();
        this.imageUploadManager = new ImageUploadManager();

        // State
        this.isProcessing = false;
        this.hasMessages = false;

        this.init();
    }

    init() {
        // Inisialisasi chat manager
        chatManager.init();

        // Render pesan awal
        this.renderMessages();

        // Event listeners
        this.sendButton.addEventListener('click', () => this.handleSend());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Chat events
        chatManager.on('chatChanged', (chat) => {
            this.renderMessages();
            this.updateBadge(chat);
        });

        chatManager.on('messageSent', (msg) => {
            this.renderMessage(msg);
            this.scrollToBottom();
        });

        chatManager.on('messageReceived', (msg) => {
            this.renderMessage(msg);
            this.scrollToBottom();
            this.isProcessing = false;
            this.setInputEnabled(true);
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
            this.showToast(error || 'Terjadi kesalahan.', 'error');
            this.isProcessing = false;
            this.setInputEnabled(true);
        });

        chatManager.on('newChatCreated', () => {
            this.renderMessages();
            this.showToast('Chat baru dibuat.', 'success');
        });

        chatManager.on('chatDeleted', (id) => {
            this.renderMessages();
        });

        chatManager.on('allChatsDeleted', () => {
            this.renderMessages();
        });

        // Image upload listener
        document.addEventListener('imageUploaded', (e) => {
            // Handle jika diperlukan
        });

        // Auto-focus input
        this.chatInput.focus();

        // Clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    // Render semua pesan di chat
    renderMessages() {
        const messages = chatManager.getMessages();
        const container = this.messagesContainer;

        // Kosongkan container tapi pertahankan elemen typing indicator jika ada
        const typingIndicator = container.querySelector('.typing-indicator-container');
        container.innerHTML = '';
        if (typingIndicator) {
            container.appendChild(typingIndicator);
        }

        if (!messages || messages.length === 0) {
            // Tampilkan empty state
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
    }

    // Render satu pesan
    renderMessage(msg, animate = true) {
        const container = this.messagesContainer;

        // Hapus empty state jika ada
        const emptyState = container.querySelector('.chat-empty-state');
        if (emptyState) emptyState.remove();

        // Hapus typing indicator
        this.hideTypingIndicator();

        const isUser = msg.role === 'user';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'message-user' : 'message-assistant'}`;
        if (animate) {
            messageDiv.style.animation = 'messageSlideIn 0.35s ease-out';
        }

        // Avatar
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

        // Bubble
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`;

        // Jika ada gambar
        if (msg.image && msg.image.dataUrl) {
            const img = document.createElement('img');
            img.src = msg.image.dataUrl;
            img.className = 'message-image';
            img.alt = msg.image.name || 'Gambar terlampir';
            img.loading = 'lazy';
            bubble.appendChild(img);
        }

        // Teks
        const p = document.createElement('p');
        p.textContent = msg.content || (isUser ? '...' : '(respon kosong)');
        bubble.appendChild(p);

        // Timestamp (optional)
        if (msg.timestamp) {
            const time = document.createElement('div');
            time.style.cssText = 'font-size: 0.6rem; color: var(--ox-muted); margin-top: 4px; opacity: 0.6;';
            time.textContent = chatManager.formatTimestamp(msg.timestamp);
            bubble.appendChild(time);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        container.appendChild(messageDiv);

        // Scroll ke bawah
        this.scrollToBottom();
    }

    // Tampilkan typing indicator
    showTypingIndicator() {
        const container = this.messagesContainer;
        // Hapus yang sudah ada
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
    }

    hideTypingIndicator() {
        const container = this.messagesContainer;
        const existing = container.querySelector('.typing-indicator-container');
        if (existing) existing.remove();
    }

    // Handle send message
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

        // Disable input sementara
        this.setInputEnabled(false);

        // Kirim pesan
        try {
            await chatManager.sendMessage(text, imageData);
            
            // Bersihkan input
            this.chatInput.value = '';
            this.chatInput.style.height = 'auto';
            
            // Hapus preview gambar
            this.imageUploadManager.clearPreview();

        } catch (error) {
            this.showToast(error.message || 'Gagal mengirim pesan.', 'error');
            this.setInputEnabled(true);
        }
    }

    // Set input enabled/disabled
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

    // Update badge chat ID
    updateBadge(chat) {
        if (chat) {
            const chats = chatStorage.getAll();
            const index = chats.findIndex(c => c.id === chat.id);
            this.chatIdBadge.textContent = `Chat #${index + 1}`;
        }
    }

    // Scroll ke bawah
    scrollToBottom() {
        const container = this.messagesContainer;
        container.scrollTop = container.scrollHeight;
    }

    // Update clock
    updateClock() {
        const now = new Date();
        const time = now.toTimeString().split(' ')[0];
        this.clock.textContent = time;
    }

    // Toast (delegasi ke sidebar manager)
    showToast(message, type = 'info') {
        if (this.sidebarManager) {
            this.sidebarManager.showToast(message, type);
        }
    }

    // Auto resize textarea (opsional)
    autoResizeInput() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }
}

// Inisialisasi saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OxCornerApp();
});

// Ekspor untuk debugging
export { OxCornerApp };
