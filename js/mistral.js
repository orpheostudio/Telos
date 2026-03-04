// js/mistral.js
export class MistralAI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.mistral.ai/v1/chat/completions';
    }

    async sendMessage(messages, onChunk) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2000,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) {
                                fullResponse += content;
                                if (onChunk) onChunk(content);
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                }
            }

            return fullResponse;
        } catch (error) {
            console.error('Mistral API error:', error);
            throw error;
        }
    }

    async analyzeSentiment(text) {
        const messages = [
            {
                role: 'system',
                content: 'Analyze the sentiment of the following text. Return only "positive", "negative", or "neutral".'
            },
            {
                role: 'user',
                content: text
            }
        ];

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages: messages,
                    temperature: 0.3,
                    max_tokens: 10
                })
            });

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            return 'neutral';
        }
    }
}
