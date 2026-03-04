// js/credits.js
import { supabase } from './supabase.js';

export class CreditsManager {
    constructor(userId) {
        this.userId = userId;
        this.supabase = supabase;
    }

    async getAvailableCredits() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('credits, daily_credits_used, last_credit_reset')
                .eq('id', this.userId)
                .single();

            if (error) throw error;

            // Check if we need to reset daily credits
            await this.checkAndResetDailyCredits(data);
            
            return data.credits;
        } catch (error) {
            console.error('Error getting credits:', error);
            return 0;
        }
    }

    async checkAndResetDailyCredits(profile) {
        const lastReset = new Date(profile.last_credit_reset);
        const now = new Date();
        
        // Reset if it's a new day
        if (lastReset.toDateString() !== now.toDateString()) {
            const { error } = await this.supabase
                .from('profiles')
                .update({
                    daily_credits_used: 0,
                    last_credit_reset: now
                })
                .eq('id', this.userId);

            if (error) console.error('Error resetting daily credits:', error);
        }
    }

    async useCredits(amount, description = 'Chat interaction') {
        try {
            // Check current credits
            const { data: profile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('credits')
                .eq('id', this.userId)
                .single();

            if (fetchError) throw fetchError;

            if (profile.credits < amount) {
                return { success: false, error: 'Insufficient credits' };
            }

            // Update credits
            const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ 
                    credits: profile.credits - amount,
                    daily_credits_used: this.supabase.raw('daily_credits_used + ?', [amount])
                })
                .eq('id', this.userId);

            if (updateError) throw updateError;

            // Record transaction
            await this.recordTransaction(amount, 'usage', description);

            // Update usage tokens
            await this.updateUsageTokens(amount);

            return { success: true, remainingCredits: profile.credits - amount };
        } catch (error) {
            console.error('Error using credits:', error);
            return { success: false, error: error.message };
        }
    }

    async addCredits(amount, description = 'Credit purchase') {
        try {
            const { data: profile, error: fetchError } = await this.supabase
                .from('profiles')
                .select('credits')
                .eq('id', this.userId)
                .single();

            if (fetchError) throw fetchError;

            const { error: updateError } = await this.supabase
                .from('profiles')
                .update({ credits: profile.credits + amount })
                .eq('id', this.userId);

            if (updateError) throw updateError;

            await this.recordTransaction(amount, 'purchase', description);

            return { success: true, newBalance: profile.credits + amount };
        } catch (error) {
            console.error('Error adding credits:', error);
            return { success: false, error: error.message };
        }
    }

    async recordTransaction(amount, type, description) {
        const { error } = await this.supabase
            .from('credit_transactions')
            .insert([
                {
                    user_id: this.userId,
                    amount: type === 'usage' ? -amount : amount,
                    transaction_type: type,
                    description: description
                }
            ]);

        if (error) console.error('Error recording transaction:', error);
    }

    async updateUsageTokens(tokensUsed) {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await this.supabase
            .from('usage_tokens')
            .upsert({
                user_id: this.userId,
                token_type: 'daily',
                tokens_used: this.supabase.raw('tokens_used + ?', [tokensUsed]),
                date: today
            }, {
                onConflict: 'user_id,date,token_type'
            });

        if (error) console.error('Error updating usage tokens:', error);
    }

    async getUsageStats() {
        try {
            const { data, error } = await this.supabase
                .from('usage_tokens')
                .select('*')
                .eq('user_id', this.userId)
                .order('date', { ascending: false })
                .limit(30);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return [];
        }
    }
}
