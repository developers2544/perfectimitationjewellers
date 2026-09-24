import { IMAGES, PRODUCT_ORDER } from './data.js';
import {
  isConfigured, loadAll, getSession, signIn, signOut, saveContent,
  listExclusiveAll, upsertExclusive, deleteExclusive, uploadImage, removeImages
} from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let content = null;
let dirty = false;
let items = [];

/* ================= UI helpers ================= */
let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false; t.classList.toggle('is-error', isError);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), isError ? 5000 : 2600);
}
function showError(node, msg) { node.textContent = msg; node.hidden = !msg; }
function friendly(err) {
  const m = String(err?.message || err || '');
  if (/invalid login credentials/i.test(m)) return 'Email or password is wrong. Check both and try again.';
  if (/failed to fetch|network/i.test(m)) return 'No internet connection. Check your network and try again.';
  if (/jwt expired|invalid jwt|refresh token|session.*(missing|expired)/i.test(m)) return 'Your session has ended. Sign in again to save.';
  if (/row-level security|violates|permission denied|not authorized|unauthorized|403/i.test(m))
    return `Supabase blocked this save because a permission rule is missing. Run supabase/fix-permissions.sql in the Supabase SQL Editor, then try again. (Details: ${m})`;
  if (/bucket not found/i.test(m)) return 'The photo storage bucket "exclusive" is missing. Run supabase/fix-permissions.sql in the Supabase SQL Editor.';
  if (/relation .* does not exist|could not find the table/i.test(m)) return 'Database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor.';
  if (/payload too large|exceeded the maximum/i.test(m)) return 'This photo is too large. Choose a smaller photo.';
  return m || 'Something went wrong. Try again.';
}
function setBusy(btn, busy, label) {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.disabled = busy; btn.textContent = busy ? label : btn.dataset.label;
}
function view(name) {
  ['login', 'setup', 'app'].forEach(v => ($('#view-' + v).hidden = v !== name));
}

/* ================= Boot ================= */
(async function boot() {
  if (!isConfigured) return view('setup');
  const session = await getSession().catch(() => null);
  if (session) enterApp(session); else view('login');
})();

/* ================= Login ================= */
$('.pw__toggle').addEventListener('click', e => {
  const input = e.currentTarget.previousElementSibling;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? 'Hide' : 'Show';
  e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget, btn = $('button[type=submit]', f), errBox = $('#login-error');
  const email = f.email.value.trim(), password = f.password.value;
  if (!email || !password) return showError(errBox, 'Enter both email and password.');
  showError(errBox, '');
  setBusy(btn, true, 'Signing in\u2026');
  try { enterApp(await signIn(email, password)); }
  catch (err) { showError(errBox, friendly(err)); }
  finally { setBusy(btn, false); }
});

$('#sign-out').addEventListener('click', async () => {
  if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
  await signOut(); dirty = false; location.href = './';
});

async function enterApp(session) {
  view('app');
  $('#who').textContent = session?.user?.email || '';
  const data = await loadAll();
  content = structuredClone(data.content);
  renderProductForms();
  fillStoreForm();
  await refreshItems();
}

/* ================= Tabs ================= */
const tabs = $$('[role=tab]');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  });
  updateSavebar();
  scrollTo({ top: 0 });
}));
function activeTab() { return tabs.find(t => t.getAttribute('aria-selected') === 'true')?.id; }

/* ================= Products & rates ================= */
function renderProductForms() {
  const wrap = $('#product-forms');
  wrap.replaceChildren();
  PRODUCT_ORDER.forEach(id => {
    const p = content.products[id];
    const box = document.createElement('div');
    box.className = 'box pcard';
    box.innerHTML = `
      <img class="pcard__thumb" alt="" src="${IMAGES[id].box}">
      <div class="pcard__fields">
        <label class="field"><span>Product name</span><input data-k="name" maxlength="80"></label>
        <div class="row">
          <label class="field"><span>Type</span><input data-k="type" maxlength="60"></label>
          <label class="field"><span>Finish</span><input data-k="finish" maxlength="80"></label>
        </div>
        <label class="field"><span>Uses</span><textarea data-k="uses" rows="3" maxlength="500"></textarea></label>
        <div class="row">
          <label class="field"><span>Rate from (₹)</span><input data-k="rateMin" inputmode="numeric" maxlength="12" placeholder="e.g. 250"></label>
          <label class="field"><span>Rate up to (₹)</span><input data-k="rateMax" inputmode="numeric" maxlength="12" placeholder="e.g. 450"></label>
        </div>
      </div>`;
    $$('[data-k]', box).forEach(input => {
      input.value = p[input.dataset.k] ?? '';
      input.addEventListener('input', () => { p[input.dataset.k] = input.value; markDirty(); });
    });
    wrap.append(box);
  });
}

/* ================= Store details ================= */
function fillStoreForm() {
  $$('#store-form [name]').forEach(input => {
    input.value = content[input.name] ?? '';
    input.oninput = () => { content[input.name] = input.value; markDirty(); };
  });
}

/* ================= Save bar ================= */
function markDirty() { dirty = true; $('#save-state').textContent = 'Unsaved changes'; updateSavebar(); }
function updateSavebar() { $('#savebar').hidden = !(dirty && activeTab() !== 'tab-exclusive'); }

$('#save').addEventListener('click', async e => {
  const btn = e.currentTarget;
  if (!(await ensureSession())) return;
  const wa = String(content.whatsapp).replace(/\D/g, '');
  if (wa.length < 10) return toast('Enter a valid WhatsApp number with country code, like 918451087229.', true);
  content.whatsapp = wa;
  content.instagram = String(content.instagram).trim().replace(/^@/, '');
  setBusy(btn, true, 'Saving\u2026');
  try {
    await saveContent(content);
    dirty = false; updateSavebar();
    toast('Changes saved. The website is updated.');
  } catch (err) { toast(friendly(err), true); }
  finally { setBusy(btn, false); }
});
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ================= Image processing ================= */
// Crop to portrait 2:3 and compress, so uploads stay small and match the other cards.
async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo file (JPG, PNG or WebP).');
  const bmp = await createImageBitmap(file).catch(() => null);
  const src = bmp || await new Promise((res, rej) => {
    const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('This photo could not be read. Try another one.'));
    img.src = URL.createObjectURL(file);
  });
  const W = 800, H = 1200, sw = src.width, sh = src.height;
  const scale = Math.max(W / sw, H / sh);
  const cw = W / scale, ch = H / scale;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
  let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.84));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.86));
  return blob;
}

/* ================= Exclusive items ================= */
const form = $('#ex-form');
const pending = { 1: null, 2: null };  // new files chosen
let editing = null;                    // item being edited
let clearSecond = false;

$$('.upload', form).forEach(slot => {
  const n = slot.dataset.slot;
  const input = $('input', slot), preview = $('.upload__img', slot), clear = $('.upload__clear', slot);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    pending[n] = file;
    preview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
    if (clear) { clear.hidden = false; clearSecond = false; }
  });
  clear?.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    pending[2] = null; input.value = ''; preview.style.backgroundImage = '';
    clear.hidden = true; clearSecond = true;
  });
});

function resetForm() {
  editing = null; clearSecond = false; pending[1] = pending[2] = null;
  form.reset();
  $$('.upload__img', form).forEach(p => (p.style.backgroundImage = ''));
  $('.upload__clear', form).hidden = true;
  $('#ex-form-title').textContent = 'Add an exclusive item';
  $('#ex-submit').textContent = 'Add item'; $('#ex-submit').dataset.label = 'Add item';
  $('#ex-cancel').hidden = true;
  showError($('#ex-error'), '');
}
$('#ex-cancel').addEventListener('click', resetForm);

function startEdit(item) {
  resetForm();
  editing = item;
  ['name', 'type', 'note', 'rate_min', 'rate_max'].forEach(k => (form[k].value = item[k] || ''));
  $('[data-slot="1"] .upload__img', form).style.backgroundImage = `url("${item.image_url}")`;
  if (item.image2_url) {
    $('[data-slot="2"] .upload__img', form).style.backgroundImage = `url("${item.image2_url}")`;
    $('.upload__clear', form).hidden = false;
  }
  $('#ex-form-title').textContent = 'Edit item';
  $('#ex-submit').textContent = 'Save item'; $('#ex-submit').dataset.label = 'Save item';
  $('#ex-cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function ensureSession() {
  const session = await getSession().catch(() => null);
  if (!session) { toast('Your session has ended. Sign in again.', true); view('login'); return false; }
  return true;
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!(await ensureSession())) return;
  const btn = $('#ex-submit'), errBox = $('#ex-error');
  const name = form.name.value.trim();
  if (!name) return showError(errBox, 'Enter the item name.');
  if (!editing && !pending[1]) return showError(errBox, 'Add the main photo.');
  showError(errBox, '');
  setBusy(btn, true, 'Uploading\u2026');
  const uploaded = [];
  try {
    const row = {
      name, type: form.type.value.trim(), note: form.note.value.trim(),
      rate_min: form.rate_min.value.trim(), rate_max: form.rate_max.value.trim()
    };
    const oldPaths = [];
    if (pending[1]) {
      const up = await uploadImage(await prepareImage(pending[1])); uploaded.push(up.path);
      row.image_url = up.url; row.image_path = up.path;
      if (editing) oldPaths.push(editing.image_path);
    }
    if (pending[2]) {
      const up = await uploadImage(await prepareImage(pending[2])); uploaded.push(up.path);
      row.image2_url = up.url; row.image2_path = up.path;
      if (editing?.image2_path) oldPaths.push(editing.image2_path);
    } else if (clearSecond && editing?.image2_path) {
      row.image2_url = ''; row.image2_path = ''; oldPaths.push(editing.image2_path);
    }
    if (editing) {
      await upsertExclusive({ ...editing, ...row });
      await removeImages(oldPaths);
      toast('Item saved.');
    } else {
      const minOrder = items.reduce((m, x) => Math.min(m, x.sort_order ?? 0), 0);
      await upsertExclusive({ ...row, sort_order: minOrder - 1, active: true });
      toast('Item added to Exclusive.');
    }
    resetForm();
    await refreshItems();
  } catch (err) {
    await removeImages(uploaded).catch(() => {});
    showError(errBox, friendly(err));
  } finally { setBusy(btn, false); }
});

async function refreshItems() {
  try { items = await listExclusiveAll(); }
  catch (err) { toast(friendly(err), true); items = []; }
  renderItems();
}

function renderItems() {
  const list = $('#ex-list');
  list.replaceChildren();
  const visible = items.filter(i => i.active).length;
  $('#ex-count').textContent = items.length ? `(${visible} visible of ${items.length})` : '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty'; li.textContent = 'No items yet. Add the first trending piece above.';
    return list.append(li);
  }
  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'ex-item' + (item.active ? '' : ' is-hidden');
    const img = document.createElement('img'); img.src = item.image_url; img.alt = '';
    const info = document.createElement('div');
    const title = document.createElement('p'); title.className = 'ex-item__name'; title.textContent = item.name;
    const meta = document.createElement('p'); meta.className = 'ex-item__meta';
    meta.textContent = [item.active ? 'Visible on website' : 'Hidden', item.type].filter(Boolean).join(', ');
    const actions = document.createElement('div'); actions.className = 'ex-item__actions';
    const mk = (label, cls, fn, disabled) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--sm ' + cls; b.textContent = label;
      b.disabled = !!disabled; b.addEventListener('click', fn); actions.append(b);
    };
    mk('Edit', 'btn--line', () => startEdit(item));
    mk(item.active ? 'Hide' : 'Show', 'btn--line', () => toggle(item));
    mk('Move up', 'btn--line', () => move(i, -1), i === 0);
    mk('Move down', 'btn--line', () => move(i, 1), i === items.length - 1);
    mk('Delete', 'btn--danger', () => remove(item));
    info.append(title, meta, actions);
    li.append(img, info);
    list.append(li);
  });
}

async function toggle(item) {
  try { await upsertExclusive({ ...item, active: !item.active }); toast(item.active ? 'Item hidden from website.' : 'Item is visible on website.'); await refreshItems(); }
  catch (err) { toast(friendly(err), true); }
}
async function move(i, dir) {
  const a = items[i], b = items[i + dir];
  if (!a || !b) return;
  // normalise order first so every item has a unique position
  items.forEach((x, k) => (x.sort_order = k));
  [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
  try { await Promise.all(items.map(x => upsertExclusive(x))); await refreshItems(); }
  catch (err) { toast(friendly(err), true); }
}
async function remove(item) {
  if (!confirm(`Delete "${item.name}"? This removes it and its photos permanently.`)) return;
  try { await deleteExclusive(item); if (editing?.id === item.id) resetForm(); toast('Item deleted.'); await refreshItems(); }
  catch (err) { toast(friendly(err), true); }
}
