import { API_CONFIG } from './config.js';

export class DeepSeekAPI {
    constructor() {
        this.apiKey = API_CONFIG.apiKey;
        this.baseUrl = API_CONFIG.baseUrl;
        this.model = API_CONFIG.model;
        this.availableModels = API_CONFIG.availableModels;
        this.systemPrompt = API_CONFIG.systemPrompt;
        this.isProcessing = false;
    }

    // Ganti model
    setModel(modelName) {
        if (this.availableModels[modelName]) {
            this.model = modelName;
            console.log(`🔄 Model changed to: ${modelName}`);
            return true;
        }
        console.error(`❌ Model "${modelName}" not found`);
        return false;
    }

    async sendMessage(messages, options = {}) {
        if (this.isProcessing) {
            throw new Error('Sistem sedang memproses permintaan sebelumnya.');
        }

        this.isProcessing = true;

        const modelToUse = options.model || this.model;
        const reasoningEffort = options.reasoningEffort || 'xhigh';

        try {
            const payload = {
                model: modelToUse,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    ...messages
                ],
                stream: false,
                store: false,
                reasoning_effort: reasoningEffort
            };

            console.log('🚀 Sending request to:', `${this.baseUrl}/chat/completions`);
            console.log('📦 Model:', modelToUse);
            console.log('📦 Reasoning:', reasoningEffort);

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
                    errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
                } catch (e) {
                    const text = await response.text();
                    console.error('❌ Error text:', text);
                    errorMessage = text || errorMessage;
                }
                throw new Error(`API Error: ${errorMessage}`);
            }

            const data = await response.json();
            console.log('✅ Response received');
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('❌ Invalid response structure:', data);
                throw new Error('Respon API tidak valid: struktur data tidak sesuai.');
            }

            const content = data.choices[0].message.content;
            
            // Track usage jika ada
            if (data.usage) {
                console.log('📊 Token usage:', data.usage);
            }
            
            return content;

        } catch (error) {
            console.error('❌ API Error caught:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async sendMessageStream(messages, onChunk, options = {}) {
        const content = await this.sendMessage(messages, options);
        if (onChunk) onChunk(content);
        return content;
    }

    // Validasi model
    isValidModel(modelName) {
        return !!this.availableModels[modelName];
    }

    // Dapatkan daftar model
    getModels() {
        return Object.keys(this.availableModels).map(key => ({
            id: key,
            name: this.availableModels[key].name,
            context: this.availableModels[key].context,
            output: this.availableModels[key].output
        }));
    }
}

export const deepseekAPI = new DeepSeekAPI();
