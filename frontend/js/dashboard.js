/* ═══════════════════════════════════════════════════════════
   Dashboard — main controller
   ═══════════════════════════════════════════════════════════ */

/* ── Auth guard ────────────────────────────────────────── */
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || 'null');
if (!token || !user) { window.location.href = 'login.html'; }

/* ── Topbar date ────────────────────────────────────────── */
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* ── Sidebar user info ──────────────────────────────────── */
document.getElementById('sidebar-avatar').textContent = fmtInitials(user.first_name, user.last_name);
document.getElementById('sidebar-name').textContent   = fmtName(user.first_name, user.last_name);
document.getElementById('sidebar-role').textContent   = { admin: 'Администратор', instructor: 'Инструктор', student: 'Ученик' }[user.role] || user.role;

/* ── Role-based nav ─────────────────────────────────────── */
const NAV = {
  admin: [
    { id: 'overview',    icon: '📊', label: 'Обзор' },
    { id: 'students',    icon: '👨‍🎓', label: 'Ученики' },
    { id: 'instructors', icon: '👨‍🏫', label: 'Инструкторы' },
    { id: 'lessons',     icon: '📅', label: 'Занятия' },
    { id: 'exams',       icon: '📝', label: 'Экзамены' },
  ],
  instructor: [
    { id: 'lessons', icon: '📅', label: 'Мои занятия' },
    { id: 'students', icon: '👨‍🎓', label: 'Ученики' },
  ],
  student: [
    { id: 'lessons',    icon: '📅', label: 'Запись на занятие' },
    { id: 'my-lessons', icon: '📋', label: 'Мои занятия' },
    { id: 'exams',      icon: '📝', label: 'Мои экзамены' },
  ],
};

const navEl = document.getElementById('sidebar-nav');
(NAV[user.role] || []).forEach(item => {
  const btn = document.createElement('button');
  btn.className = 'nav-item';
  btn.dataset.page = item.id;
  btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
  btn.addEventListener('click', () => navigate(item.id));
  navEl.appendChild(btn);
});

/* ── Page navigation ────────────────────────────────────── */
let currentPage = null;
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  document.querySelectorAll(`.nav-item[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));

  const titles = {
    overview: 'Обзор', students: 'Ученики', instructors: 'Инструкторы',
    lessons: 'Занятия', exams: 'Экзамены', 'my-lessons': 'Мои занятия',
  };
  document.getElementById('page-title').textContent = titles[pageId] || pageId;

  currentPage = pageId;
  loadPage(pageId);
}

/* ── Sidebar mobile toggle ──────────────────────────────── */
const menuToggle = document.getElementById('menu-toggle');
const sidebar    = document.getElementById('sidebar');
if (window.innerWidth <= 900) menuToggle.style.display = '';
menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
window.addEventListener('resize', () => {
  menuToggle.style.display = window.innerWidth <= 900 ? '' : 'none';
});

/* ── Logout ─────────────────────────────────────────────── */
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

/* ═══════════════════════════════════════════════════════════
   PAGE LOADERS
   ═══════════════════════════════════════════════════════════ */
function loadPage(id) {
  const loaders = {
    overview:    loadOverview,
    students:    loadStudents,
    instructors: loadInstructors,
    lessons:     loadLessons,
    'my-lessons':loadMyLessons,
    exams:       loadExams,
  };
  loaders[id]?.();
}

/* ── OVERVIEW ───────────────────────────────────────────── */
async function loadOverview() {
  try {
    const stats = await API.get('/api/stats');
    document.getElementById('stat-students').textContent    = stats.active_students;
    document.getElementById('stat-instructors').textContent = stats.total_instructors;
    document.getElementById('stat-lessons').textContent     = stats.upcoming_lessons;
    document.getElementById('stat-exams').textContent       = stats.passed_exams;

    const lessons = await API.get('/api/lessons');
    const body = document.getElementById('overview-lessons-body');
    const upcoming = lessons.filter(l => l.status === 'scheduled').slice(0, 8);
    if (!upcoming.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📅</div><p>Нет предстоящих занятий</p></div></td></tr>`;
      return;
    }
    body.innerHTML = upcoming.map(l => `
      <tr>
        <td class="td-name">${l.title}</td>
        <td>${lessonTypeBadge(l.lesson_type)}</td>
        <td>${fmtDateTime(l.scheduled_date)}</td>
        <td>${l.instructor_first ? fmtName(l.instructor_first, l.instructor_last) : '<span style="color:var(--c-slate-400)">Не назначен</span>'}</td>
        <td>${l.registered_count}/${l.max_students}</td>
        <td>${statusBadge(l.status)}</td>
      </tr>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

/* ── STUDENTS ───────────────────────────────────────────── */
let studentsData = [];
async function loadStudents() {
  try {
    studentsData = await API.get('/api/students');
    renderStudents();
  } catch(e) { toast(e.message, 'error'); }
}
function renderStudents() {
  const search  = document.getElementById('students-search').value.toLowerCase();
  const status  = document.getElementById('students-status-filter').value;
  let rows = studentsData;
  if (search) rows = rows.filter(s =>
    (s.first_name+' '+s.last_name).toLowerCase().includes(search) ||
    s.email.toLowerCase().includes(search)
  );
  if (status) rows = rows.filter(s => s.status === status);

  document.getElementById('students-count').textContent = `(${rows.length})`;
  const body = document.getElementById('students-body');

  // Hide add btn for non-admin
  if (user.role !== 'admin') document.querySelector('#students-actions')?.remove();

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👨‍🎓</div><p>Учеников не найдено</p></div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(s => `
    <tr>
      <td>
        <div class="td-avatar">
          <div class="avatar green">${fmtInitials(s.first_name, s.last_name)}</div>
          <div><div class="td-name">${fmtName(s.first_name, s.last_name)}</div></div>
        </div>
      </td>
      <td><div>${s.email}</div><div class="td-sub">${s.phone || '—'}</div></td>
      <td><span class="tag">${s.license_category}</span></td>
      <td><span title="Теория">${s.theory_hours}ч</span> / <span title="Практика">${s.practice_hours}ч</span></td>
      <td>${fmtDate(s.enrollment_date)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>
        ${user.role === 'admin' ? `
        <div class="actions">
          <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id}, '${fmtName(s.first_name, s.last_name)}')">Удалить</button>
        </div>` : ''}
      </td>
    </tr>
  `).join('');
}
document.getElementById('students-search').addEventListener('input', renderStudents);
document.getElementById('students-status-filter').addEventListener('change', renderStudents);

async function deleteStudent(id, name) {
  if (!confirm(`Удалить ученика "${name}"?`)) return;
  try {
    await API.delete(`/api/students/${id}`);
    toast('Ученик удалён', 'success');
    loadStudents();
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('form-add-student').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.post('/api/students', formData(e.target));
    toast('Ученик добавлен!', 'success');
    closeModal('add-student');
    loadStudents();
  } catch(err) { toast(err.message, 'error'); }
});

/* ── INSTRUCTORS ────────────────────────────────────────── */
let instructorsData = [];
async function loadInstructors() {
  try {
    instructorsData = await API.get('/api/instructors');
    renderInstructors();
  } catch(e) { toast(e.message, 'error'); }
}
function renderInstructors() {
  const search = document.getElementById('instructors-search').value.toLowerCase();
  let rows = instructorsData;
  if (search) rows = rows.filter(i =>
    (i.first_name+' '+i.last_name).toLowerCase().includes(search) ||
    i.license_number.toLowerCase().includes(search)
  );

  if (user.role !== 'admin') document.getElementById('add-instructor-btn')?.remove();

  document.getElementById('instructors-count').textContent = `(${rows.length})`;
  const body = document.getElementById('instructors-body');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👨‍🏫</div><p>Инструкторов не найдено</p></div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(i => `
    <tr>
      <td>
        <div class="td-avatar">
          <div class="avatar purple">${fmtInitials(i.first_name, i.last_name)}</div>
          <div><div class="td-name">${fmtName(i.first_name, i.last_name)}</div></div>
        </div>
      </td>
      <td><div>${i.email}</div><div class="td-sub">${i.phone || '—'}</div></td>
      <td><code style="font-size:.78rem;background:var(--c-slate-100);padding:.1rem .4rem;border-radius:4px">${i.license_number}</code></td>
      <td>${i.experience_years} лет</td>
      <td>${i.specialization || '—'}</td>
      <td style="color:var(--c-amber-500);font-size:.95rem;letter-spacing:1px">${starRating(i.rating)} <span style="font-size:.75rem;color:var(--c-slate-500)">${i.rating}</span></td>
      <td>
        ${user.role === 'admin' ? `
        <div class="actions">
          <button class="btn btn-danger btn-sm" onclick="deleteInstructor(${i.id}, '${fmtName(i.first_name, i.last_name)}')">Удалить</button>
        </div>` : ''}
      </td>
    </tr>
  `).join('');
}
document.getElementById('instructors-search').addEventListener('input', renderInstructors);

async function deleteInstructor(id, name) {
  if (!confirm(`Удалить инструктора "${name}"?`)) return;
  try {
    await API.delete(`/api/instructors/${id}`);
    toast('Инструктор удалён', 'success');
    loadInstructors();
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('form-add-instructor').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.post('/api/instructors', formData(e.target));
    toast('Инструктор добавлен!', 'success');
    closeModal('add-instructor');
    loadInstructors();
  } catch(err) { toast(err.message, 'error'); }
});

/* ── LESSONS ────────────────────────────────────────────── */
let lessonsData = [];
async function loadLessons() {
  try {
    lessonsData = await API.get('/api/lessons');
    renderLessons();
  } catch(e) { toast(e.message, 'error'); }
}
function renderLessons() {
  const search = document.getElementById('lessons-search').value.toLowerCase();
  const type   = document.getElementById('lessons-type-filter').value;
  let rows = lessonsData;
  if (search) rows = rows.filter(l => l.title.toLowerCase().includes(search) || (l.location || '').toLowerCase().includes(search));
  if (type)   rows = rows.filter(l => l.lesson_type === type);

  document.getElementById('lessons-count').textContent = `(${rows.length})`;

  if (user.role === 'student') {
    renderLessonsCards(rows);
  } else {
    renderLessonsTable(rows);
  }
}

function renderLessonsTable(rows) {
  document.getElementById('lessons-table-wrap').style.display = '';
  document.getElementById('lessons-cards-wrap').style.display = 'none';
  if (user.role !== 'admin') document.getElementById('add-lesson-btn')?.remove();

  const body = document.getElementById('lessons-body');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📅</div><p>Занятий не найдено</p></div></td></tr>`;
    return;
  }
  body.innerHTML = rows.map(l => `
    <tr>
      <td class="td-name">${l.title}</td>
      <td>${lessonTypeBadge(l.lesson_type)}</td>
      <td>${fmtDateTime(l.scheduled_date)}</td>
      <td>${l.instructor_first ? fmtName(l.instructor_first, l.instructor_last) : '<span style="color:var(--c-slate-400)">—</span>'}</td>
      <td>${l.location || '—'}</td>
      <td>
        <div class="seats-bar">
          <div class="seats-bar-track">
            <div class="seats-bar-fill ${getPct(l) >= 100 ? 'full' : getPct(l) >= 80 ? 'warn' : ''}"
                 style="width:${Math.min(getPct(l),100)}%"></div>
          </div>
          ${l.registered_count}/${l.max_students}
        </div>
      </td>
      <td>${statusBadge(l.status)}</td>
      <td>
        ${user.role === 'admin' ? `
        <div class="actions">
          <button class="btn btn-danger btn-sm" onclick="deleteLesson(${l.id})">Удалить</button>
        </div>` : ''}
      </td>
    </tr>
  `).join('');
}

function renderLessonsCards(rows) {
  document.getElementById('lessons-table-wrap').style.display = 'none';
  document.getElementById('lessons-cards-wrap').style.display = '';

  const container = document.getElementById('lessons-cards');
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📅</div><p>Нет доступных занятий</p></div>`;
    return;
  }
  container.innerHTML = rows.map(l => {
    const pct  = getPct(l);
    const full = parseInt(l.registered_count) >= parseInt(l.max_students);
    return `
    <div class="lesson-card">
      <div class="lesson-card-head">
        <div>
          <div class="lesson-card-title">${l.title}</div>
          <div class="lesson-card-meta">📍 ${l.location || 'Место не указано'}</div>
        </div>
        ${lessonTypeBadge(l.lesson_type)}
      </div>
      <div class="lesson-card-meta">
        🗓 ${fmtDateTime(l.scheduled_date)} · ⏱ ${l.duration_minutes} мин
      </div>
      ${l.instructor_first ? `<div class="lesson-card-meta" style="margin-top:.3rem">👨‍🏫 ${fmtName(l.instructor_first, l.instructor_last)}</div>` : ''}
      <div class="lesson-card-footer">
        <div class="seats-bar">
          <div class="seats-bar-track">
            <div class="seats-bar-fill ${pct >= 100 ? 'full' : pct >= 80 ? 'warn' : ''}" style="width:${Math.min(pct,100)}%"></div>
          </div>
          ${l.registered_count}/${l.max_students} мест
        </div>
        ${l.status === 'scheduled' && !full
          ? `<button class="btn btn-primary btn-sm" onclick="registerLesson(${l.id})">Записаться</button>`
          : full
            ? `<span class="badge badge-red">Мест нет</span>`
            : statusBadge(l.status)
        }
      </div>
    </div>`;
  }).join('');
}

function getPct(l) { return Math.round((parseInt(l.registered_count || 0) / parseInt(l.max_students || 1)) * 100); }

async function registerLesson(id) {
  try {
    await API.post(`/api/lessons/${id}/register`, {});
    toast('Вы записаны на занятие!', 'success');
    loadLessons();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteLesson(id) {
  if (!confirm('Удалить занятие?')) return;
  try {
    await API.delete(`/api/lessons/${id}`);
    toast('Занятие удалено', 'success');
    loadLessons();
  } catch(e) { toast(e.message, 'error'); }
}

document.getElementById('lessons-search').addEventListener('input', renderLessons);
document.getElementById('lessons-type-filter').addEventListener('change', renderLessons);

// Populate instructors select in lesson form
async function populateLessonInstructors() {
  try {
    const list = await API.get('/api/instructors');
    const sel  = document.getElementById('lesson-instructor-select');
    sel.innerHTML = '<option value="">— Не назначен —</option>' +
      list.map(i => `<option value="${i.id}">${fmtName(i.first_name, i.last_name)}</option>`).join('');
  } catch {}
}

document.getElementById('form-add-lesson').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await API.post('/api/lessons', formData(e.target));
    toast('Занятие создано!', 'success');
    closeModal('add-lesson');
    loadLessons();
  } catch(err) { toast(err.message, 'error'); }
});

// Override openModal to populate selects
const _origOpen = window.openModal;
window.openModal = function(id) {
  _origOpen(id);
  if (id === 'add-lesson')    populateLessonInstructors();
  if (id === 'add-exam')      populateExamStudents();
};

/* ── MY LESSONS (student) ───────────────────────────────── */
async function loadMyLessons() {
  try {
    const rows = await API.get('/api/my-lessons');
    const body = document.getElementById('my-lessons-body');
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div><p>Вы не записаны ни на одно занятие</p></div></td></tr>`;
      return;
    }
    body.innerHTML = rows.map(l => `
      <tr>
        <td class="td-name">${l.title}</td>
        <td>${lessonTypeBadge(l.lesson_type)}</td>
        <td>${fmtDateTime(l.scheduled_date)}</td>
        <td>${l.location || '—'}</td>
        <td>${statusBadge(l.status)}</td>
        <td>${statusBadge(l.reg_status)}</td>
      </tr>
    `).join('');
  } catch(e) { toast(e.message, 'error'); }
}

/* ── EXAMS ──────────────────────────────────────────────── */
let examsData = [];
async function loadExams() {
  try {
    const endpoint = user.role === 'student' ? '/api/exams/my' : '/api/exams';
    examsData = await API.get(endpoint);
    renderExams();
  } catch(e) { toast(e.message, 'error'); }
}
function renderExams() {
  if (user.role !== 'admin') document.getElementById('add-exam-btn')?.remove();
  document.getElementById('exams-count').textContent = `(${examsData.length})`;
  const body = document.getElementById('exams-body');
  if (!examsData.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📝</div><p>Экзаменов не найдено</p></div></td></tr>`;
    return;
  }
  body.innerHTML = examsData.map(e => `
    <tr>
      <td class="td-name">${e.first_name ? fmtName(e.first_name, e.last_name) : '—'}</td>
      <td>${lessonTypeBadge(e.exam_type)}</td>
      <td>${fmtDateTime(e.exam_date)}</td>
      <td>${e.score !== null ? `<strong>${e.score}</strong>/100` : '—'}</td>
      <td>#${e.attempt_number}</td>
      <td>${e.passed === true
        ? '<span class="badge badge-green">Сдан ✓</span>'
        : e.passed === false
          ? '<span class="badge badge-red">Не сдан ✗</span>'
          : '<span class="badge badge-slate">Не определён</span>'
      }</td>
      <td>
        ${user.role === 'admin' ? `
        <div class="actions">
          <button class="btn btn-danger btn-sm" onclick="deleteExam(${e.id})">Удалить</button>
        </div>` : ''}
      </td>
    </tr>
  `).join('');
}

async function populateExamStudents() {
  try {
    const list = await API.get('/api/students');
    const sel  = document.getElementById('exam-student-select');
    sel.innerHTML = '<option value="">— Выберите ученика —</option>' +
      list.map(s => `<option value="${s.id}">${fmtName(s.first_name, s.last_name)}</option>`).join('');
  } catch {}
}

document.getElementById('form-add-exam').addEventListener('submit', async e => {
  e.preventDefault();
  const data = formData(e.target);
  if (data.passed === 'true') data.passed = true;
  else if (data.passed === 'false') data.passed = false;
  else delete data.passed;
  try {
    await API.post('/api/exams', data);
    toast('Экзамен добавлен!', 'success');
    closeModal('add-exam');
    loadExams();
  } catch(err) { toast(err.message, 'error'); }
});

async function deleteExam(id) {
  if (!confirm('Удалить запись об экзамене?')) return;
  try {
    await API.delete(`/api/exams/${id}`);
    toast('Удалено', 'success');
    loadExams();
  } catch(e) { toast(e.message, 'error'); }
}

/* ── Boot: navigate to first page ──────────────────────── */
const firstPage = NAV[user.role]?.[0]?.id || 'overview';
navigate(firstPage);
