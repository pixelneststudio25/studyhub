import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { FIG } from './figures.js';
let createClient = null;
try { ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')); } catch { /* offline on first visit: app still works, sync is off */ }

const $ = s => document.querySelector(s), app = $('#app');
const ICON = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const rawEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let KT = null;
async function loadKatex() {
  if (KT) return;
  try {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'; document.head.append(l);
    KT = (await import('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.mjs')).default;
  } catch { /* offline on first visit: formulas show as plain LaTeX */ }
}
const tex = p => { const d = p.startsWith('$$'), src = p.slice(d ? 2 : 1, d ? -2 : -1); try { return KT.renderToString(src, { displayMode: d, throwOnError: false, strict: false }); } catch { return rawEsc(p); } };
const esc = s => { s = String(s); if (!KT || !s.includes('$')) return rawEsc(s); return s.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g).map((p, i) => i % 2 ? tex(p) : rawEsc(p)).join(''); };
const day = (o = 0) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10);
let D, L = [], S, G, user = null, timer, COURSES = [], DATA = {}, cur = null;
const sb = createClient && SUPABASE_URL.startsWith('http') ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// State: G holds global data (study days, focus, per-course progress); S is the active course's progress.
const cblank = () => ({ done: {}, quiz: {}, weak: {}, cards: {}, theory: {}, exams: [], pos: {}, practice: {} });
const norm = r => {
  if (r && r.c) return { days: {}, t: 0, ...r };
  const { days = {}, t = 0, ...rest } = r || {};   // migrate the old single-course shape
  return { days, t, cur: 'mce321', focus: 'mce321', c: Object.keys(rest).length ? { mce321: { ...cblank(), ...rest } } : {} };
};
G = norm(JSON.parse(localStorage.getItem('sh') || '{}'));
function useCourse(id) {
  cur = id; D = DATA[id]; L = D.modules.flatMap(m => m.lessons);
  const st = G.c[id] || (G.c[id] = {}); for (const [k, v] of Object.entries(cblank())) if (!(k in st)) st[k] = v; S = st;
}
const setCourse = id => { useCourse(id); G.cur = id; };
function withCourse(id, fn) { const p = cur; useCourse(id); try { return fn(); } finally { if (p) useCourse(p); } }
const wkKey = () => day(-((new Date().getDay() + 6) % 7));
const ready = () => COURSES.filter(c => DATA[c.id]);
const focusId = () => { const r = ready(); if (r.length === 1) return r[0].id; return G.focusWk === wkKey() && DATA[G.focus] ? G.focus : null; };
function saveQuiet() { G.t = Date.now(); localStorage.setItem('sh', JSON.stringify(G)); clearTimeout(timer); timer = setTimeout(push, 1200); }   // persists without counting a study day
function save() {
  G.t = Date.now(); G.days[day()] = 1;
  localStorage.setItem('sh', JSON.stringify(G));
  clearTimeout(timer); timer = setTimeout(push, 1200);
}
let syncT;
function setSync(st) {
  const el = $('#sync'); clearTimeout(syncT); el.className = 'sync ' + st;
  el.innerHTML = st === 'saving' ? '<i class="spin" aria-hidden="true"></i><span>Saving</span>' : st === 'saved' ? `${ICON('check')}<span>Saved</span>` : st === 'error' ? '<span>Not synced</span>' : st === 'offline' ? `${ICON('offline')}<span>Offline. Saved on this device</span>` : '';
  if (st === 'saved') syncT = setTimeout(() => setSync(''), 2200);
}
async function push() {
  if (!(sb && user)) return; if (!navigator.onLine) { setSync('offline'); return; } setSync('saving');
  const { error } = await sb.from('user_state').upsert({ user_id: user.id, data: G, updated_at: new Date().toISOString() });
  setSync(error ? 'error' : 'saved');
}
async function withLoad(btn, label, fn) {
  const h = btn.innerHTML; btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = `<i class="spin" aria-hidden="true"></i><span>${label}</span>`;
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = h; }
}
const lb = $('#lbar'); let lbT;
function bar(on) {
  clearTimeout(lbT);
  if (on) { lb.style.transition = 'none'; lb.style.width = '0'; lb.style.opacity = '1'; requestAnimationFrame(() => requestAnimationFrame(() => { lb.style.transition = ''; lb.style.width = '72%'; })); }
  else { lb.style.width = '100%'; lbT = setTimeout(() => { lb.style.opacity = '0'; }, 240); }
}
async function pull() {
  const { data } = await sb.from('user_state').select('data').eq('user_id', user.id).maybeSingle();
  if (data && (data.data.t || 0) > (G.t || 0)) { G = norm(data.data); localStorage.setItem('sh', JSON.stringify(G)); if (cur) useCourse(DATA[G.cur] ? G.cur : cur); } else push();
  route();
}
const streak = () => { let n = 0, o = G.days[day()] ? 0 : -1; while (G.days[day(o)]) { n++; o--; } return n; };
const weekDays = () => [...Array(7)].filter((_, i) => G.days[day(-i)]).length;

// theme
const theme = localStorage.getItem('th');
if (theme) document.documentElement.dataset.theme = theme;
$('#theme').onclick = () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
  const n = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = n; localStorage.setItem('th', n);
};
// nav
const NAV = [['#/', 'home', 'Home'], ['#/lessons', 'list', 'Lessons'], ['#/cards', 'layers', 'Cards'], ['#/glossary', 'book', 'Terms'], ['#/account', 'user', 'Account']];
const navHTML = h => NAV.map(([href, ic, t]) => `<a href="${href}" class="nl ${h === href ? 'on' : ''}" ${h === href ? 'aria-current="page"' : ''}>${ICON(ic)}<span>${t}</span></a>`).join('');
const setMenu = o => { document.body.classList.toggle('menu', o); $('#burger').setAttribute('aria-expanded', o); };
$('#burger').onclick = () => setMenu(!document.body.classList.contains('menu'));
$('#scrim').onclick = () => setMenu(false);

// search
const ov = $('#overlay'), qi = $('#q');
const openS = () => { ov.hidden = false; qi.value = ''; qi.focus(); find(); };
$('#srch').onclick = openS;
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openS(); } if (e.key === 'Escape') { ov.hidden = true; setMenu(false); } });
ov.onclick = e => { if (e.target === ov || e.target.closest('a')) ov.hidden = true; };
qi.oninput = find;
function find() {
  const q = qi.value.toLowerCase().trim();
  const ls = L.filter(l => !q || (l.id + l.title + l.one_line).toLowerCase().includes(q)).slice(0, 6).map(l => `<a href="#/lesson/${l.id}">${l.id} · ${esc(l.title)}</a>`);
  const ts = q ? Object.values(D.glossary).filter(g => (g.term + g.plain).toLowerCase().includes(q)).slice(0, 6).map(g => `<a href="#/glossary/${encodeURIComponent(g.term)}">Term: ${esc(g.term)}</a>`) : [];
  $('#res').innerHTML = ls.join('') + ts.join('') || '<p class="mut">No matches</p>';
}

// views
const ring = (p, n = 96) => { const c = 2 * Math.PI * 40; return `<svg class="ring" viewBox="0 0 100 100" width="${n}" height="${n}" role="img" aria-label="${Math.round(p * 100)} percent complete"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" cx="50" cy="50" r="40" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-o="${c * (1 - p)}"/></svg>`; };
const fillRings = () => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.ring .fg').forEach(e => e.style.strokeDashoffset = e.dataset.o)));
const lesson = id => L.find(l => l.id === id);
const dueCards = scope => L.filter(l => !scope || l.id === scope).flatMap(l => l.flashcards.map((c, i) => ({ ...c, key: l.id + '#' + i, lid: l.id })))
  .filter(c => (S.cards[c.key]?.due || '') <= day());

const TARGET = 5;
let C = {};
const dow = () => (new Date().getDay() + 6) % 7 + 1;
const dnum = () => Math.floor(Date.now() / 864e5);
const gapDays = () => { if (G.days[day()]) return 0; for (let o = 1; o <= 90; o++) if (G.days[day(-o)]) return o; return -1; };
const fill = (t, d) => t.replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '');
const weakest = () => Object.entries(S.weak).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
const dueNow = () => L.flatMap(l => l.flashcards.map((c, i) => ({ k: l.id + '#' + i, l }))).filter(c => (S.cards[c.k] || S.done[c.l.id]) && (S.cards[c.k]?.due || '') <= day()).length;

function coach() {
  const done = L.filter(l => S.done[l.id]).length, st = streak(), gap = gapDays(), wd = weekDays(), wk = weakest();
  const lq = Object.entries(S.quiz).sort((a, b) => b[1].ts - a[1].ts)[0];
  const need = TARGET - wd, daysLeft = 8 - dow();
  const fresh = lq && Date.now() - lq[1].ts < 36e5 * 36 && lq[1].score === lq[1].total;
  const data = { n: done, left: L.length - done, total: L.length, streak: st, days: wd, target: TARGET, remaining: Math.max(0, need), gap, topic: wk ? lesson(wk[0]).title : fresh ? lesson(lq[0]).title : '' };
  let key = 'progress', arr;
  if (gap < 0) key = 'start';
  else if (gap >= 3) key = 'return';
  else if (gap === 2) key = 'skipped';
  else if (G.days[day()] && C.streak?.[st]) { key = 'streak'; arr = C.streak[st]; }
  else if (need > 0 && need >= daysLeft && dow() >= 3) key = 'behind';
  else if (fresh) { key = 'perfect'; data.topic = lesson(lq[0]).title; }
  else if (wk) key = 'weak';
  else if (done === L.length) key = 'caughtup';
  arr = arr || C[key];
  return arr?.length ? fill(arr[(dnum() + key.length) % arr.length], data) : 'Open the assignment below and start.';
}
function assignment() {
  const due = dueNow(), wk = weakest(), next = L.find(l => !S.done[l.id]);
  if (due > 0) return { label: 'Flashcards due', title: `${due} card${due > 1 ? 's' : ''} to review`, text: `About ${Math.max(1, Math.round(due * 0.5))} minutes. Clear these before anything new.`, href: '#/cards', cta: 'Review cards' };
  if (wk) return { label: 'Weak topic', title: lesson(wk[0]).title, text: 'You missed questions here. Retake the quiz until it is clean.', href: `#/quiz/${wk[0]}`, cta: 'Retake quiz' };
  if (next) { const on = (S.pos?.[next.id] || 0) > 0; return { label: on ? 'Continue' : 'Next lesson', title: `${next.id} · ${next.title}`, text: next.one_line, href: `#/lesson/${next.id}`, cta: on ? 'Resume lesson' : 'Start lesson' }; }
  return { label: 'Course complete', title: 'Every lesson is done', text: 'Revisit your weakest topics and keep your cards clear.', href: '#/lessons', cta: 'Open lessons' };
}
function countUp() {
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  document.querySelectorAll('[data-n]').forEach(el => {
    const n = +el.dataset.n; if (reduce || !n) { el.textContent = n; return; }
    const t0 = performance.now();
    const f = t => { const p = Math.min(1, (t - t0) / 600); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
const dueAll = () => ready().reduce((n, c) => n + withCourse(c.id, dueNow), 0);
function home() {
  const f = focusId(), st = streak(), rd = ready();
  let top;
  if (!f) top = `<section class="coach"><p class="label">New week</p><p class="coach-line">Choose this week's focus course. Today's assignment will come from it.</p><div class="conf" id="fc">${rd.map(c => `<button class="seg" data-c="${c.id}">${esc(c.code)}</button>`).join('')}</div></section>`;
  else {
    const fc = COURSES.find(c => c.id === f), a = withCourse(f, assignment), msg = withCourse(f, coach);
    top = `<section class="coach"><p class="label">Your coach</p><p class="coach-line">${esc(msg)}</p></section>
    <a class="assign" href="${a.href}?c=${f}"><span class="label">Today's assignment · ${esc(fc.code)} · ${esc(a.label)}</span><h2>${esc(a.title)}</h2><p>${esc(a.text)}</p><span class="btn pri">${esc(a.cta)}${ICON('arrow')}</span></a>
    <p style="margin:14px 0 0"><a class="btn" href="#/exam?c=${f}">Take a mock exam</a>${rd.length > 1 ? '<button class="btn" id="cf">Change focus course</button>' : ''}</p>`;
  }
  app.innerHTML = top + `<h2 class="sec-h">Courses</h2><div class="grid courses">${COURSES.map(c => DATA[c.id] ? withCourse(c.id, () => {
      const done = L.filter(l => S.done[l.id]).length;
      return `<a class="card cc" href="#/lessons?c=${c.id}">${ring(done / (D.course.planned || L.length), 56)}<div><b>${esc(c.code)}</b><span class="mut">${esc(c.title)}</span><span class="mut">${done} of ${D.course.planned || L.length} lessons</span></div></a>`; })
    : `<div class="card cc soon"><div><b>${esc(c.code)}</b><span class="mut">${esc(c.title)}</span><span class="mut">${c.units} units · coming soon</span></div></div>`).join('')}</div>
  <h2 class="sec-h">This week</h2><div class="grid"><div class="card stat"><span class="fl ${st ? 'on' : ''}">${ICON('flame')}</span><b data-n="${st}">0</b>day streak</div>
  <div class="card stat"><b data-n="${weekDays()}">0</b>of ${TARGET} study days</div>
  <a class="card stat" href="#/cards${f ? '?c=' + f : ''}"><b data-n="${dueAll()}">0</b>cards due</a></div>`;
  $('#fc')?.addEventListener('click', e => { const c = e.target.dataset.c; if (c) { G.focus = c; G.focusWk = wkKey(); saveQuiet(); home(); } });
  $('#cf')?.addEventListener('click', () => { G.focusWk = null; saveQuiet(); home(); });
  fillRings(); countUp();
}
function lessons() {
  app.innerHTML = `<p class="label">${esc(D.course.code)} · ${esc(D.course.title)}</p><h1>Lessons</h1>` + '<a class="card" href="#/exam"><b>Mock exam</b><br><span class="mut">Timed paper: 20 multiple-choice and 5 theory questions.</span></a>' + (D.past?.length ? '<a class="card" href="#/past"><b>Past test questions</b><br><span class="mut">' + D.past.length + ' questions with solutions.</span></a>' : '') + D.modules.map(m => `<h2>${esc(m.title)}</h2>` + m.lessons.map(l =>
    `<a class="card" href="#/lesson/${l.id}">${S.done[l.id] ? ICON('check') + ' ' : ''}${l.id} · ${esc(l.title)}${S.quiz[l.id] ? `<br><span class="mut">Quiz: ${S.quiz[l.id].score}/${S.quiz[l.id].total}</span>` : ''}</a>`).join('')).join('');
}
let lc = null;
function lessonView(id, start) {
  const l = lesson(id); if (!l) return home();
  const vids = l.videos.filter(x => x.id || x.playlist), chunks = [];
  for (let k = 0; k < l.exam.length; k += 3) chunks.push(l.exam.slice(k, k + 3));
  const li = L.findIndex(x => x.id === id), next = L[li + 1];
  const words = (l.exam.join(' ') + l.analogy + l.one_line).split(/\s+/).length;
  const mins = Math.max(4, Math.round(words / 150 + l.quiz.length * 0.7 + vids.length * 5));
  const secs = [
    { t: 'Orient', h: () => `<p class="label">Lesson ${esc(l.id)} · Slides ${esc(l.slides)}</p><h1>${esc(l.title)}</h1><p class="tip">${esc(l.one_line)}</p><p class="mut">${secs.length} screens, about ${mins} minutes.</p>` },
    { t: 'Recall', h: () => `<p class="label">Before you read</p>${l.recall.map(r => `<p class="big">${esc(r)}</p>`).join('')}<p class="mut">Answer in your head first. Then continue.</p>` },
    { t: 'Picture it', h: () => `<p class="label">Picture it</p><p class="big">${esc(l.analogy)}</p>` },
    ...(l.figure && FIG[l.figure] ? [{ t: 'Diagram', h: () => FIG[l.figure].html(), after: r => FIG[l.figure].init(r) }] : []),
    ...chunks.map((c, k) => ({ t: chunks.length > 1 ? `The core, part ${k + 1}` : 'The core', h: () => `<p class="label">The core${chunks.length > 1 ? `, ${k + 1} of ${chunks.length}` : ''}</p><ul class="core">${c.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` })),
    ...(l.examples || []).map((ex, k) => ({ t: 'Example ' + (k + 1), h: () => `<p class="label">Worked example ${k + 1} of ${l.examples.length}</p><h2 class="qq" style="margin-top:0">${esc(ex.title)}</h2><p>${esc(ex.problem)}</p><ol class="steps">${ex.steps.map(x => stepHTML(x).replace('<li class="step">', '<li class="step" hidden>')).join('')}</ol><p><button class="btn pri" id="sn">Show step 1</button><button class="btn" id="sa">Show all</button></p><div id="sfin" hidden><div class="fbk good"><p class="label">Answer</p><p>${esc(ex.answer)}</p></div></div>`, after: wireSteps })),
    { t: 'Terms', h: () => `<p class="label">Key terms</p><p class="mut">Tap a term.</p><div>${l.terms.map(t => `<button class="chip" data-t="${t}">${esc(D.glossary[t].term)}</button>`).join('')}</div><div id="def"></div>` },
    { t: 'Watch', h: () => `<p class="label">Watch</p>${!navigator.onLine ? '<div class="card">Videos need a connection. Reconnect to watch.</div>' : vids.length ? vids.map((v, k) => `${vids.length > 1 ? `<p class="mut vlab">Video ${k + 1} of ${vids.length}</p>` : ''}<div class="vwrap"><div class="sk"></div><iframe class="vid" onload="this.parentNode.classList.add('ready')" loading="lazy" allowfullscreen title="Lesson video ${k + 1}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${v.playlist ? 'videoseries?list=' + v.playlist + '&rel=0' : v.id + '?rel=0' + (v.start ? '&start=' + v.start : '') + (v.end ? '&end=' + v.end : '')}"></iframe></div>`).join('') : `<div class="card">No video for this lesson yet. <a target="_blank" rel="noopener" href="${l.videos[0]?.search_fallback || '#'}">Search YouTube</a></div>`}` },
    { t: 'Check', h: () => `<p class="label">Check</p><h2 style="margin-top:0">Test yourself</h2><p>${l.quiz.length} questions. Rate your confidence before each answer.</p>${S.quiz[id] ? `<p class="mut">Last score: ${S.quiz[id].score} of ${S.quiz[id].total}</p>` : ''}<button class="btn pri" id="qs">${S.quiz[id] ? 'Retake quiz' : 'Start quiz'}</button><a class="btn" href="#/theory/${id}">Theory practice (${l.theory.length})</a>${l.practice?.length ? `<a class="btn" href="#/practice/${id}">Practice problems (${l.practice.length})</a>` : ''}` },
    { t: 'Close', h: () => `<p class="label">Lesson ${esc(l.id)}</p><h2 style="margin-top:0">${esc(l.title)}</h2><p class="tip">${esc(l.one_line)}</p>${S.quiz[id] ? `<p class="mut">Quiz: ${S.quiz[id].score} of ${S.quiz[id].total}</p>` : '<p class="mut">You have not taken the quiz yet.</p>'}<button class="btn ${S.done[id] ? '' : 'pri'}" id="dn">${S.done[id] ? ICON('check') + 'Completed. Undo' : 'Mark complete'}</button><a class="btn" href="#/cards/${id}">Flashcards</a>${next ? `<a class="btn" href="#/lesson/${next.id}/0">Next: ${esc(next.title)}</a>` : ''}` }
  ];
  let i = Math.min(Math.max(start != null && start !== '' ? +start || 0 : S.pos?.[id] || 0, 0), secs.length - 1), busy = false, tx = 0, ty = 0;
  const rev = ICON('arrow').replace('class="ic"', 'class="ic rev"');
  app.innerHTML = `<div class="lv"><div class="bar" role="progressbar" aria-label="Lesson progress" aria-valuemin="1" aria-valuemax="${secs.length}"><i></i></div>
    <div class="stage" id="stg"></div>
    <div class="ctl"><button class="btn" id="bk">${rev}<span>Back</span></button><button class="btn sec" id="sl" aria-expanded="false">${ICON('list')}<span>Sections</span></button><button class="btn pri" id="nx"><span>Next</span>${ICON('arrow')}</button></div>
    <aside class="secs" id="sp" aria-label="Lesson sections"><p class="label">Sections</p>${secs.map((x, k) => `<button data-i="${k}"><b>${k + 1}</b>${esc(x.t)}</button>`).join('')}</aside></div>`;
  const stg = $('#stg'), sp = $('#sp');
  const upd = () => {
    app.querySelector('.bar i').style.width = ((i + 1) / secs.length * 100) + '%';
    app.querySelector('.bar').setAttribute('aria-valuenow', i + 1);
    $('#bk').disabled = i === 0; $('#nx').disabled = i === secs.length - 1;
    sp.querySelectorAll('button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('seen', k < i); });
    if ((S.pos ||= {})[id] !== i) { S.pos[id] = i; save(); }
    history.replaceState(null, '', `#/lesson/${id}/${i}`);
  };
  const show = cls => { qh = null; stg.innerHTML = `<section class="scr ${cls}">${secs[i].h()}</section>`; upd(); scrollTo(0, 0); secs[i].after?.(stg.firstElementChild); };
  const go = n => {
    if (busy || n < 0 || n >= secs.length || n === i) return;
    const d = n > i ? 1 : -1, old = stg.firstElementChild; i = n; busy = true;
    const swap = () => { show(d > 0 ? 'in-n' : 'in-p'); busy = false; };
    if (old && !matchMedia('(prefers-reduced-motion:reduce)').matches) { old.classList.add(d > 0 ? 'out-n' : 'out-p'); setTimeout(swap, 160); } else swap();
  };
  const closeS = () => { sp.classList.remove('open'); $('#sl').setAttribute('aria-expanded', 'false'); };
  $('#bk').onclick = () => go(i - 1); $('#nx').onclick = () => go(i + 1);
  $('#sl').onclick = () => { const o = sp.classList.toggle('open'); $('#sl').setAttribute('aria-expanded', o); };
  sp.onclick = e => { const b = e.target.closest('[data-i]'); if (b) { closeS(); go(+b.dataset.i); } };
  stg.onclick = e => {
    const t = e.target.closest('[data-t]');
    if (t) { const g = D.glossary[t.dataset.t]; stg.querySelector('#def').innerHTML = `<div class="defn"><b>${esc(g.term)}</b><p>${esc(g.plain)}</p><p class="mut"><span class="label">Exam</span> ${esc(g.exam)}</p></div>`; }
    if (e.target.closest('#qs')) quiz(id, stg.firstElementChild, () => go(i + 1));
    if (e.target.closest('#dn')) { S.done[id] = !S.done[id]; save(); show('in-n'); if (S.done[id]) stg.firstElementChild.classList.add('pop'); }
  };
  stg.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stg.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(i + (dx < 0 ? 1 : -1)); }, { passive: true });
  lc = { next: () => go(i + 1), prev: () => go(i - 1), close: closeS };
  show('in-n');
}
addEventListener('keydown', e => { if (qh && ov.hidden && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { if (e.key === ' ') e.preventDefault(); qh(e.key); return; }
  if (!lc || qh || !ov.hidden || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') lc.next(); else if (e.key === 'ArrowLeft') lc.prev(); else if (e.key === 'Escape') lc.close();
});
let qh = null;
function quiz(id, host = app, onDone) {
  const l = lesson(id), AZ = ['A', 'B', 'C', 'D'], missed = []; let i = 0, score = 0, conf = 'sure';
  const finish = () => {
    qh = null; const tot = l.quiz.length;
    S.quiz[id] = { score, total: tot, ts: Date.now() }; if (score === tot) S.weak[id] = 0; save();
    const msg = score === tot ? 'Clean sheet. Move on.' : score * 2 >= tot ? `${tot - score} missed. Read the answers below, then retry.` : 'This topic is not secure yet. Go back through the core, then retry.';
    host.innerHTML = `<div class="qz"><p class="label">Result</p><h2 class="qscore pop"><span>${score}</span> of ${tot}</h2><p class="coachish">${msg}</p>
      ${missed.length ? `<h3>Review these</h3>${missed.map(m => `<div class="card"><p class="label">${esc(m.q)}</p><p><b>${esc(m.a)}</b></p><p class="mut">${esc(m.e)}</p></div>`).join('')}` : ''}
      <div>${onDone ? '<button class="btn pri" id="qd">Continue</button><button class="btn" id="qr">Retry</button>' : `<a class="btn pri" href="#/lesson/${id}/99">Back to lesson</a><a class="btn" href="#/quiz/${id}">Retry</a>`}</div></div>`;
    if (onDone) { host.querySelector('#qd').onclick = onDone; host.querySelector('#qr').onclick = () => quiz(id, host, onDone); }
    scrollTo(0, 0);
  };
  const show = () => {
    qh = null; if (i >= l.quiz.length) return finish();
    const q = l.quiz[i], last = i + 1 === l.quiz.length; let answered = false;
    host.innerHTML = `<div class="qz in-n"><div class="qseg" aria-hidden="true">${l.quiz.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')}</div>
      <p class="label">Question ${i + 1} of ${l.quiz.length}</p><h2 class="qq">${esc(q.q)}</h2>
      <div class="conf" role="group" aria-label="How sure are you?"><span class="label">How sure are you?</span>${['sure', 'guess', 'no idea'].map(c => `<button class="seg ${c === conf ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      <div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><b>${AZ[k]}</b><span>${esc(o)}</span></button>`).join('')}</div><div id="fb"></div></div>`;
    host.querySelector('.conf').onclick = e => { const c = e.target.dataset.c; if (c && !answered) { conf = c; host.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b.dataset.c === c)); } };
    const next = () => { i++; show(); };
    const pick = k => {
      if (answered || k < 0 || k >= q.options.length) return; answered = true;
      const ok = k === q.answer; if (ok) score++; else { S.weak[id] = (S.weak[id] || 0) + (conf === 'sure' ? 2 : 1); missed.push({ q: q.q, a: q.options[q.answer], e: q.explain }); }
      host.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add('right'); else if (j === k) x.classList.add('wrong'); });
      host.querySelector('#fb').innerHTML = `<div class="fbk ${ok ? 'good' : 'bad'}"><p class="label">${ok ? 'Correct' : 'Not quite'}</p><p class="why">${esc(q.explain)}</p>${!ok && conf === 'sure' ? '<p class="warn">You were sure and wrong. Come back to this one.</p>' : ''}</div><button class="btn pri" id="nx">${last ? 'See result' : 'Next'}</button>`;
      host.querySelector('#nx').onclick = next; host.querySelector('#nx').focus({ preventScroll: true }); save();
    };
    host.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.k));
    qh = key => { const k = key.toLowerCase(); if (!answered) pick('abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k)); else if (k === 'enter') next(); };
  };
  show();
}
function cards(scope) {
  const q = dueCards(scope), tally = { 1: 0, 3: 0, 4: 0, 5: 0 }; let i = 0;
  const days = (c, g) => { if (g < 3) return 1; const st = S.cards[c.key] || { ef: 2.5, int: 0, reps: 0 }; return st.reps === 0 ? 1 : st.reps === 1 ? 6 : Math.round(st.int * st.ef); };
  const fmt = n => n === 1 ? '1 day' : n + ' days';
  const show = () => {
    qh = null;
    if (i >= q.length) {
      const again = tally[1];
      app.innerHTML = `<p class="label">Session complete</p><h1>${q.length ? `${q.length} card${q.length > 1 ? 's' : ''} reviewed` : 'Nothing due'}</h1><p class="coachish">${!q.length ? 'Finish a lesson to unlock its cards, or come back tomorrow.' : again ? `${again} came back as Again. They return tomorrow. Do not skip them.` : 'Clean session. Come back tomorrow.'}</p><a class="btn pri" href="#/">Home</a><a class="btn" href="#/lessons">Lessons</a>`;
      return;
    }
    const c = q[i];
    app.innerHTML = `<div class="bar2"><i style="width:${i / q.length * 100}%"></i></div><div class="in-n"><p class="label">Card ${i + 1} of ${q.length} · Lesson ${esc(c.lid)}</p>
      <button class="flip" id="fc" aria-label="Reveal answer"><span class="fi"><span class="ff"><small class="label">Question</small><span>${esc(c.front)}</span></span><span class="fb"><small class="label">Answer</small><span>${esc(c.back)}</span></span></span></button>
      <p class="mut hint" id="ht">Tap the card or press Space to reveal.</p>
      <div class="grades" id="gr" hidden>${[['Again', 1], ['Hard', 3], ['Good', 4], ['Easy', 5]].map(([n, g], k) => `<button class="btn" data-g="${g}"><b>${n}</b><small>${fmt(days(c, g))}</small></button>`).join('')}</div></div>`;
    let flipped = false;
    const flip = () => { if (flipped) return; flipped = true; $('#fc').classList.add('flipped'); $('#gr').hidden = false; $('#ht').hidden = true; };
    const grade = g => { if (!flipped || !tally[g] && tally[g] !== 0) return; sm2(c.key, g); tally[g]++; i++; show(); };
    $('#fc').onclick = flip; $('#gr').onclick = e => { const b = e.target.closest('[data-g]'); if (b) grade(+b.dataset.g); };
    qh = k => { if (k === ' ' || k === 'Enter') flip(); else if ('1234'.includes(k) && k) grade([1, 3, 4, 5]['1234'.indexOf(k)]); };
  };
  show();
}
// ---------- Answer checking (numbers, vectors, matrices) ----------
function num(str) {
  const t = String(str).toLowerCase().replace(/\s+/g, '').replace(/−|–/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt').replace(/π/g, 'pi'); let i = 0;
  const atom = () => {
    if (t[i] === '(') { i++; const v = expr(); if (t[i++] !== ')') throw 0; return v; }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(t.slice(i)); if (m) { i += m[0].length; return parseFloat(m[0]); }
    const f = /^(sqrt|abs|ln)\(/.exec(t.slice(i)); if (f) { i += f[0].length; const v = expr(); if (t[i++] !== ')') throw 0; return f[1] === 'sqrt' ? Math.sqrt(v) : f[1] === 'abs' ? Math.abs(v) : Math.log(v); }
    if (t.startsWith('pi', i)) { i += 2; return Math.PI; }
    if (t[i] === 'e') { i++; return Math.E; }
    throw 0;
  };
  const pow = () => { const b = atom(); if (t[i] === '^') { i++; return Math.pow(b, unary()); } return b; };
  const unary = () => { if (t[i] === '-') { i++; return -unary(); } if (t[i] === '+') { i++; return unary(); } return pow(); };
  const term = () => { let v = unary(); for (;;) { const c = t[i]; if (c === '*' || c === '/') { i++; const r = unary(); v = c === '*' ? v * r : v / r; } else if (c && /[a-z(0-9.]/.test(c)) v *= unary(); else return v; } };
  const expr = () => { let v = term(); while (t[i] === '+' || t[i] === '-') { const o = t[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; };
  try { const v = expr(); return i === t.length && isFinite(v) ? v : NaN; } catch { return NaN; }
}
function vec(str) {
  let s = String(str).trim().replace(/−|–/g, '-').replace(/π|pi/gi, '(3.141592653589793)').replace(/a_?([xyz])/gi, (m, c) => ({ x: 'i', y: 'j', z: 'k' })[c.toLowerCase()]);
  if (/[ijk]/i.test(s)) {
    const out = [0, 0, 0], terms = []; let depth = 0, cur = '';
    for (const c of s) { if (c === '(') depth++; if (c === ')') depth--; if ((c === '+' || c === '-') && depth === 0 && cur.trim() && !/[*\/^(+\-]$/.test(cur.trim())) { terms.push(cur); cur = ''; } cur += c; }
    terms.push(cur);
    for (let t of terms) {
      t = t.replace(/\s+/g, ''); const m = /([ijk])$/i.exec(t); if (!m) return null;
      const co = t.slice(0, -1), v = co === '' || co === '+' ? 1 : co === '-' ? -1 : num(co); if (isNaN(v)) return null;
      out['ijk'.indexOf(m[1].toLowerCase())] += v;
    }
    return out;
  }
  s = s.replace(/^[(<\[]|[)>\]]$/g, ''); const parts = []; let d = 0, cur = '';
  for (const c of s) { if (c === '(') d++; if (c === ')') d--; if (c === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += c; }
  parts.push(cur); const v = parts.map(num); return v.some(isNaN) ? null : v;
}
function mat(str) {
  const rows = String(str).trim().replace(/−|–/g, '-').split(/;|\n/).map(r => r.trim().replace(/\s*([\/*^])\s*/g, '$1')).filter(Boolean).map(r => r.replace(/^[\[(]|[\])]$/g, '').split(/[,\s]+/).filter(Boolean).map(num));
  return !rows.length || rows.some(r => !r.length || r.some(isNaN) || r.length !== rows[0].length) ? null : rows;
}
const FMT = { number: 'A number or fraction, for example -4, 3/4 or 2sqrt(3).', vector: 'Components, for example 3i - 2j + 5k, or 3, -2, 5.', direction: 'Any multiple of the vector works, for example 1, 0, -1.', matrix: 'Rows separated by a semicolon, for example 1 2; 3 4.', set: 'Separate the values with commas, for example -1, 1, 2.', text: 'Type your answer.' };
function checkAns(p, raw) {
  raw = String(raw).trim(); if (!raw) return { err: 'Type an answer first.' };
  const bad = { err: 'I could not read that. ' + FMT[p.type] }, near = (a, b) => Math.abs(a - b) <= Math.max(p.tol ?? 0.0051, 0.005 * Math.abs(b));
  if (p.type === 'number') { const v = num(raw); return isNaN(v) ? bad : { ok: near(v, p.answer) }; }
  if (p.type === 'vector' || p.type === 'direction') {
    const v = vec(raw), a = p.answer; if (!v) return bad; if (v.length !== a.length) return { err: `Give ${a.length} components.` };
    if (p.type === 'vector') return { ok: v.every((x, k) => near(x, a[k])) };
    const dot = v.reduce((t, x, k) => t + x * a[k], 0), nv = Math.hypot(...v), na = Math.hypot(...a); return { ok: nv > 1e-9 && Math.abs(Math.abs(dot) - nv * na) < 1e-3 * nv * na };
  }
  if (p.type === 'matrix') {
    const M = mat(raw), A = p.answer; if (!M) return bad;
    if (M.length !== A.length || M.some((r, i) => r.length !== A[i].length)) return { err: `The answer has ${A.length} row${A.length > 1 ? 's' : ''} and ${A[0].length} column${A[0].length > 1 ? 's' : ''}. Check the order.` };
    return { ok: M.every((r, i) => r.every((x, j) => near(x, A[i][j]))) };
  }
  if (p.type === 'set') {
    const v = raw.split(/[,;\s]+|and/).filter(Boolean).map(num); if (v.some(isNaN)) return bad;
    const a = [...p.answer].sort((x, y) => x - y), b = v.sort((x, y) => x - y); if (a.length !== b.length) return { err: `Give ${a.length} values (repeat a repeated value).` };
    return { ok: a.every((x, k) => near(b[k], x)) };
  }
  const n = x => String(x).toLowerCase().replace(/\s+/g, '').replace(/[×*]|by/g, 'x');
  return { ok: [p.answer, ...(p.alt || [])].some(a => n(a) === n(raw)) };
}
const stepHTML = s => { s = typeof s === 'string' ? { do: s } : s; return `<li class="step"><b>${esc(s.do)}</b>${s.why ? `<span class="mut">${esc(s.why)}</span>` : ''}${s.m ? `<div class="smath">${esc('$$' + s.m + '$$')}</div>` : ''}</li>`; };
function wireSteps(root) {
  const items = [...root.querySelectorAll('.step')], n = items.length, btn = root.querySelector('#sn'), fin = root.querySelector('#sfin'); let k = 0;
  const label = () => { btn.textContent = k < n ? `Show step ${k + 1} of ${n}` : 'All steps shown'; btn.disabled = k >= n; };
  const next = () => { if (k < n) { items[k].hidden = false; items[k].classList.add('in-n'); k++; } if (k >= n) fin.hidden = false; label(); };
  btn.onclick = next; root.querySelector('#sa').onclick = () => { while (k < n) next(); }; label();
}
function practiceRun(title, probs, key, wid) {
  if (!probs.length) { app.innerHTML = `<h1>${esc(title)}</h1><p class="mut">No problems here yet.</p><a class="btn" href="#/lessons">Lessons</a>`; return; }
  S.practice ||= {}; const rec = S.practice[key] ||= {}; let i = 0, first = 0;
  const back = wid ? `#/lesson/${wid}/99` : '#/lessons';
  const show = () => {
    if (i >= probs.length) {
      app.innerHTML = `<p class="label">${esc(title)}</p><h2 class="qscore pop"><span>${first}</span> of ${probs.length}</h2><p class="coachish">${first === probs.length ? 'Clean sheet, first attempt on every problem.' : first * 2 >= probs.length ? 'Decent. Redo the ones you needed help with.' : 'Not secure yet. Study the worked examples, then retry.'}</p><a class="btn pri" href="${back}">Back</a><a class="btn" href="#/${wid ? 'practice/' + wid : 'past'}">Retry</a>`; return;
    }
    const p = probs[i]; let tries = 0, fin = false;
    app.innerHTML = `<div class="qz in-n"><div class="qseg" aria-hidden="true">${probs.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')}</div>
      <p class="label">${esc(title)} · ${i + 1} of ${probs.length}</p><h2 class="qq">${esc(p.q)}</h2>
      ${p.type === 'matrix' ? '<textarea class="f" id="pa" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>' : '<input class="f" id="pa" autocomplete="off" autocapitalize="off" spellcheck="false">'}
      <p class="mut" style="font-size:14px">${esc(FMT[p.type])}</p>
      <div><button class="btn pri" id="ck">Check</button>${p.hint ? '<button class="btn" id="hn">Hint</button>' : ''}<button class="btn" id="sl">Show solution</button></div><div id="fb"></div></div>`;
    const fb = $('#fb'), nextBtn = () => { fb.insertAdjacentHTML('beforeend', `<button class="btn pri" id="nx">${i + 1 < probs.length ? 'Next problem' : 'See result'}</button>`); $('#nx').onclick = () => { i++; show(); }; };
    const sol = () => { if (fin) return; fin = true; $('#ck').disabled = true; fb.insertAdjacentHTML('beforeend', `<div class="fbk good"><p class="label">Solution</p><ol class="steps">${(p.solution || []).map(stepHTML).join('')}</ol>${p.answerText ? `<p><b>Answer:</b> ${esc(p.answerText)}</p>` : ''}</div>`); nextBtn(); };
    $('#pa').addEventListener('keydown', e => { if (e.key === 'Enter' && p.type !== 'matrix') $('#ck').click(); });
    if (p.hint) $('#hn').onclick = () => fb.insertAdjacentHTML('afterbegin', `<div class="tip">${esc(p.hint)}</div>`);
    $('#sl').onclick = () => { if (!rec[i]) rec[i] = { ok: false, tries }; save(); sol(); };
    $('#ck').onclick = () => {
      if (fin) return; const r = checkAns(p, $('#pa').value);
      if (r.err) { fb.querySelector('.err')?.remove(); fb.insertAdjacentHTML('afterbegin', `<p class="err mut">${esc(r.err)}</p>`); return; }
      tries++; fb.querySelector('.err')?.remove();
      if (r.ok) { fin = true; $('#ck').disabled = true; $('#pa').readOnly = true; if (tries === 1) first++; rec[i] = { ok: true, tries }; save(); fb.insertAdjacentHTML('beforeend', `<div class="fbk good"><p class="label">Correct</p>${tries > 1 ? `<p>Got it on attempt ${tries}.</p>` : ''}</div>`); nextBtn(); }
      else { if (tries === 1 && wid) { S.weak[wid] = (S.weak[wid] || 0) + 1; save(); } fb.insertAdjacentHTML('afterbegin', `<p class="err mut"><b>Not quite.</b> Check signs and each entry, then try again.${tries >= 2 && p.hint ? ' Use the hint.' : ''}</p>`); }
    };
  };
  show();
}
const markOf = (q, cov) => Math.round(Math.min(cov, q.need) / q.need * q.marks * 2) / 2;
const checklist = q => `<p class="label">${q.need < q.points.length ? `Key points. Any ${q.need} earn full marks.` : 'Key points.'} Tick what your answer covered.</p>${q.points.map(p => `<label class="ck"><input type="checkbox"><span>${esc(p)}</span></label>`).join('')}`;
function theory(id) {
  const l = lesson(id), Q = l.theory; let i = 0, total = 0, max = 0; S.theory ||= {}; S.theory[id] ||= {};
  const show = () => {
    if (i >= Q.length) {
      const pc = max ? total / max : 0;
      app.innerHTML = `<p class="label">Theory result</p><h2 class="qscore pop"><span>${total}</span> of ${max}</h2><p class="coachish">${pc >= .8 ? 'Strong. Your answers match the marking points.' : pc >= .5 ? 'Half the points are missing. Re-read the exam bullets, then try again.' : 'You are not ready on this topic. Go back through the core, then retry.'}</p><a class="btn pri" href="#/lesson/${id}/99">Back to lesson</a><a class="btn" href="#/theory/${id}">Retry</a>`;
      return;
    }
    const q = Q[i];
    app.innerHTML = `<div class="qz in-n"><div class="qseg" aria-hidden="true">${Q.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')}</div>
      <p class="label">${esc(q.type)} · ${q.marks} marks · ${i + 1} of ${Q.length}</p><h2 class="qq">${esc(q.q)}</h2>
      <textarea class="f ans" id="ans" rows="6" placeholder="Write your answer as you would in the exam, then reveal the key points."></textarea>
      <button class="btn pri" id="rv">Reveal key points</button><div id="mk"></div></div>`;
    $('#rv').onclick = e => {
      $('#ans').readOnly = true; e.currentTarget.hidden = true;
      $('#mk').innerHTML = `<div class="fbk good">${checklist(q)}</div><button class="btn pri" id="sc">Score this answer</button>`;
      $('#sc').onclick = ev => {
        const got = markOf(q, app.querySelectorAll('.ck input:checked').length), pc = got / q.marks;
        total += got; max += q.marks; S.theory[id][i] = { got, of: q.marks, ts: Date.now() };
        if (pc < 0.6) S.weak[id] = (S.weak[id] || 0) + (pc < 0.3 ? 2 : 1); save();
        ev.currentTarget.hidden = true; app.querySelectorAll('.ck input').forEach(c => c.disabled = true);
        $('#mk').insertAdjacentHTML('beforeend', `<p class="coachish" style="font-size:20px">${got} of ${q.marks} marks.${pc < 0.6 ? ' Not secure. This topic is on your weak list.' : ''}</p><button class="btn pri" id="nx">${i + 1 < Q.length ? 'Next question' : 'See result'}</button>`);
        $('#nx').onclick = () => { i++; show(); }; $('#nx').focus({ preventScroll: true });
      };
    };
  };
  show();
}
let exTimer;
const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function exam() {
  const mods = [['all', 'Whole course', L], ...D.modules.map((m, i) => ['m' + i, m.title, m.lessons])];
  let scope = 'all', mins = 60;
  const past = (S.exams || []).slice(-3).reverse().map(e => `<p class="mut">${new Date(e.ts).toLocaleDateString()} · ${e.got} of ${e.max} (${Math.round(e.got / e.max * 100)}%)</p>`).join('');
  app.innerHTML = `<p class="label">Mock exam</p><h1>Sit a timed paper</h1><p class="mut">20 multiple-choice questions, then 5 theory questions. Multiple choice is marked automatically and you mark the theory against the key points. Leaving this page abandons the paper.</p>
    <p class="label">Scope</p><div class="conf" id="sc">${mods.map(([k, n]) => `<button class="seg ${k === scope ? 'on' : ''}" data-v="${k}">${n}</button>`).join('')}</div>
    <p class="label">Time</p><div class="conf" id="tm">${[45, 60, 90].map(m => `<button class="seg ${m === mins ? 'on' : ''}" data-v="${m}">${m} minutes</button>`).join('')}</div>
    ${past ? `<p class="label" style="margin-top:20px">Previous papers</p>${past}` : ''}<p><button class="btn pri" id="go">Start the paper</button></p>`;
  const pick = (id, set) => $(id).onclick = e => { const v = e.target.dataset.v; if (v) { set(v); $(id).querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b.dataset.v === v)); } };
  pick('#sc', v => scope = v); pick('#tm', v => mins = +v);
  $('#go').onclick = () => {
    const pool = mods.find(m => m[0] === scope)[2];
    const items = [...shuf(pool.flatMap(l => l.quiz.map(q => ({ k: 'mcq', l, q, pick: null })))).slice(0, 20),
      ...shuf(pool.filter(l => l.theory?.length)).slice(0, 5).map(l => ({ k: 'th', l, q: l.theory[Math.floor(Math.random() * l.theory.length)], text: '' }))];
    const end = Date.now() + mins * 60000; let n = 0;
    const tick = () => { const left = Math.max(0, end - Date.now()), el = $('#tl'); if (el) { el.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`; el.classList.toggle('low', left < 300000); } if (!left) toMark(true); };
    const dot = k => { const x = items[k]; return (x.k === 'mcq' ? x.pick !== null : x.text.trim()) ? 'ans' : ''; };
    const run = () => {
      const it = items[n];
      app.innerHTML = `<div class="exh"><span class="label">${it.k === 'mcq' ? 'Section A · Multiple choice' : 'Section B · Theory'}</span><span class="tmr" id="tl" role="timer">--:--</span></div>
        <div class="pal" aria-label="Question palette">${items.map((_, k) => `<button class="pb ${k === n ? 'cur' : ''} ${dot(k)}" data-n="${k}">${k + 1}</button>`).join('')}</div>
        <div class="qz"><p class="label">Question ${n + 1} of ${items.length}${it.k === 'th' ? ` · ${it.q.marks} marks` : ''}</p><h2 class="qq">${esc(it.q.q)}</h2>
        ${it.k === 'mcq' ? `<div class="opts">${it.q.options.map((o, k) => `<button class="opt ${it.pick === k ? 'sel' : ''}" data-k="${k}"><b>${'ABCD'[k]}</b><span>${esc(o)}</span></button>`).join('')}</div>` : `<textarea class="f ans" id="ans" rows="9" placeholder="Write your answer.">${esc(it.text)}</textarea>`}
        <div><button class="btn" id="pv" ${n === 0 ? 'disabled' : ''}>Previous</button>${n + 1 < items.length ? '<button class="btn pri" id="nx">Next</button>' : '<button class="btn pri" id="fin">Finish and mark</button>'}</div></div>`;
      tick();
      const mark = () => app.querySelector(`.pb[data-n="${n}"]`).classList.toggle('ans', !!dot(n));
      app.querySelector('.pal').onclick = e => { const k = e.target.dataset.n; if (k != null) { n = +k; run(); } };
      if (it.k === 'mcq') app.querySelector('.opts').onclick = e => { const b = e.target.closest('.opt'); if (b) { it.pick = +b.dataset.k; app.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', o === b)); mark(); } };
      else $('#ans').oninput = e => { it.text = e.target.value; mark(); };
      $('#pv').onclick = () => { n--; run(); };
      if ($('#nx')) $('#nx').onclick = () => { n++; run(); }; else $('#fin').onclick = () => toMark(false);
      scrollTo(0, 0);
    };
    const toMark = up => {
      clearInterval(exTimer); const ths = items.filter(x => x.k === 'th');
      app.innerHTML = `<p class="label">${up ? 'Time is up' : 'Marking'}</p><h1>Mark your theory answers</h1><p class="mut">Compare each answer with the key points and tick what you covered. Multiple choice is marked for you.</p>
        ${ths.map((x, k) => `<div class="card" data-t="${k}"><p class="label">Lesson ${esc(x.l.id)} · ${x.q.marks} marks</p><h3>${esc(x.q.q)}</h3><p class="mut ans-read">${x.text.trim() ? esc(x.text) : 'No answer written.'}</p>${checklist(x.q)}</div>`).join('')}
        <button class="btn pri" id="rs">Get my result</button>`;
      scrollTo(0, 0); $('#rs').onclick = () => result(ths);
    };
    const result = ths => {
      const by = {}, miss = []; let got = 0, max = 0;
      const add = (id, g, m) => { (by[id] ||= [0, 0]); by[id][0] += g; by[id][1] += m; got += g; max += m; };
      items.filter(x => x.k === 'mcq').forEach(x => { const ok = x.pick === x.q.answer; add(x.l.id, +ok, 1); if (!ok) { miss.push(x); S.weak[x.l.id] = (S.weak[x.l.id] || 0) + 1; } });
      ths.forEach((x, k) => { const g = markOf(x.q, app.querySelectorAll(`.card[data-t="${k}"] .ck input:checked`).length); add(x.l.id, g, x.q.marks); if (g / x.q.marks < 0.6) S.weak[x.l.id] = (S.weak[x.l.id] || 0) + 1; });
      S.exams = [...(S.exams || []), { ts: Date.now(), scope, got, max }].slice(-10); save();
      const pc = Math.round(got / max * 100);
      app.innerHTML = `<p class="label">Result</p><h1 class="qscore pop"><span>${got}</span> of ${max}</h1><p class="coachish">${pc >= 70 ? 'Solid. Fix the weak lessons below before the real paper.' : pc >= 50 ? 'Not there yet. Work the weakest lessons first.' : 'This is a warning, not a verdict. Go back through the lessons and sit it again.'}</p>
        <h2>By lesson, weakest first</h2>${Object.entries(by).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([id, [g, m]]) => `<a class="card rr" href="#/lesson/${id}"><span>${esc(id)} · ${esc(lesson(id).title)}</span><b>${g} of ${m}</b></a>`).join('')}
        ${miss.length ? `<h2>Multiple choice you missed</h2>${miss.slice(0, 10).map(x => `<div class="card"><p class="label">${esc(x.l.id)}</p><p><b>${esc(x.q.q)}</b></p><p>${esc(x.q.options[x.q.answer])}</p><p class="mut">${esc(x.q.explain)}</p></div>`).join('')}` : ''}
        <a class="btn pri" href="#/">Home</a><a class="btn" href="#/exam">Sit another paper</a>`;
      scrollTo(0, 0);
    };
    exTimer = setInterval(tick, 1000); run();
  };
}
function sm2(key, q) {
  const c = S.cards[key] || { ef: 2.5, int: 0, reps: 0 };
  if (q < 3) { c.reps = 0; c.int = 1; } else { c.int = c.reps === 0 ? 1 : c.reps === 1 ? 6 : Math.round(c.int * c.ef); c.reps++; }
  c.ef = Math.max(1.3, c.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)); c.due = day(c.int); S.cards[key] = c; save();
}
function glossary(hash) {
  const pre = decodeURIComponent(hash || '');
  app.innerHTML = `<h1>Glossary</h1><input class="f" id="gq" placeholder="Filter terms" value="${esc(pre)}"><div id="gl"></div>`;
  const draw = () => { const q = $('#gq').value.toLowerCase(); $('#gl').innerHTML = Object.values(D.glossary).filter(g => (g.term + g.plain).toLowerCase().includes(q)).sort((a, b) => a.term.localeCompare(b.term))
    .map(g => `<div class="card"><b>${esc(g.term)}</b><p>${esc(g.plain)}</p><p class="mut"><b>Exam:</b> ${esc(g.exam)}</p></div>`).join(''); };
  $('#gq').oninput = draw; draw();
}
function account() {
  app.innerHTML = `<h1>Account</h1>` + (!sb ? '<p>Add your Supabase keys in config.js to enable sync.</p>' : user ? `<p>Signed in as <b>${esc(user.email)}</b>. Progress syncs across devices.</p><button class="btn" id="so">Sign out</button>`
    : `<p>Sign in to sync progress across devices.</p><input class="f" id="em" type="email" placeholder="you@email.com"><button class="btn pri" id="ml">Email me a magic link</button><p id="ms" class="mut"></p>`)
    + `<h2>Offline and install</h2><p class="mut">${navigator.serviceWorker?.controller ? 'Lessons, quizzes and cards work without a connection.' : 'Offline mode switches on after your first full load.'}</p>${dip ? '<button class="btn pri" id="ia">Install app</button>' : '<p class="mut">iPhone: tap Share, then Add to Home Screen. Android Chrome: open the browser menu and choose Install app.</p>'}<h2>Backup</h2><button class="btn" id="ex">${ICON('download')}Export progress</button>`;
  $('#ia')?.addEventListener('click', async () => { dip.prompt(); await dip.userChoice; dip = null; account(); });
  $('#ex')?.addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(G)], { type: 'application/json' })); a.download = 'studyhub-progress.json'; a.click(); });
  $('#so')?.addEventListener('click', e => withLoad(e.currentTarget, 'Signing out', () => sb.auth.signOut()));
  $('#ml')?.addEventListener('click', e => withLoad(e.currentTarget, 'Sending', async () => { const { error } = await sb.auth.signInWithOtp({ email: $('#em').value, options: { emailRedirectTo: location.origin + location.pathname } }); $('#ms').textContent = error ? error.message : 'Check your email.'; }));
}

const picker = () => `<div class="cpick"><button class="cbtn" id="cpb" aria-expanded="false" aria-controls="cpl"><span><small class="label">Course</small><b>${esc(D.course.code)}</b></span>${ICON('list')}</button>
  <div class="clist" id="cpl" hidden>${COURSES.map(c => DATA[c.id] ? `<button data-c="${c.id}" class="${c.id === cur ? 'on' : ''}"><b>${esc(c.code)}</b><span>${esc(c.title)}</span></button>` : `<button disabled><b>${esc(c.code)}</b><span>${esc(c.title)} · coming soon</span></button>`).join('')}</div></div>`;
function wirePicker() {
  const b = $('#cpb'), l = $('#cpl');
  b.onclick = () => { l.hidden = !l.hidden; b.setAttribute('aria-expanded', !l.hidden); };
  l.onclick = e => { const x = e.target.closest('[data-c]'); if (!x) return; setCourse(x.dataset.c); saveQuiet(); const same = location.hash.split('?')[0] === '#/lessons'; location.hash = '#/lessons'; if (same) route(); };
}
function route() {
  if (!cur) return;
  const [h, qs] = (location.hash || '#/').split('?'), cm = /c=([\w-]+)/.exec(qs || '');
  if (cm && DATA[cm[1]] && cm[1] !== cur) { setCourse(cm[1]); saveQuiet(); }
  const [, r, a, b] = h.split('/');
  app.removeAttribute('aria-busy'); clearInterval(exTimer); lc = null; qh = null; document.body.classList.toggle('lesson', r === 'lesson'); bar(true);
  const base = '#/' + (r || '');
  $('#side').innerHTML = `<a class="sbrand" href="#/">StudyHub</a>` + picker() + navHTML(base); wirePicker(); $('#bottom').innerHTML = navHTML(base); setMenu(false);
  ({ '': home, lessons, lesson: () => lessonView(a, b), theory: () => theory(a), practice: () => practiceRun('Practice problems', lesson(a)?.practice || [], a, a), past: () => practiceRun('Past test questions', D.past || [], 'past', null), exam, quiz: () => quiz(a), cards: () => cards(a), glossary: () => glossary(a), account }[r || ''] || home)();
  scrollTo(0, 0); app.focus({ preventScroll: true }); setTimeout(() => bar(false), 200);
}
addEventListener('hashchange', route);
if (sb) sb.auth.onAuthStateChange((_, s) => { user = s?.user || null; if (user) pull(); else route(); });

function loadData() {
  return Promise.all([fetch('data/courses.json').then(r => { if (!r.ok) throw 0; return r.json(); }), fetch('data/coach.json').then(r => r.json()).catch(() => ({}))]).then(async ([cj, c]) => {
    C = c; COURSES = cj.courses;
    await Promise.all(COURSES.filter(x => x.file).map(x => fetch(x.file).then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => { DATA[x.id] = d; }).catch(() => {})));
    const first = COURSES.find(x => DATA[x.id]); if (!first) throw 0;
    if (Object.values(DATA).some(d => d.course.math)) await loadKatex();
    setCourse(DATA[G.cur] ? G.cur : first.id); route();
  }).catch(() => { app.innerHTML = '<div class="card"><h2 style="margin-top:0">Could not load your courses</h2><p class="mut">Check your connection, then try again.</p><button class="btn pri" id="rt">Try again</button></div>'; $('#rt').onclick = e => withLoad(e.currentTarget, 'Loading', loadData); });
}
loadData();

// PWA: install prompt, connectivity, updates
let dip = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; });
addEventListener('offline', () => setSync('offline'));
addEventListener('online', () => { setSync(''); push(); });
if (!navigator.onLine) setSync('offline');
function toast(msg, label, fn) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span><button class="btn pri">${esc(label)}</button>`;
  t.querySelector('button').onclick = e => { e.currentTarget.classList.add('loading'); e.currentTarget.innerHTML = '<i class="spin" aria-hidden="true"></i><span>Updating</span>'; fn(); };
  document.body.append(t);
}
if ('serviceWorker' in navigator) {
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had) { had = true; return; } location.reload(); });
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(reg => {
    const ready = w => { if (navigator.serviceWorker.controller) toast('A new version is ready.', 'Refresh', () => w.postMessage('SKIP_WAITING')); };
    if (reg.waiting) ready(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w.addEventListener('statechange', () => { if (w.state === 'installed') ready(w); }); });
  }).catch(() => {}));
}
