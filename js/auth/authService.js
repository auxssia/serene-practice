import { supabaseClient } from '../core/supabaseClient.js';

export const authService = {
    async getSession() {
        return await supabaseClient.auth.getSession();
    },
    async signUp(email, password, fullName) {
        return await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
    },
    async signIn(email, password) {
        return await supabaseClient.auth.signInWithPassword({ email, password });
    },
    async signOut() {
        return await supabaseClient.auth.signOut();
    },
    async updateProfile(newName) {
        return await supabaseClient.auth.updateUser({ data: { full_name: newName } });
    }
};
