import { supabaseClient } from '../core/supabaseClient.js';

export const clientService = {
    async getClients(userId) {
        if (!userId) return { data: [], error: 'User ID is required' };
        return await supabaseClient
            .from('clients')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });
    },

    async findClientByName(userId, name) {
        if (!userId || !name) return { data: null, error: 'User ID and name are required' };
        return await supabaseClient
            .from('clients')
            .select('*')
            .eq('user_id', userId)
            .eq('name', name)
            .maybeSingle();
    },

    async createClient(userId, name, phone = null) {
        if (!userId || !name) return { data: null, error: 'User ID and name are required' };
        return await supabaseClient
            .from('clients')
            .insert([{ user_id: userId, name, phone }])
            .select()
            .single();
    },

    async getClientById(id) {
        if (!id) return { data: null, error: 'Client ID is required' };
        return await supabaseClient
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
    }
};
