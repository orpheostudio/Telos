// js/auth.js
import { supabase } from './supabase.js';

export class AuthManager {
    constructor() {
        this.supabase = supabase;
    }

    async signInWithGoogle() {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/welcome.html',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Google sign-in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithEmail(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Email sign-in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signUp(email, password, fullName) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            
            if (error) throw error;
            
            // Create profile
            if (data.user) {
                await this.createUserProfile(data.user.id, email, fullName);
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Sign-up error:', error);
            return { success: false, error: error.message };
        }
    }

    async createUserProfile(userId, email, fullName) {
        const { error } = await this.supabase
            .from('profiles')
            .insert([
                {
                    id: userId,
                    email: email,
                    full_name: fullName,
                    credits: config.app.dailyFreeCredits,
                    subscription_tier: 'free'
                }
            ]);
        
        if (error) console.error('Error creating profile:', error);
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            window.location.href = '/landing.html';
            return { success: true };
        } catch (error) {
            console.error('Sign-out error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        const { data: { user }, error } = await this.supabase.auth.getUser();
        if (error) {
            console.error('Error getting user:', error);
            return null;
        }
        return user;
    }

    async getUserProfile(userId) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error getting profile:', error);
            return null;
        }
        return data;
    }
}
