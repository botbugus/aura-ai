import { chatStorage } from './storage.js';
import { chatManager } from './chat.js';

export class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.chatList = document.getElementById('chat-list');
        this.overlay = document.getElementById('sidebar-overlay');
        this.toggleBtn = document.getElementById('sidebar-toggle');
        this.newChatSidebarBtn = document.getElementById('btn-new-chat-sidebar');
        this.newChatNavBtn = document.getElementById('btn-new-chat-nav');
        this.clearAllBtn = document.getElementById('btn-clear-all');
        this.isOpen = window.innerWidth > 768;

        this.init();
    }

    init() {
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.overlay.addEventListener('click', () => this.close());

        this.newChatSidebarBtn.addEventListener('click', () => {
            chatManager.createNewChat('Chat Baru');
            this.render();
            if (window.innerWidth <= 768) this.close();
        });

        this.newChatNavBtn.addEventListener('click', () => {
            chatManager.createNewChat('Chat Baru');
            this.render();
            if (window.innerWidth <= 768) this.close();
        });

        this.clearAllBtn.addEventListener('click', () => {
            if (chatStorage.getAll().length === 0) {
                this.showToast('Tidak ada chat untuk dihapus.', 'info');
                return;
            }
            this.showModal('Hapus semua chat?', 'Semua riwayat percakapan akan dihapus permanen.', () => {
                chatManager.deleteAllChats();
                this.render();
                this.showToast('Semua chat berhasil dihapus.', 'success');
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.isOpen = true;
                this.sidebar.classList.remove('closed', 'open');
                this.overlay.classList.remove('visible');
            } else {
                this.isOpen = false;
                this.sidebar.classList.add('closed');
                this.sidebar.classList.remove('open');
            }
        });

        if (window.innerWidth <= 768) {
            this.isOpen = false;
            this.sidebar.classList.add('closed');
        }

        this.render();

        chatManager.on('chatChanged', () => this.render());
        chatManager.on('newChatCreated', () => this.render());
        chatManager.on('chatDeleted', () => this.render());
        chatManager.on('allChatsDeleted', () => this.render());
        chatManager.on('chatUpdated', () => this.render());
    }

    toggle() {
        if (window.innerWidth <= 768) {
            this.isOpen = !this.isOpen;
            this.sidebar.classList.toggle('open');
            this.sidebar.classList.toggle('closed');
            this.overlay.classList.toggle('visible');
        }
    }

    close() {
        if (window.innerWidth <= 768) {
            this.isOpen = false;
            this.sidebar.classList.remove('open');
            this.sidebar.classList.add('closed');
            this.overlay.classList.remove('visible');
        }
    }

    render() {
        const chats = chatStorage.getChatsWithPreview();
        const currentId = chatManager.currentChatId;

        const items = this.chatList.querySelectorAll('.chat-item');
        items.forEach(item => item.remove());

        if (chats.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'chat-empty-state';
            emptyMsg.style.padding = '40px 20px';
            emptyMsg.innerHTML = `
                <p style="color: var(--ox-muted); font-size: 0.8rem; text-align: center;">
                    Belum ada percakapan.<br>Mulai chat baru dengan klik <strong>+</strong>.
                </p>
            `;
            this.chatList.appendChild(emptyMsg);
            return;
        }

        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-item${chat.id === currentId ? ' active' : ''}`;
            item.dataset.chatId = chat.id;

            const icon = document.createElement('div');
            icon.className = 'chat-item-icon';
            icon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            `;

            const content = document.createElement('div');
            content.className = 'chat-item-content';
            content.innerHTML = `
                <span class="chat-item-title">${chat.title || 'Chat Tanpa Judul'}</span>
                <span class="chat-item-preview">${chat.preview || 'Percakapan kosong'}</span>
            `;

            const delBtn = document.createElement('button');
            delBtn.className = 'chat-item-delete';
            delBtn.dataset.deleteId = chat.id;
            delBtn.setAttribute('aria-label', 'Hapus chat');
            delBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            `;
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDelete(chat.id);
            });

            item.appendChild(icon);
            item.appendChild(content);
            item.appendChild(delBtn);

            item.addEventListener('click', () => {
                chatManager.switchChat(chat.id);
                this.render();
                if (window.innerWidth <= 768) this.close();
            });

            this.chatList.appendChild(item);
        });
    }

    handleDelete(chatId) {
        const chat = chatStorage.getById(chatId);
        if (!chat) return;

        this.showModal(
            'Hapus Percakapan?',
            `Apakah Anda yakin ingin menghapus "${chat.title || 'Chat'}"?`,
            () => {
                chatManager.deleteChat(chatId);
                this.render();
                this.showToast('Chat berhasil dihapus.', 'success');
            }
        );
    }

    showModal(title, message, onConfirm) {
        const overlay = document.getElementById('modal-overlay');
        const msgEl = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        document.querySelector('.modal-header h3').textContent = title;
        msgEl.textContent = message;

        overlay.classList.remove('hidden');

        const cleanup = () => {
            overlay.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const handleConfirm = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        const handleCancel = () => {
            cleanup();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.log(`[${type}] ${message}`);
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            success: '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>',
            error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
            info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
        };

        toast.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${iconMap[type] || iconMap.info}
            </svg>
            <span class="toast-message">${message}</span>
            <button class="toast-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        });

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
                }
