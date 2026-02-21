import { supabaseClient } from '../core/supabaseClient.js';

export const noteService = {
    async fetchNotes(userId) {
        if (!userId) return { data: [], error: 'User ID is required' };
        return await supabaseClient.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    },
    async createPinnedNote(userId) {
        if (!userId) return { data: null, error: 'User ID is required' };
        return await supabaseClient.from('notes').insert([{
            user_id: userId,
            title: 'Daily Intentions',
            content: '[]',
            type: 'checklist',
            is_pinned: true
        }]).select();
    },
    async createNote(userId, title) {
        if (!userId) return { data: null, error: 'User ID is required' };
        return await supabaseClient.from('notes').insert([
            { user_id: userId, title: title, content: '', type: 'text' }
        ]).select();
    },
    async updateNote(id, data) {
        if (!id) return { error: 'Note ID is required' };
        return await supabaseClient.from('notes').update(data).eq('id', id);
    },
    async deleteNote(id) {
        if (!id) return { error: 'Note ID is required' };
        return await supabaseClient.from('notes').delete().eq('id', id);
    },
    async getNoteById(id) {
        if (!id) return { data: null, error: 'Note ID is required' };
        return await supabaseClient.from('notes').select('*').eq('id', id).single();
    }
};
