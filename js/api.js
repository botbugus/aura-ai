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
            // Format payload sesuai dengan OpenAI API format
            const payload = {
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    ...messages
                ],
                stream: false,
                reasoning_effort: 'xhigh'
            };

            console.log('🚀 Sending request to:', `${this.baseUrl}/chat/completions`);
            console.log('📦 Payload:', JSON.stringify(payload, null, 2));

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    console.error('❌ Error response:', errorData);
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                } catch (e) {
                    const text = await response.text();
                    console.error('❌ Error text:', text);
                    errorMessage = text || errorMessage;
                }
                throw new Error(`API Error: ${errorMessage}`);
            }

            const data = await response.json();
            console.log('✅ Response data:', data);
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('❌ Invalid response structure:', data);
                throw new Error('Respon API tidak valid: struktur data tidak sesuai.');
            }

            const content = data.choices[0].message.content;
            return content;

        } catch (error) {
            console.error('❌ API Error caught:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async sendMessageStream(messages, onChunk) {
        const content = await this.sendMessage(messages);
        if (onChunk) onChunk(content);
        return content;
    }
}

export const deepseekAPI = new DeepSeekAPI();
