import { supabaseClient } from '../core/supabaseClient.js';

export const blockedDateService = {
    async getBlockedDate(userId, date) {
        if (!userId || !date) return { data: null, error: 'User ID and date are required' };
        return await supabaseClient
            .from('blocked_dates')
            .select('*')
            .eq('user_id', userId)
            .eq('date', date)
            .maybeSingle();
    },

    async blockDate(userId, date, reason) {
        if (!userId || !date) return { data: null, error: 'User ID and date are required' };
        return await supabaseClient
            .from('blocked_dates')
            .insert([{ user_id: userId, date, reason }])
            .select()
            .single();
    },

    async unblockDate(id) {
        if (!id) return { error: 'Blocked date ID is required' };
        return await supabaseClient
            .from('blocked_dates')
            .delete()
            .eq('id', id);
    },

    async getAllBlockedDates(userId) {
        if (!userId) return { data: [], error: 'User ID is required' };
        return await supabaseClient
            .from('blocked_dates')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true });
    },
    async getBlockedDatesByRange(userId, start, end) {
        if (!userId) return { data: [], error: 'User ID is required' };
        return await supabaseClient
            .from('blocked_dates')
            .select('date')
            .eq('user_id', userId)
            .gte('date', start)
            .lte('date', end);
    }
};
