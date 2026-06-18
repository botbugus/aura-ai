import { chatStorage } from './storage.js';
import { deepseekAPI } from './api.js';

export class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.isProcessing = false;
        this.messageQueue = [];
        this.listeners = [];
    }

    // Event system
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // Initialize dengan chat pertama atau buat baru
    init() {
        const chats = chatStorage.getAll();
        if (chats.length === 0) {
            const newChat = chatStorage.create('Chat Baru');
            this.currentChatId = newChat.id;
        } else {
            this.currentChatId = chats[0].id;
        }
        this.emit('chatChanged', this.getCurrentChat());
        return this.getCurrentChat();
    }

    getCurrentChat() {
        return chatStorage.getById(this.currentChatId);
    }

    getMessages() {
        const chat = this.getCurrentChat();
        return chat ? chat.messages : [];
    }

    // Buat chat baru
    createNewChat(title = 'Chat Baru') {
        const newChat = chatStorage.create(title);
        this.currentChatId = newChat.id;
        this.emit('chatChanged', newChat);
        this.emit('newChatCreated', newChat);
        return newChat;
    }

    // Pindah ke chat lain
    switchChat(chatId) {
        const chat = chatStorage.getById(chatId);
        if (!chat) return null;
        this.currentChatId = chatId;
        this.emit('chatChanged', chat);
        return chat;
    }

    // Hapus chat
    deleteChat(chatId) {
        const chats = chatStorage.getAll();
        if (chats.length <= 1) {
            // Jika hanya satu chat, buat baru lalu hapus yang lama
            const newChat = this.createNewChat('Chat Baru');
            chatStorage.delete(chatId);
            this.currentChatId = newChat.id;
            this.emit('chatChanged', newChat);
            this.emit('chatDeleted', chatId);
            return newChat;
        }

        chatStorage.delete(chatId);
        
        // Jika yang dihapus adalah chat aktif, pindah ke chat pertama
        if (this.currentChatId === chatId) {
            const remaining = chatStorage.getAll();
            if (remaining.length > 0) {
                this.currentChatId = remaining[0].id;
                this.emit('chatChanged', remaining[0]);
            }
        }
        this.emit('chatDeleted', chatId);
        return this.getCurrentChat();
    }

    // Hapus semua chat
    deleteAllChats() {
        chatStorage.deleteAll();
        const newChat = chatStorage.create('Chat Baru');
        this.currentChatId = newChat.id;
        this.emit('chatChanged', newChat);
        this.emit('allChatsDeleted');
        return newChat;
    }

    // Kirim pesan
    async sendMessage(content, imageData = null) {
        if (this.isProcessing) {
            this.emit('error', 'Sistem sedang memproses permintaan sebelumnya.');
            return;
        }

        if (!content && !imageData) {
            this.emit('error', 'Pesan atau gambar diperlukan.');
            return;
        }

        const chat = this.getCurrentChat();
        if (!chat) {
            this.emit('error', 'Tidak ada chat yang aktif.');
            return;
        }

        // Siapkan pesan user
        let userMessage = { 
            role: 'user', 
            content: content || '',
            timestamp: Date.now()
        };

        // Jika ada gambar, tambahkan ke content
        if (imageData) {
            userMessage.image = imageData;
            if (content) {
                userMessage.content = `${content}\n[Gambar terlampir]`;
            } else {
                userMessage.content = '[Gambar terlampir]';
            }
        }

        // Tambahkan ke chat
        chat.messages.push(userMessage);
        chatStorage.update(chat.id, chat.messages);
        this.emit('messageSent', userMessage);

        // Update title chat jika ini pesan pertama dari user
        if (chat.messages.filter(m => m.role === 'user').length === 1 && content) {
            const newTitle = content.substring(0, 40) + (content.length > 40 ? '...' : '');
            chat.title = newTitle;
            chatStorage.update(chat.id, chat.messages, newTitle);
            this.emit('chatUpdated', chat);
        }

        // Proses dengan AI
        this.isProcessing = true;
        this.emit('processingStart');

        try {
            // Siapkan history untuk API (tanpa image karena API tidak support gambar)
            const apiMessages = chat.messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role,
                    content: m.content || '...'
                }));

            // Jika ada gambar, tambahkan indikator ke sistem
            if (imageData) {
                apiMessages[apiMessages.length - 1].content = 
                    `${apiMessages[apiMessages.length - 1].content} [Gambar: ${imageData.name || 'image'}]`;
            }

            const response = await deepseekAPI.sendMessage(apiMessages);

            // Tambahkan respon assistant
            const assistantMessage = {
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };

            chat.messages.push(assistantMessage);
            chatStorage.update(chat.id, chat.messages);
            this.emit('messageReceived', assistantMessage);

            return assistantMessage;

        } catch (error) {
            console.error('API Error:', error);
            
            // Tambahkan pesan error sebagai respon
            const errorMessage = {
                role: 'assistant',
                content: `⚠️ Error: ${error.message || 'Gagal terhubung ke API DeepSeek.'}`,
                timestamp: Date.now(),
                isError: true
            };

            chat.messages.push(errorMessage);
            chatStorage.update(chat.id, chat.messages);
            this.emit('messageReceived', errorMessage);
            this.emit('error', error.message);

            return errorMessage;

        } finally {
            this.isProcessing = false;
            this.emit('processingEnd');
        }
    }

    // Format timestamp
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
}

export const chatManager = new ChatManager();
