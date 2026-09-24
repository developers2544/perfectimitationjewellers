// Supabase dashboard > Project Settings > API Keys
// Publishable (anon) key is safe in the browser; Row Level Security makes sure only the logged-in owner can edit.
export const SUPABASE_URL = 'https://kkiltpyjqrqxqnenxazt.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_JKOZ1CM59cqlGnKjCFi4DA_t90W3Xm7';

export const STORAGE_BUCKET = 'exclusive';

export const isConfigured = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('PASTE_');
