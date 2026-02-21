import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
