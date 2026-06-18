// Manajemen penyimpanan riwayat chat menggunakan localStorage
export class ChatStorage {
    constructor() {
        this.STORAGE_KEY = 'ox_corner_chats';
        this.chats = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.chats));
    }

    getAll() {
        return this.chats;
    }

    getById(id) {
        return this.chats.find(c => c.id === id) || null;
    }

    create(title = 'Chat Baru') {
        const chat = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            title: title,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [
                {
                    role: 'assistant',
                    content: 'Sistem Ox-Corner AI aktif. Siap menerima perintah. Anda dapat mengirim teks, gambar, atau perintah eksekusi.',
                    timestamp: Date.now()
                }
            ]
        };
        this.chats.unshift(chat);
        this.save();
        return chat;
    }

    update(id, messages, title = null) {
        const chat = this.getById(id);
        if (!chat) return null;
        chat.messages = messages;
        chat.updatedAt = Date.now();
        if (title) chat.title = title;
        this.save();
        return chat;
    }

    delete(id) {
        this.chats = this.chats.filter(c => c.id !== id);
        this.save();
    }

    deleteAll() {
        this.chats = [];
        this.save();
    }

    getChatsWithPreview() {
        return this.chats.map(chat => {
            const lastMsg = chat.messages.filter(m => m.role === 'assistant').pop();
            const preview = lastMsg 
                ? lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '')
                : 'Percakapan kosong';
            return {
                ...chat,
                preview: preview,
                messageCount: chat.messages.length
            };
        });
    }
}

// Inisialisasi instance global
export const chatStorage = new ChatStorage();
