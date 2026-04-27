/* ── API helper ────────────────────────────────────────── */
const API = {
  token: () => localStorage.getItem('token'),

  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token()}`,
    };
  },

  async request(method, url, body) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  },

  get:    (url)       => API.request('GET',    url),
  post:   (url, body) => API.request('POST',   url, body),
  put:    (url, body) => API.request('PUT',    url, body),
  delete: (url)       => API.request('DELETE', url),
};

/* ── Toast ─────────────────────────────────────────────── */
function toast(msg, type = 'default') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(110%)'; t.style.transition = '.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* ── Formatters ────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
}
function fmtName(first, last) { return `${first} ${last}`; }

function statusBadge(status) {
  const map = {
    active:     ['green',  'Активен'],
    graduated:  ['blue',   'Выпускник'],
    suspended:  ['red',    'Отчислен'],
    scheduled:  ['blue',   'Запланировано'],
    completed:  ['green',  'Завершено'],
    cancelled:  ['slate',  'Отменено'],
    registered: ['blue',   'Записан'],
    attended:   ['green',  'Посетил'],
    missed:     ['red',    'Пропустил'],
  };
  const [cls, label] = map[status] || ['slate', status];
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function lessonTypeBadge(t) {
  return t === 'theory'
    ? '<span class="tag tag-theory">Теория</span>'
    : '<span class="tag tag-practice">Практика</span>';
}

function starRating(r) {
  const n = Math.round(parseFloat(r) || 0);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/* ── Form → plain object ───────────────────────────────── */
function formData(formEl) {
  const obj = {};
  new FormData(formEl).forEach((v, k) => { if (v !== '') obj[k] = v; });
  return obj;
}

/* ── Modal helpers ─────────────────────────────────────── */
function openModal(id) {
  document.getElementById(`modal-${id}`).classList.add('open');
}
function closeModal(id) {
  const overlay = document.getElementById(`modal-${id}`);
  overlay.classList.remove('open');
  overlay.querySelector('form')?.reset();
}
// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    e.target.querySelector('form')?.reset();
  }
});
