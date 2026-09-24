import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET, isConfigured } from './supabase-config.js?v=20260924c';
import { mergeContent } from './data.js?v=20260924c';

const CACHE_KEY = 'pij-cache-v1';
let _client = null;

async function sb() {
  if (!isConfigured) return null;
  if (_client) return _client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return _client;
}

function notConnected() {
  return new Error('Supabase is not connected yet. Add the URL and anon key in assets/js/supabase-config.js.');
}

/* ---------- cache (so repeat visits paint instantly) ---------- */
export function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || {};
    return { content: mergeContent(c.content), exclusive: Array.isArray(c.exclusive) ? c.exclusive : [] };
  } catch {
    return { content: mergeContent(null), exclusive: [] };
  }
}
function writeCache(patch) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || {};
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, ...patch }));
  } catch {}
}

/* ---------- public reads ---------- */
export async function loadAll() {
  const client = await sb().catch(() => null);
  if (!client) return readCache();
  const [contentRes, exRes] = await Promise.all([
    client.from('site_content').select('data').eq('id', 'main').maybeSingle(),
    client.from('exclusive_items').select('*').eq('active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false })
  ]);
  const cached = readCache();
  const rawContent = contentRes.error ? null : contentRes.data?.data ?? null;
  const exclusive = exRes.error ? cached.exclusive : exRes.data || [];
  if (!contentRes.error) writeCache({ content: rawContent });
  if (!exRes.error) writeCache({ exclusive });
  return { content: contentRes.error ? cached.content : mergeContent(rawContent), exclusive };
}

/* ---------- auth ---------- */
export async function getSession() {
  const client = await sb();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}
export async function signIn(email, password) {
  const client = await sb();
  if (!client) throw notConnected();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}
export async function signOut() {
  const client = await sb();
  if (client) await client.auth.signOut();
}

/* ---------- admin writes ---------- */
export async function saveContent(content) {
  const client = await sb();
  if (!client) throw notConnected();
  const { error } = await client.from('site_content').upsert({ id: 'main', data: content, updated_at: new Date().toISOString() });
  if (error) throw error;
  writeCache({ content });
}

export async function listExclusiveAll() {
  const client = await sb();
  if (!client) throw notConnected();
  const { data, error } = await client.from('exclusive_items').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadImage(blob) {
  const client = await sb();
  if (!client) throw notConnected();
  const path = `items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: blob.type || 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw error;
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeImages(paths) {
  const list = (paths || []).filter(Boolean);
  if (!list.length) return;
  const client = await sb();
  if (client) await client.storage.from(STORAGE_BUCKET).remove(list);
}

export async function upsertExclusive(item) {
  const client = await sb();
  if (!client) throw notConnected();
  const row = { ...item };
  if (!row.id) delete row.id;
  const { data, error } = await client.from('exclusive_items').upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExclusive(item) {
  const client = await sb();
  if (!client) throw notConnected();
  const { error } = await client.from('exclusive_items').delete().eq('id', item.id);
  if (error) throw error;
  await removeImages([item.image_path, item.image2_path]);
}

export { isConfigured };
