import { chatStorage } from './storage.js';
import { deepseekAPI } from './api.js';

export class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.isProcessing = false;
        this.messageQueue = [];
        this.listeners = {};
        this.maxRetries = 3;
        this.retryDelay = 1500;
        this.currentModel = 'gpt-5.5';
        this.reasoningEffort = 'xhigh';
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`❌ Error in event ${event}:`, e);
                }
            });
        }
    }

    // Set model
    setModel(modelName) {
        if (deepseekAPI.setModel(modelName)) {
            this.currentModel = modelName;
            this.emit('modelChanged', modelName);
            return true;
        }
        return false;
    }

    setReasoningEffort(level) {
        const validLevels = ['low', 'medium', 'high', 'xhigh'];
        if (validLevels.includes(level)) {
            this.reasoningEffort = level;
            this.emit('reasoningChanged', level);
            return true;
        }
        return false;
    }

    init() {
        try {
            const chats = chatStorage.getAll();
            if (chats.length === 0) {
                const newChat = chatStorage.create('Chat Baru');
                this.currentChatId = newChat.id;
            } else {
                this.currentChatId = chats[0].id;
            }
            this.emit('chatChanged', this.getCurrentChat());
            this.emit('modelChanged', this.currentModel);
            this.emit('reasoningChanged', this.reasoningEffort);
            return this.getCurrentChat();
        } catch (error) {
            console.error('❌ Init error:', error);
            this.emit('error', 'Gagal menginisialisasi chat: ' + error.message);
            return null;
        }
    }

    getCurrentChat() {
        try {
            return chatStorage.getById(this.currentChatId);
        } catch (error) {
            console.error('❌ Get current chat error:', error);
            return null;
        }
    }

    getMessages() {
        const chat = this.getCurrentChat();
        return chat ? chat.messages : [];
    }

    createNewChat(title = 'Chat Baru') {
        try {
            const newChat = chatStorage.create(title);
            this.currentChatId = newChat.id;
            this.emit('chatChanged', newChat);
            this.emit('newChatCreated', newChat);
            return newChat;
        } catch (error) {
            console.error('❌ Create chat error:', error);
            this.emit('error', 'Gagal membuat chat baru: ' + error.message);
            return null;
        }
    }

    switchChat(chatId) {
        try {
            const chat = chatStorage.getById(chatId);
            if (!chat) {
                throw new Error('Chat tidak ditemukan');
            }
            this.currentChatId = chatId;
            this.emit('chatChanged', chat);
            return chat;
        } catch (error) {
            console.error('❌ Switch chat error:', error);
            this.emit('error', 'Gagal beralih chat: ' + error.message);
            return null;
        }
    }

    deleteChat(chatId) {
        try {
            const chats = chatStorage.getAll();
            if (chats.length <= 1) {
                const newChat = this.createNewChat('Chat Baru');
                chatStorage.delete(chatId);
                this.currentChatId = newChat.id;
                this.emit('chatChanged', newChat);
                this.emit('chatDeleted', chatId);
                return newChat;
            }

            chatStorage.delete(chatId);
            
            if (this.currentChatId === chatId) {
                const remaining = chatStorage.getAll();
                if (remaining.length > 0) {
                    this.currentChatId = remaining[0].id;
                    this.emit('chatChanged', remaining[0]);
                }
            }
            this.emit('chatDeleted', chatId);
            return this.getCurrentChat();
        } catch (error) {
            console.error('❌ Delete chat error:', error);
            this.emit('error', 'Gagal menghapus chat: ' + error.message);
            return null;
        }
    }

    deleteAllChats() {
        try {
            chatStorage.deleteAll();
            const newChat = chatStorage.create('Chat Baru');
            this.currentChatId = newChat.id;
            this.emit('chatChanged', newChat);
            this.emit('allChatsDeleted');
            return newChat;
        } catch (error) {
            console.error('❌ Delete all chats error:', error);
            this.emit('error', 'Gagal menghapus semua chat: ' + error.message);
            return null;
        }
    }

    async sendMessageWithRetry(messages, retryCount = 0) {
        try {
            return await deepseekAPI.sendMessage(messages, {
                model: this.currentModel,
                reasoningEffort: this.reasoningEffort
            });
        } catch (error) {
            if (retryCount < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(1.5, retryCount);
                console.log(`🔄 Retry ${retryCount + 1}/${this.maxRetries} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendMessageWithRetry(messages, retryCount + 1);
            }
            throw error;
        }
    }

    async sendMessage(content, imageData = null) {
        if (this.isProcessing) {
            this.emit('error', 'Sistem sedang memproses permintaan sebelumnya. Mohon tunggu.');
            return;
        }

        if (!content && !imageData) {
            this.emit('error', 'Pesan atau gambar diperlukan.');
            return;
        }

        const chat = this.getCurrentChat();
        if (!chat) {
            this.emit('error', 'Tidak ada chat yang aktif. Buat chat baru terlebih dahulu.');
            return;
        }

        let userMessage = { 
            role: 'user', 
            content: content || '',
            timestamp: Date.now()
        };

        if (imageData) {
            userMessage.image = imageData;
            if (content) {
                userMessage.content = `${content}\n[Gambar terlampir: ${imageData.name || 'image'}]`;
            } else {
                userMessage.content = `[Gambar terlampir: ${imageData.name || 'image'}]`;
            }
        }

        try {
            chat.messages.push(userMessage);
            chatStorage.update(chat.id, chat.messages);
            this.emit('messageSent', userMessage);

            if (chat.messages.filter(m => m.role === 'user').length === 1 && content) {
                const newTitle = content.substring(0, 40) + (content.length > 40 ? '...' : '');
                chat.title = newTitle;
                chatStorage.update(chat.id, chat.messages, newTitle);
                this.emit('chatUpdated', chat);
            }

            this.isProcessing = true;
            this.emit('processingStart');

            const apiMessages = chat.messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role,
                    content: m.content || '...'
                }));

            const response = await this.sendMessageWithRetry(apiMessages);

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
            console.error('❌ Send message error:', error);
            
            const errorMessage = {
                role: 'assistant',
                content: `⚠️ Error: ${error.message || 'Gagal mengirim pesan. Periksa koneksi dan API key.'}`,
                timestamp: Date.now(),
                isError: true
            };

            chat.messages.push(errorMessage);
            chatStorage.update(chat.id, chat.messages);
            this.emit('messageReceived', errorMessage);
            this.emit('error', error.message || 'Gagal mengirim pesan');

            return errorMessage;

        } finally {
            this.isProcessing = false;
            this.emit('processingEnd');
        }
    }

    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '--:--';
        }
    }
}

export const chatManager = new ChatManager();
