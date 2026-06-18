import { API_CONFIG } from './config.js';

export class DeepSeekAPI {
    constructor() {
        this.apiKey = API_CONFIG.apiKey;
        this.baseUrl = API_CONFIG.baseUrl;
        this.model = API_CONFIG.model;
        this.systemPrompt = API_CONFIG.systemPrompt;
        this.isProcessing = false;
    }

    async sendMessage(messages, onChunk = null) {
        if (this.isProcessing) {
            throw new Error('Sistem sedang memproses permintaan sebelumnya.');
        }

        this.isProcessing = true;

        try {
            // Format payload sesuai dengan OpenAI API format (wire_api = "responses")
            const payload = {
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    ...messages
                ],
                stream: false,
                reasoning_effort: this.reasoningEffort || 'xhigh'
            };

            // Gunakan endpoint /chat/completions (standar OpenAI)
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Respon API tidak valid: struktur data tidak sesuai.');
            }

            const content = data.choices[0].message.content;
            return content;

        } catch (error) {
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    // Metode untuk streaming (jika endpoint mendukung)
    async sendMessageStream(messages, onChunk) {
        // Untuk sekarang menggunakan non-streaming karena endpoint mungkin tidak support streaming
        const content = await this.sendMessage(messages);
        if (onChunk) onChunk(content);
        return content;
    }
}

export const deepseekAPI = new DeepSeekAPI();
