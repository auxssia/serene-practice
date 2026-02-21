import { supabaseClient } from '../core/supabaseClient.js';

export const appointmentService = {
    async fetchAppointments(userId, dateStr) {
        return await supabaseClient.from('appointments').select('*')
            .eq('user_id', userId).eq('date', dateStr).order('time', { ascending: true });
    },
    async saveAppointment(formData, editId) {
        if (editId) {
            return await supabaseClient.from('appointments').update(formData).eq('id', editId);
        } else {
            return await supabaseClient.from('appointments').insert([formData]);
        }
    },
    async deleteAppointment(id) {
        return await supabaseClient.from('appointments').delete().eq('id', id);
    },
    async fetchAllAppointments(userId) {
        return await supabaseClient.from('appointments').select('*').eq('user_id', userId);
    },
    async bulkSaveAppointments(appointments) {
        return await supabaseClient.from('appointments').insert(appointments);
    }
};
