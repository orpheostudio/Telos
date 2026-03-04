// js/app.js
import { AuthManager } from './auth.js';
import { CreditsManager } from './credits.js';
import { MistralAI } from './mistral.js';
import { supabase } from './supabase.js';

class TelosAI {
    constructor() {
        this.auth = new AuthManager();
        this.currentUser = null;
        this.creditsManager = null;
        this.mistral = new MistralAI(config.mistral.apiKey);
        this.currentChat = [];
        this.init();
    }

    async init() {
        // Check current user
        this.currentUser = await this.auth.getCurrentUser();
        
        if (this.currentUser) {
            this.creditsManager = new CreditsManager(this.currentUser.id);
            
            // Load user profile
            const profile = await this.auth.getUserProfile(this.currentUser.id);
            if (profile) {
                this.updateUIWithUserData(profile);
            }
        }

        // Setup real-time subscriptions
        this.setupSubscriptions();
    }

    setupSubscriptions() {
        if (!this.currentUser) return;

        // Subscribe to profile changes
        const profileSubscription = supabase
            .channel('profile_changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${this.currentUser.id}`
            }, payload => {
                this.updateUIWithUserData(payload.new);
            })
            .subscribe();
    }

    updateUIWithUserData(profile) {
        // Update credits display
        const creditsElement = document.getElementById('credits-display');
        if (creditsElement) {
            creditsElement.textContent = `Credits: ${profile.credits}`;
        }

        // Update user name
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = profile.full_name || 'User';
        }
    }

    async sendMessage(message) {
        if (!this.currentUser) {
            alert('Please log in to continue');
            return;
        }

        // Check credits
        const credits = await this.creditsManager.getAvailableCredits();
        if (credits <= 0) {
            alert('Insufficient credits. Please purchase more credits to continue.');
            return;
        }

        // Add user message to chat
        this.addMessageToUI('user', message);
        this.currentChat.push({ role: 'user', content: message });

        try {
            // Use credits (1 credit per message)
            const creditUsage = await this.creditsManager.useCredits(1, 'Chat message');
            if (!creditUsage.success) {
                throw new Error(creditUsage.error);
            }

            // Show loading indicator
            this.showLoading();

            // Send to Mistral AI
            const aiResponse = await this.mistral.sendMessage(
                this.currentChat,
                (chunk) => {
                    this.updateAIMessage(chunk);
                }
            );

            // Hide loading
            this.hideLoading();

            // Add AI response to chat
            this.currentChat.push({ role: 'assistant', content: aiResponse });

            // Save chat to database
            await this.saveChat();

        } catch (error) {
            this.hideLoading();
            this.showError('Error sending message: ' + error.message);
        }
    }

    addMessageToUI(role, content) {
        const chatContainer = document.getElementById('chat-messages');
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${role === 'user' ? '👤' : '🤖'}
            </div>
            <div class="message-content">
                ${this.escapeHTML(content)}
            </div>
        `;

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    updateAIMessage(chunk) {
        const lastMessage = document.querySelector('.assistant-message:last-child .message-content');
        if (lastMessage) {
            lastMessage.innerHTML += this.escapeHTML(chunk);
        } else {
            this.addMessageToUI('assistant', chunk);
        }
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.id = 'loading-indicator';
        loadingDiv.innerHTML = '<div class="spinner"></div><span>AI is thinking...</span>';
        document.getElementById('chat-messages')?.appendChild(loadingDiv);
    }

    hideLoading() {
        document.getElementById('loading-indicator')?.remove();
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.getElementById('chat-messages')?.appendChild(errorDiv);
    }

    async saveChat() {
        try {
            const { error } = await supabase
                .from('chat_history')
                .insert([
                    {
                        user_id: this.currentUser.id,
                        title: this.currentChat[0]?.content.substring(0, 50) || 'New Chat',
                        messages: this.currentChat,
                        created_at: new Date()
                    }
                ]);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving chat:', error);
        }
    }

    async loadChatHistory() {
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    }
}

// Initialize app
const app = new TelosAI();
